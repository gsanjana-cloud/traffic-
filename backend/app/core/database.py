import sqlite3
import json
import os
import uuid
import time
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "traffic_system.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_sessions (
        id TEXT PRIMARY KEY,
        created_at REAL,
        mode TEXT,
        scenario TEXT,
        duration_sec REAL,
        total_cycles INTEGER,
        total_vehicles_processed INTEGER,
        avg_wait_sec REAL,
        max_wait_sec REAL,
        avg_queue_m REAL,
        max_queue_m REAL,
        green_utilization_pct REAL,
        unnecessary_stops INTEGER,
        metrics_json TEXT,
        decisions_json TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_runs (
        id TEXT PRIMARY KEY,
        created_at REAL,
        scenario TEXT,
        duration_sec REAL,
        adaptive_metrics_json TEXT,
        fixed_metrics_json TEXT,
        improvements_json TEXT,
        summary TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        updated_at REAL,
        settings_json TEXT
    );
    """)
    conn.commit()
    conn.close()

def save_simulation_session(session_data: Dict[str, Any]) -> str:
    session_id = session_data.get("id") or str(uuid.uuid4())
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO simulation_sessions (
        id, created_at, mode, scenario, duration_sec, total_cycles,
        total_vehicles_processed, avg_wait_sec, max_wait_sec,
        avg_queue_m, max_queue_m, green_utilization_pct, unnecessary_stops,
        metrics_json, decisions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        session_data.get("created_at", time.time()),
        session_data.get("mode", "ADAPTIVE_AI"),
        session_data.get("scenario", "MODERATE_BALANCED"),
        session_data.get("duration_sec", 0.0),
        session_data.get("total_cycles", 0),
        session_data.get("total_vehicles_processed", 0),
        session_data.get("avg_wait_sec", 0.0),
        session_data.get("max_wait_sec", 0.0),
        session_data.get("avg_queue_m", 0.0),
        session_data.get("max_queue_m", 0.0),
        session_data.get("green_utilization_pct", 0.0),
        session_data.get("unnecessary_stops", 0),
        json.dumps(session_data.get("metrics", {})),
        json.dumps(session_data.get("decisions", []))
    ))
    conn.commit()
    conn.close()
    return session_id

def list_simulation_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, created_at, mode, scenario, duration_sec, total_cycles,
           total_vehicles_processed, avg_wait_sec, max_wait_sec,
           green_utilization_pct, unnecessary_stops
    FROM simulation_sessions
    ORDER BY created_at DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_simulation_session_detail(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM simulation_sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["metrics"] = json.loads(data["metrics_json"]) if data.get("metrics_json") else {}
    data["decisions"] = json.loads(data["decisions_json"]) if data.get("decisions_json") else []
    return data

def save_evaluation_run(eval_data: Dict[str, Any]) -> str:
    run_id = eval_data.get("id") or str(uuid.uuid4())
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO evaluation_runs (
        id, created_at, scenario, duration_sec,
        adaptive_metrics_json, fixed_metrics_json, improvements_json, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        eval_data.get("created_at", time.time()),
        eval_data.get("scenario", "MODERATE_BALANCED"),
        eval_data.get("duration_sec", 0.0),
        json.dumps(eval_data.get("adaptive_metrics", {})),
        json.dumps(eval_data.get("fixed_metrics", {})),
        json.dumps(eval_data.get("improvements", {})),
        eval_data.get("summary", "")
    ))
    conn.commit()
    conn.close()
    return run_id

def list_evaluation_runs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, created_at, scenario, duration_sec, summary,
           adaptive_metrics_json, fixed_metrics_json, improvements_json
    FROM evaluation_runs
    ORDER BY created_at DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    results = []
    for row in rows:
        item = dict(row)
        item["adaptive_metrics"] = json.loads(item["adaptive_metrics_json"]) if item.get("adaptive_metrics_json") else {}
        item["fixed_metrics"] = json.loads(item["fixed_metrics_json"]) if item.get("fixed_metrics_json") else {}
        item["improvements"] = json.loads(item["improvements_json"]) if item.get("improvements_json") else {}
        results.append(item)
    return results

def load_persisted_settings() -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT settings_json FROM system_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row and row["settings_json"]:
        return json.loads(row["settings_json"])
    return None

def save_persisted_settings(settings_dict: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO system_settings (id, updated_at, settings_json)
    VALUES (1, ?, ?)
    """, (time.time(), json.dumps(settings_dict)))
    conn.commit()
    conn.close()
