import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
import asyncio
import json
import websockets
from agent.windows_agent import get_process_events

async def push_initial_batch():
    evs = get_process_events()
    print(f"Captured {len(evs)} live processes from Windows kernel.")
    async with websockets.connect("ws://127.0.0.1:8000/ws/agent?token=defenx-internal-local-token") as ws:
        for e in evs[:40]:
            await ws.send(json.dumps(e))
    print("Pushed 40 live events to backend.")

if __name__ == "__main__":
    asyncio.run(push_initial_batch())
