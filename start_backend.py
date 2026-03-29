"""Start the Voice Assistant Backend API Server"""
import sys
import os

# Fix Windows console encoding for emoji
if sys.platform == 'win32':
    os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import uvicorn
from config import API_HOST, API_PORT

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Voice Assistant Backend API Server")
    print("=" * 60)
    print(f"REST API: http://{API_HOST}:{API_PORT}")
    print(f"WebSocket: ws://{API_HOST}:{API_PORT}/api/events")
    print(f"API Docs: http://{API_HOST}:{API_PORT}/docs")
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
        print("\nBackend stopped")
