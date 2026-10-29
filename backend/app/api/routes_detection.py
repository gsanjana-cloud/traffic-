from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from typing import Optional, Dict, Any
from ..models.schemas import DetectionResult, Direction

def create_detection_router(detector, sim_engine):
    router = APIRouter(prefix="/api/detection", tags=["AI Vehicle Detection"])

    @router.post("/upload", response_model=DetectionResult)
    async def upload_and_detect(
        file: UploadFile = File(...),
        direction: str = Form("NORTH"),
        confidence: float = Form(0.40),
        force_demo: bool = Form(False)
    ):
        try:
            target_dir = Direction(direction.upper())
        except ValueError:
            target_dir = Direction.NORTH

        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Process through YOLO detector
        result = detector.detect_image(
            image_bytes=contents,
            direction=target_dir,
            confidence_thresh=confidence,
            force_demo=force_demo
        )
        return result

    @router.post("/demo", response_model=DetectionResult)
    def run_demo_detection(
        direction: str = Body("NORTH", embed=True),
        confidence: float = Body(0.40, embed=True)
    ):
        try:
            target_dir = Direction(direction.upper())
        except ValueError:
            target_dir = Direction.NORTH

        # Generate a synthetic road image with perspective road surface
        import numpy as np
        import cv2
        h, w = 480, 640
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        # Asphalt road background
        canvas[:] = (35, 38, 42)
        # Perspective road lanes
        pts = np.array([[int(w * 0.35), 0], [int(w * 0.65), 0], [w, h], [0, h]], np.int32)
        cv2.fillPoly(canvas, [pts], (50, 55, 60))
        # Yellow centerline
        cv2.line(canvas, (int(w * 0.5), 0), (int(w * 0.5), h), (0, 215, 255), 3)
        # White dashed lane dividers
        for y in range(0, h, 40):
            cv2.line(canvas, (int(w * 0.25 + y * 0.1), y), (int(w * 0.25 + y * 0.1), y + 20), (255, 255, 255), 2)
            cv2.line(canvas, (int(w * 0.75 - y * 0.1), y), (int(w * 0.75 - y * 0.1), y + 20), (255, 255, 255), 2)

        _, buf = cv2.imencode('.jpg', canvas)
        result = detector.detect_image(
            image_bytes=buf.tobytes(),
            direction=target_dir,
            confidence_thresh=confidence,
            force_demo=True
        )
        return result

    @router.post("/inject")
    def inject_detection_to_simulation(payload: Dict[str, Any] = Body(...)):
        direction_str = payload.get("direction", "NORTH")
        try:
            target_dir = Direction(direction_str.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid direction")

        cars = int(payload.get("cars", 0))
        buses = int(payload.get("buses", 0))
        trucks = int(payload.get("trucks", 0))
        motorcycles = int(payload.get("motorcycles", 0))

        # Add vehicles to simulation queue
        for _ in range(cars):
            sim_engine._add_vehicle(target_dir, "car", wait_sec=5.0)
        for _ in range(buses):
            sim_engine._add_vehicle(target_dir, "bus", wait_sec=5.0)
        for _ in range(trucks):
            sim_engine._add_vehicle(target_dir, "truck", wait_sec=5.0)
        for _ in range(motorcycles):
            sim_engine._add_vehicle(target_dir, "motorcycle", wait_sec=5.0)

        sim_engine._recalculate_road_states()

        return {
            "status": "injected",
            "direction": target_dir.value,
            "added": {"cars": cars, "buses": buses, "trucks": trucks, "motorcycles": motorcycles},
            "new_total_queue": len(sim_engine.queues[target_dir])
        }

    return router
