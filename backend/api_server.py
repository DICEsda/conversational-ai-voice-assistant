"""FastAPI server for Voice Assistant GUI"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Set
import asyncio
from datetime import datetime
import json

from backend.models import (
    AssistantStatus, AssistantState, Config, ConfigUpdate,
    MetricsData, MetricsHistory, HealthResponse, Event, EventType
)
from backend.metrics_collector import MetricsCollector
from backend.voice_assistant_service import VoiceAssistantService
import config

# Global instances
metrics_collector: MetricsCollector = None
voice_assistant: VoiceAssistantService = None
websocket_clients: Set[WebSocket] = set()
main_event_loop = None  # Store main event loop for thread-safe broadcasting


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle"""
    global metrics_collector, voice_assistant, main_event_loop

    # Startup
    main_event_loop = asyncio.get_running_loop()

    metrics_collector = MetricsCollector(history_seconds=60, collection_interval=0.5)
    metrics_collector.start()

    voice_assistant = VoiceAssistantService(
        metrics_collector=metrics_collector,
        event_callback=broadcast_event
    )

    print("✅ Backend started successfully")
    print(f"📡 API: http://{config.API_HOST}:{config.API_PORT}")
    print(f"🔌 WebSocket: ws://{config.API_HOST}:{config.API_PORT}/api/events")

    yield

    # Shutdown
    if voice_assistant:
        voice_assistant.stop()
    if metrics_collector:
        metrics_collector.stop()
    print("👋 Backend stopped")


# Initialize FastAPI app
app = FastAPI(
    title="Voice Assistant API",
    description="Backend API for Voice Assistant GUI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow Electron app and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "file://*",  # Electron
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def broadcast_event_async(event_type: EventType, data: dict):
    """Broadcast event to all connected WebSocket clients (async version)"""
    event = Event(type=event_type, data=data, timestamp=datetime.now())
    message = event.model_dump_json()
    
    # Send to all connected clients
    dead_clients = set()
    for client in websocket_clients:
        try:
            await client.send_text(message)
        except Exception as e:
            print(f"Failed to send to client: {e}")
            dead_clients.add(client)
    
    # Remove dead clients
    for client in dead_clients:
        websocket_clients.discard(client)


def broadcast_event(event_type: EventType, data: dict):
    """Broadcast event to all connected WebSocket clients (sync wrapper)"""
    if not websocket_clients:
        return  # No clients connected
    
    if not main_event_loop:
        print(f"⚠️ No main event loop available for {event_type.value}")
        return
    
    # Schedule the async broadcast on the main event loop (thread-safe)
    asyncio.run_coroutine_threadsafe(
        broadcast_event_async(event_type, data),
        main_event_loop
    )


# ====================
# REST API Endpoints
# ====================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now()
    )


@app.get("/api/status", response_model=AssistantStatus)
async def get_status():
    """Get current voice assistant status"""
    if not voice_assistant:
        raise HTTPException(status_code=503, detail="Voice assistant not initialized")
    
    state = voice_assistant.get_state()
    is_running = voice_assistant.is_running()
    
    # Build status message based on state
    message_map = {
        AssistantState.IDLE: "Assistant is idle",
        AssistantState.LISTENING: f"Listening for '{config.KEYWORD_NAME}'...",
        AssistantState.RECORDING: "Recording audio...",
        AssistantState.TRANSCRIBING: "Transcribing speech...",
        AssistantState.THINKING: "Thinking...",
        AssistantState.RESPONDING: "Generating response...",
        AssistantState.SPEAKING: "Speaking...",
        AssistantState.ERROR: "Error occurred"
    }
    
    return AssistantStatus(
        state=state,
        message=message_map.get(state, "Unknown state"),
        is_running=is_running
    )


@app.post("/api/assistant/start")
async def start_assistant():
    """Start the voice assistant"""
    if not voice_assistant:
        raise HTTPException(status_code=503, detail="Voice assistant not initialized")
    
    if voice_assistant.is_running():
        return {"status": "already_running", "message": "Assistant is already running"}
    
    # Start in background
    voice_assistant.start()
    
    return {"status": "started", "message": "Assistant started successfully"}


@app.post("/api/assistant/stop")
async def stop_assistant():
    """Stop the voice assistant"""
    if not voice_assistant:
        raise HTTPException(status_code=503, detail="Voice assistant not initialized")
    
    voice_assistant.stop()
    
    return {"status": "stopped", "message": "Assistant stopped successfully"}


@app.get("/api/config", response_model=Config)
async def get_config():
    """Get current configuration"""
    return Config(
        lm_studio_url=config.LM_STUDIO_URL,
        model_name=config.MODEL_NAME,
        system_prompt=config.SYSTEM_PROMPT,
        max_tokens=config.MAX_TOKENS,
        temperature=config.TEMPERATURE,
        hotword_name=config.KEYWORD_NAME,
        sample_rate=config.SAMPLE_RATE,
        record_seconds=config.RECORD_SECONDS,
        enable_streaming=getattr(config, 'ENABLE_STREAMING', True),
        vad_enabled=getattr(config, 'VAD_ENABLED', True),
        vad_silence_duration=getattr(config, 'VAD_SILENCE_DURATION', 1.5),
        vad_max_duration=getattr(config, 'VAD_MAX_DURATION', 15.0),
        tts_enabled=getattr(config, 'TTS_ENABLED', False),
        tts_voice=getattr(config, 'TTS_VOICE', 'en-US-GuyNeural'),
    )


@app.post("/api/config")
async def update_config(config_update: ConfigUpdate):
    """Update configuration (runtime changes only)"""
    changes = []
    
    # Note: Most config changes require restart, but we can update LLM params on the fly
    if config_update.temperature is not None:
        config.TEMPERATURE = config_update.temperature
        if voice_assistant:
            voice_assistant.update_config(temperature=config_update.temperature)
        changes.append(f"temperature={config_update.temperature}")
    
    if config_update.max_tokens is not None:
        config.MAX_TOKENS = config_update.max_tokens
        if voice_assistant:
            voice_assistant.update_config(max_tokens=config_update.max_tokens)
        changes.append(f"max_tokens={config_update.max_tokens}")
    
    if config_update.system_prompt is not None:
        config.SYSTEM_PROMPT = config_update.system_prompt
        changes.append("system_prompt")
    
    if config_update.lm_studio_url is not None:
        config.LM_STUDIO_URL = config_update.lm_studio_url
        changes.append("lm_studio_url (requires restart)")
    
    if config_update.model_name is not None:
        config.MODEL_NAME = config_update.model_name
        changes.append("model_name (requires restart)")
    
    if config_update.record_seconds is not None:
        config.RECORD_SECONDS = config_update.record_seconds
        changes.append("record_seconds (requires restart)")
    
    if config_update.enable_streaming is not None:
        if hasattr(config, 'ENABLE_STREAMING'):
            config.ENABLE_STREAMING = config_update.enable_streaming
        changes.append("enable_streaming")

    if config_update.vad_enabled is not None:
        config.VAD_ENABLED = config_update.vad_enabled
        if voice_assistant:
            voice_assistant.update_config(vad_enabled=config_update.vad_enabled)
        changes.append(f"vad_enabled={config_update.vad_enabled}")

    if config_update.vad_silence_duration is not None:
        config.VAD_SILENCE_DURATION = config_update.vad_silence_duration
        if voice_assistant:
            voice_assistant.update_config(vad_silence_duration=config_update.vad_silence_duration)
        changes.append(f"vad_silence_duration={config_update.vad_silence_duration}")

    if config_update.vad_max_duration is not None:
        config.VAD_MAX_DURATION = config_update.vad_max_duration
        if voice_assistant:
            voice_assistant.update_config(vad_max_duration=config_update.vad_max_duration)
        changes.append(f"vad_max_duration={config_update.vad_max_duration}")

    if config_update.tts_enabled is not None:
        config.TTS_ENABLED = config_update.tts_enabled
        if voice_assistant:
            voice_assistant.update_config(tts_enabled=config_update.tts_enabled)
        changes.append(f"tts_enabled={config_update.tts_enabled}")

    if config_update.tts_voice is not None:
        config.TTS_VOICE = config_update.tts_voice
        if voice_assistant:
            voice_assistant.update_config(tts_voice=config_update.tts_voice)
        changes.append(f"tts_voice={config_update.tts_voice}")

    return {
        "status": "updated",
        "changes": changes,
        "message": "Configuration updated successfully"
    }


@app.get("/api/metrics", response_model=MetricsData)
async def get_metrics():
    """Get current metrics"""
    if not metrics_collector:
        raise HTTPException(status_code=503, detail="Metrics collector not initialized")
    
    system_metrics = metrics_collector.get_latest_system_metrics()
    timing_metrics = metrics_collector.get_latest_timing()
    
    if not system_metrics:
        raise HTTPException(status_code=503, detail="No metrics available yet")
    
    return MetricsData(
        system=system_metrics,
        timing=timing_metrics
    )


@app.get("/api/metrics/history", response_model=MetricsHistory)
async def get_metrics_history():
    """Get historical metrics"""
    if not metrics_collector:
        raise HTTPException(status_code=503, detail="Metrics collector not initialized")
    
    system_history = metrics_collector.get_system_history()
    timing_history = metrics_collector.get_timing_history()
    
    return MetricsHistory(
        system_history=system_history,
        timing_history=timing_history
    )


# ====================
# WebSocket Endpoint
# ====================

@app.websocket("/api/events")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time events"""
    client_id = id(websocket)
    
    try:
        await websocket.accept()
        websocket_clients.add(websocket)
        print(f"✅ WebSocket client {client_id} connected (total: {len(websocket_clients)})")
        
        # Send initial status
        if voice_assistant:
            state = voice_assistant.get_state()
            is_running = voice_assistant.is_running()
            initial_event = Event(
                type=EventType.STATE_CHANGE,
                data={
                    "state": state.value,
                    "message": f"Connected to backend (Assistant {'running' if is_running else 'idle'})"
                }
            )
            await websocket.send_text(initial_event.model_dump_json())
        
        # Keep connection alive and listen for client messages
        while True:
            try:
                # Wait for client messages (ping/pong) with longer timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                message = json.loads(data) if data else {}
                
                # Echo back as heartbeat
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
                
            except asyncio.TimeoutError:
                # Send keepalive ping to client
                try:
                    await websocket.send_text(json.dumps({"type": "keepalive", "timestamp": datetime.now().isoformat()}))
                except Exception:
                    break  # Connection is dead
    
    except WebSocketDisconnect:
        print(f"🔌 WebSocket client {client_id} disconnected normally")
    except Exception as e:
        print(f"❌ WebSocket client {client_id} error: {e}")
    finally:
        websocket_clients.discard(websocket)
        print(f"👋 WebSocket client {client_id} removed (remaining: {len(websocket_clients)})")


# ====================
# Run with uvicorn
# ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api_server:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
        log_level="info"
    )
