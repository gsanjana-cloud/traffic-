import asyncio
import time
from typing import List
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .core.database import init_db, load_persisted_settings
from .models.schemas import SimulationSettings
from .engine.simulation_engine import IntersectionSimulation
from .vision.detector import YOLOTrafficDetector
from .api.routes_simulation import create_simulation_router
from .api.routes_detection import create_detection_router
from .api.routes_analytics import create_analytics_router
from .api.routes_settings import create_settings_router

# Initialize database
init_db()

# Load saved settings or use defaults
persisted_s = load_persisted_settings()
initial_settings = SimulationSettings(**persisted_s) if persisted_s else SimulationSettings()

# Global engine and detector instances
sim_engine = IntersectionSimulation(settings=initial_settings)
detector = YOLOTrafficDetector()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

# Background simulation runner
async def simulation_loop():
    last_tick = time.time()
    broadcast_accumulator = 0.0

    while True:
        now = time.time()
        dt = now - last_tick
        last_tick = now

        if sim_engine.is_running:
            sim_engine.step(dt)

        # Broadcast update at ~10 Hz (every 100ms)
        broadcast_accumulator += dt
        if broadcast_accumulator >= 0.10:
            broadcast_accumulator = 0.0
            if len(ws_manager.active_connections) > 0:
                state_dict = sim_engine.get_state().dict()
                await ws_manager.broadcast({
                    "type": "SIMULATION_TICK",
                    "data": state_dict
                })

        await asyncio.sleep(0.05)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: spawn background simulation loop
    loop_task = asyncio.create_task(simulation_loop())
    yield
    # Shutdown
    loop_task.cancel()

app = FastAPI(
    title="AI-Based Automated Traffic Signal Control System",
    description="Explainable Computer-Vision Adaptive Traffic Signal Control Engineering Prototype",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health", tags=["System"])
def get_health():
    return {
        "status": "healthy",
        "yolo_loaded": detector.is_loaded,
        "yolo_model": detector.model_name,
        "is_running": sim_engine.is_running,
        "mode": sim_engine.mode.value,
        "scenario": sim_engine.scenario.value,
        "cycle_count": sim_engine.cycle_count,
        "total_vehicles_processed": sim_engine.total_vehicles_processed
    }

# Register API routers
app.include_router(create_simulation_router(sim_engine))
app.include_router(create_detection_router(detector, sim_engine))
app.include_router(create_analytics_router(sim_engine))
app.include_router(create_settings_router(sim_engine))

# WebSocket live traffic stream
@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Immediately send current state upon connect
    try:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": sim_engine.get_state().dict()
        })
        while True:
            # Keep socket alive and receive client commands
            data = await websocket.receive_text()
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
