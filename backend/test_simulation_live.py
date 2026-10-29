import asyncio
import websockets
import json
import urllib.request
import time

def post(endpoint):
    req = urllib.request.Request(f'http://127.0.0.1:8000{endpoint}', data=b'', method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(endpoint):
    with urllib.request.urlopen(f'http://127.0.0.1:8000{endpoint}') as resp:
        return json.loads(resp.read().decode())

async def main():
    print("1. Resetting simulation...")
    post('/api/simulation/reset')
    
    print("2. Starting simulation...")
    post('/api/simulation/start')
    
    print("3. Connecting to WebSocket...")
    async with websockets.connect('ws://127.0.0.1:8000/ws/traffic') as ws:
        msg = await ws.recv()
        data = json.loads(msg)
        print("Initial WS message received:", data.get("type"))
        
        print("4. Capturing 5 real-time ticks...")
        for i in range(5):
            tick_raw = await ws.recv()
            tick = json.loads(tick_raw)
            d = tick["data"]
            print(f"Tick {i+1}: Clock={d['elapsed_time_sec']}s, Dir={d['current_green_direction']}, Phase={d['current_phase']}, Rem={d['phase_time_remaining']}s, Queued={d['total_vehicles_active']}, Processed={d['total_vehicles_processed']}")
            
    print("5. Pausing simulation...")
    post('/api/simulation/pause')
    
    print("6. Verifying state after pause...")
    state = get('/api/simulation/state')
    print(f"Paused! is_running={state['is_running']}, Clock={state['elapsed_time_sec']}s")

if __name__ == "__main__":
    asyncio.run(main())
