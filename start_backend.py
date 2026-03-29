"""Start the Voice Assistant Backend API Server"""
import uvicorn
from config import API_HOST, API_PORT

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Voice Assistant Backend API Server")
    print("=" * 60)
    print(f"📡 REST API: http://{API_HOST}:{API_PORT}")
    print(f"🔌 WebSocket: ws://{API_HOST}:{API_PORT}/api/events")
    print(f"📚 API Docs: http://{API_HOST}:{API_PORT}/docs")
    print("=" * 60)
    print("Press Ctrl+C to stop\n")
    
    try:
        uvicorn.run(
            "backend.api_server:app",
            host=API_HOST,
            port=API_PORT,
            reload=True,  # Hot reload during development
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n👋 Backend stopped")
