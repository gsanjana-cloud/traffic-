# AI-Based Automated Traffic Signal Control System Using Computer Vision

> **Engineering College Project Prototype**  
> *Explainable Multi-Factor Adaptive Signal Allocation & YOLOv8 Computer Vision Perception*

---

## 1. Project Overview

Conventional municipal traffic signals operate on fixed-time cycle plans that cannot respond dynamically to fluctuating urban vehicle demand. This leads to empty green lights, unnecessary idling, elevated greenhouse emissions, and severe gridlock during directional peak surges.

This project delivers an interactive, explainable, and production-grade prototype web application that demonstrates **intelligent adaptive signal control**. The system combines:
1. **YOLOv8 Computer Vision Detection**: Detects and classifies **cars, buses, trucks, and motorcycles** from CCTV footage, video uploads, or live webcam feeds.
2. **Passenger Car Unit (PCU) Weighting**: Scales demand based on vehicle physical footprint (car = 1.0, bus = 2.5, truck = 2.2, motorcycle = 0.5).
3. **Queue & Delay Estimation**: Quantifies spatial queue lengths in meters and individual vehicle waiting times.
4. **Explainable Multi-Factor Decision Engine**: Dynamically evaluates demand across all 4 intersection approaches (North, South, East, West) and awards green phases with plain-English justifications.
5. **Starvation Prevention Safeguard**: A strict priority rule guaranteeing service to any approach whose waiting time exceeds a threshold (e.g. 60s), ensuring heavily congested corridors never starve minor roads.
6. **Side-by-Side Fixed-Time Benchmark**: Rigorously evaluates Adaptive AI against a conventional fixed-time baseline under identical traffic scenarios.

---

## 2. Technology Stack

- **Perception Pipeline**: Ultralytics YOLOv8 (`yolov8n.pt`) & OpenCV (`opencv-python-headless`)
- **Backend API & Simulation Engine**: Python 3.11, FastAPI, Uvicorn, Pydantic, NumPy, WebSockets
- **Database Storage**: SQLite (`backend/data/traffic_system.db`)
- **Unit Testing**: Pytest (`pytest app/tests/test_traffic_system.py`)
- **Frontend Dashboard**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts

---

## 3. Mathematical Decision Formula & Normalization

To eliminate arbitrary dimension bias (e.g. summing 15 vehicles with 90 seconds of delay and 110 meters of queue), the Decision Engine normalizes all physical dimensions into comparable `[0, 100]` scales before computing a weighted sum:

$$\text{Traffic Score}_i = (V_{\text{norm}} \times W_1) + (Q_{\text{norm}} \times W_2) + (W_{\text{norm}} \times W_3) + (PCU_{\text{norm}} \times W_4)$$

### Factor Normalization Rules
1. **Normalized Vehicle Count ($V_{\text{norm}}$)**:
   $$V_{\text{norm}} = \min\left(100, \frac{V_i}{30} \times 100\right)$$
2. **Normalized Queue Length ($Q_{\text{norm}}$)**:
   $$Q_{\text{norm}} = \min\left(100, \frac{Q_i}{160\,\text{m}} \times 100\right)$$
3. **Normalized Waiting Time ($W_{\text{norm}}$)**:
   $$W_{\text{norm}} = \min\left(100, \frac{\text{MaxWait}_i}{\text{StarvationThreshold}} \times 100\right)$$
4. **Normalized PCU Demand ($PCU_{\text{norm}}$)**:
   $$PCU_{\text{norm}} = \min\left(100, \frac{PCU_i}{40} \times 100\right)$$

### Default Weights
- $W_1$ (Vehicle Count): `0.35`
- $W_2$ (Queue Length): `0.20`
- $W_3$ (Waiting Time): `0.30`
- $W_4$ (Vehicle Type PCU): `0.15`
- $\sum W = 1.0$ (Weights are auto-normalized in the engine)

### Dynamic Green Duration Allocation
$$G = \text{clamp}\left(G_{\min},\, G_{\max},\, G_{\min} + (G_{\max} - G_{\min}) \times \frac{\text{Traffic Score}}{100}\right)$$
Also checked against discharge clearing demand:
$$T_{\text{clear}} = 2.0 + \frac{PCU_i}{\text{DischargeRate}}$$
Where $G_{\min} = 10\text{s}$, $G_{\max} = 60\text{s}$, Amber = $3\text{s}$, All-Red Clearance = $1\text{s}$.

### Starvation Prevention Safeguard
If any approach has $\text{Vehicle Count} > 0$ and $\text{Max Wait Time} \ge 60\text{s}$, the starvation safeguard overrides raw vehicle counts to prioritize the starving road, preventing infinite queuing.

---

## 4. Quick Start & Execution Instructions

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) or `uv`

### One-Command Quick Launch (Windows)
Double-click `run_all.bat` or run:
```powershell
.\run_all.bat
```

### Manual Installation & Run

#### 1. Backend Setup
```bash
cd backend

# Option A: With virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Run Unit Tests
pytest app/tests/test_traffic_system.py -v

# Start FastAPI Server (Port 8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend

npm install
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## 5. YOLOv8 Model Configuration & Demo Mode

The application uses Ultralytics YOLOv8 (`yolov8n.pt`).
- Upon first detection call, Ultralytics automatically downloads the lightweight official `yolov8n.pt` (~6 MB) weights.
- **Graceful Fallback / Demo Mode**: If GPU/torch acceleration is not available or the user clicks *"Run Built-In Test Scenario"*, the system enters **Clearly Labeled Demo Mode** (`[DEMO SIMULATION SENSOR]`), drawing calibrated lane bounding boxes and realistic vehicle counts.
- **Separation Guarantee**: Demo detections are never disguised as real camera detections. A prominent UI badge distinguishes between `[LIVE YOLOv8 INFERENCE]` and `[DEMO SIMULATED SENSOR]`.

---

## 6. Backend API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check, YOLO model status, cycle counter |
| `/api/simulation/state` | `GET` | Current 4-way intersection state, signal lights, queues |
| `/api/simulation/start` | `POST` | Start background simulation clock |
| `/api/simulation/pause` | `POST` | Pause simulation |
| `/api/simulation/reset` | `POST` | Reset queues and metrics to initial scenario |
| `/api/simulation/step` | `POST` | Advance one full decision cycle immediately |
| `/api/simulation/scenario` | `POST` | Select scenario preset (`LIGHT_BALANCED`, `HEAVY_CONGESTION`, etc.) |
| `/api/simulation/mode` | `POST` | Toggle between `ADAPTIVE_AI` and `FIXED_TIME` |
| `/api/simulation/speed` | `POST` | Set simulation speed multiplier (0.5x, 1x, 2x, 5x) |
| `/api/detection/upload` | `POST` | Upload image/video for YOLO detection & OpenCV annotation |
| `/api/detection/demo` | `POST` | Run synthetic road frame through demo detector |
| `/api/detection/inject` | `POST` | Push detected vehicle counts into live simulation queue |
| `/api/analytics` | `GET` | Vehicle distribution, decision timelines, direction breakdown |
| `/api/evaluation` | `GET` | Benchmark comparison: Adaptive AI vs. Fixed-Time baseline |
| `/api/history` | `GET` | List past simulation sessions saved in SQLite |
| `/api/history/save` | `POST` | Save active simulation session to SQLite |
| `/api/history/export/csv` | `GET` | Export evaluation metrics as downloadable CSV |
| `/api/settings` | `GET/PUT` | Read and update timing bounds and scoring weights |
| `/ws/traffic` | `WebSocket` | Real-time 10 Hz broadcast of intersection state ticks |

---

## 7. Unit Tests

Unit tests are included in `backend/app/tests/test_traffic_system.py`:
1. **Four Roads Equal Traffic**: Verifies fair selection under uniform load.
2. **Heavily Congested Road**: Verifies high-density corridors receive priority and extended green durations.
3. **Starvation Safeguard**: Proves that a road with 2 vehicles waiting 75s overrides a road with 30 vehicles waiting only 10s.
4. **Zero Traffic Safety**: Tests idle standby behavior with empty approaches.
5. **Signal Safety Invariants**: Mathematically verifies that conflicting greens never occur simultaneously.
6. **Fairness Under Sustained Demand**: Proves all 4 approaches are visited within 300s under heavy unbalanced load.
7. **Green Duration Bounds**: Verifies strict clamping between $G_{\min}$ and $G_{\max}$.

Run tests:
```bash
cd backend
pytest app/tests/test_traffic_system.py -v
```

---

## 8. Academic Scope & Engineering Disclaimer

This software application is developed as an **engineering college project prototype** demonstrating computer-vision perception and explainable adaptive signal allocation. It is intended for laboratory simulations, academic research, and technical presentations. It is **not** certified for controlling real-world municipal traffic infrastructure.
