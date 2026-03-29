"""Debug script to check WebSocket connection and events"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://127.0.0.1:8000/api/events"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket!")
            
            # Listen for messages
            print("Listening for events...")
            async for message in websocket:
                try:
                    data = json.loads(message)
                    print(f"\n📨 Received event:")
                    print(f"  Type: {data.get('type')}")
                    print(f"  Data: {data.get('data')}")
                    print(f"  Timestamp: {data.get('timestamp')}")
                except json.JSONDecodeError:
                    print(f"❌ Failed to parse: {message}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("WebSocket Debug Tool")
    print("=" * 50)
    asyncio.run(test_websocket())
