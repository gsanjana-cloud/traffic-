import os
import cv2
import numpy as np
import base64
import time
from typing import Dict, List, Tuple, Optional
from ..models.schemas import DetectionResult, DetectedBox, Direction

# Standard COCO classes of interest
TARGET_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

# Distinct neon colors for dark HUD overlay (BGR format for OpenCV)
CLASS_COLORS = {
    "car": (255, 180, 0),        # Cyan / Light Blue
    "bus": (0, 165, 255),        # Orange
    "truck": (255, 0, 200),      # Magenta / Purple
    "motorcycle": (80, 240, 80)  # Bright Green
}

PCU_WEIGHTS = {
    "car": 1.0,
    "bus": 2.5,
    "truck": 2.2,
    "motorcycle": 0.5
}

LIMITATIONS_LIST = [
    "Adverse weather (rain, dense fog, snow) reduces edge contrast and detection recall.",
    "Nighttime and extreme glare cause headlight flaring and false negatives.",
    "Heavy vehicle occlusion: large trucks or buses can completely obscure trailing motorcycles.",
    "Camera mounting angle: low-angle perspectives cause severe spatial overlap and depth ambiguity.",
    "Low-resolution CCTV streams (sub-720p) degrade classification accuracy for small two-wheelers."
]

class YOLOTrafficDetector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self.model = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            # Lazy initialize or load lightweight model
            print(f"Loading YOLO model: {self.model_name}...")
            self.model = YOLO(self.model_name)
            self.is_loaded = True
            print("YOLO model loaded successfully!")
        except Exception as e:
            print(f"Notice: YOLO model could not be loaded directly ({e}). Running in Computer Vision / Demo Fallback Mode.")
            self.model = None
            self.is_loaded = False

    def detect_image(
        self,
        image_bytes: bytes,
        direction: Direction = Direction.NORTH,
        confidence_thresh: float = 0.40,
        force_demo: bool = False
    ) -> DetectionResult:
        start_time = time.time()

        # Convert bytes to cv2 image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            # Fallback placeholder image
            img = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(img, "Empty or Unsupported Image", (50, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        h, w = img.shape[:2]
        boxes_list: List[DetectedBox] = []
        counts = {"car": 0, "bus": 0, "truck": 0, "motorcycle": 0}
        is_demo = force_demo or (not self.is_loaded)

        if not is_demo and self.model is not None:
            try:
                results = self.model.predict(img, conf=confidence_thresh, verbose=False)
                for r in results:
                    for b in r.boxes:
                        cls_id = int(b.cls[0].item())
                        conf = float(b.conf[0].item())
                        if cls_id in TARGET_CLASSES:
                            c_name = TARGET_CLASSES[cls_id]
                            counts[c_name] += 1
                            xyxy = [int(v.item()) for v in b.xyxy[0]]
                            boxes_list.append(DetectedBox(
                                box=xyxy,
                                class_name=c_name,
                                confidence=round(conf, 2),
                                direction_assigned=direction
                            ))
            except Exception as ex:
                print(f"Error during YOLO inference: {ex}. Falling back to demo detection.")
                is_demo = True

        if is_demo:
            # Generate realistic demo detections positioned in road perspective lanes
            boxes_list, counts = self._generate_demo_detections(w, h, direction)

        # Annotate image with OpenCV bounding boxes, badges, and HUD overlay
        annotated_img = self._annotate_frame(img.copy(), boxes_list, counts, direction, is_demo)

        # Encode annotated image to JPEG base64 for frontend display
        _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

        elapsed_ms = (time.time() - start_time) * 1000.0
        total_veh = sum(counts.values())
        pcu = (
            counts["car"] * PCU_WEIGHTS["car"] +
            counts["bus"] * PCU_WEIGHTS["bus"] +
            counts["truck"] * PCU_WEIGHTS["truck"] +
            counts["motorcycle"] * PCU_WEIGHTS["motorcycle"]
        )

        return DetectionResult(
            is_demo_mode=is_demo,
            source_name="Camera Stream / Uploaded Media",
            direction=direction,
            cars=counts["car"],
            buses=counts["bus"],
            trucks=counts["truck"],
            motorcycles=counts["motorcycle"],
            total_detected=total_veh,
            estimated_pcu=round(pcu, 1),
            boxes=boxes_list,
            processing_time_ms=round(elapsed_ms, 1),
            limitations_notes=LIMITATIONS_LIST,
            annotated_image_base64=img_b64
        )

    def _generate_demo_detections(
        self,
        w: int,
        h: int,
        direction: Direction
    ) -> Tuple[List[DetectedBox], Dict[str, int]]:
        """Generates realistic vehicle detections arranged logically on road lanes for testing."""
        # Simulated lane coordinates
        boxes = []
        counts = {"car": 0, "bus": 0, "truck": 0, "motorcycle": 0}

        # 1 Bus
        x1, y1 = int(w * 0.15), int(h * 0.35)
        x2, y2 = int(w * 0.42), int(h * 0.75)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="bus", confidence=0.91, direction_assigned=direction))
        counts["bus"] += 1

        # 2 Cars
        x1, y1 = int(w * 0.50), int(h * 0.40)
        x2, y2 = int(w * 0.72), int(h * 0.70)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="car", confidence=0.88, direction_assigned=direction))
        counts["car"] += 1

        x1, y1 = int(w * 0.52), int(h * 0.22)
        x2, y2 = int(w * 0.68), int(h * 0.38)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="car", confidence=0.82, direction_assigned=direction))
        counts["car"] += 1

        # 1 Truck
        x1, y1 = int(w * 0.75), int(h * 0.30)
        x2, y2 = int(w * 0.95), int(h * 0.65)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="truck", confidence=0.86, direction_assigned=direction))
        counts["truck"] += 1

        # 2 Motorcycles
        x1, y1 = int(w * 0.44), int(h * 0.58)
        x2, y2 = int(w * 0.49), int(h * 0.72)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="motorcycle", confidence=0.79, direction_assigned=direction))
        counts["motorcycle"] += 1

        x1, y1 = int(w * 0.46), int(h * 0.45)
        x2, y2 = int(w * 0.50), int(h * 0.56)
        boxes.append(DetectedBox(box=[x1, y1, x2, y2], class_name="motorcycle", confidence=0.74, direction_assigned=direction))
        counts["motorcycle"] += 1

        return boxes, counts

    def _annotate_frame(
        self,
        img: np.ndarray,
        boxes: List[DetectedBox],
        counts: Dict[str, int],
        direction: Direction,
        is_demo: bool
    ) -> np.ndarray:
        h, w = img.shape[:2]

        # Draw bounding boxes
        for item in boxes:
            x1, y1, x2, y2 = item.box
            color = CLASS_COLORS.get(item.class_name, (0, 255, 0))

            # Bounding box rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            # Label banner
            label = f"{item.class_name.upper()} {int(item.confidence * 100)}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            thickness = 1
            (lw, lh), _ = cv2.getTextSize(label, font, font_scale, thickness)

            # Background box for label text
            cv2.rectangle(img, (x1, max(0, y1 - lh - 6)), (x1 + lw + 6, max(0, y1)), color, -1)
            cv2.putText(img, label, (x1 + 3, max(lh + 2, y1 - 3)), font, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)

        # Top HUD Dashboard Bar
        hud_h = 44
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (w, hud_h), (15, 23, 42), -1) # Dark Slate
        cv2.addWeighted(overlay, 0.85, img, 0.15, 0, img)

        # Mode Badge
        if is_demo:
            badge_text = "DEMO SIMULATION SENSOR"
            badge_color = (0, 165, 255) # Orange
        else:
            badge_text = "LIVE YOLOv8 INFERENCE"
            badge_color = (80, 240, 80) # Bright Green

        cv2.putText(img, f"[{badge_text}]", (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 2, cv2.LINE_AA)
        cv2.putText(img, f"APPROACH: {direction.value}", (280, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

        # Stats on right
        stats_text = f"Total: {sum(counts.values())} | Cars: {counts['car']} | Buses: {counts['bus']} | Trucks: {counts['truck']} | Bikes: {counts['motorcycle']}"
        cv2.putText(img, stats_text, (max(w - 520, 480), 28), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 220, 240), 1, cv2.LINE_AA)

        return img
