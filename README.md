# Conversational AI Voice Assistant

A desktop voice assistant with hotword detection, speech-to-text, LLM integration, and a real-time monitoring dashboard. Built with a Python backend (FastAPI) and a React + Electron frontend.

## Architecture

```
Microphone
    |
[Porcupine Hotword] --> "Hey Dice" wake word
    |
[Audio Recorder] --> Record speech (VAD auto-stop or fixed duration)
    |
[Whisper STT] --> Transcribe to text (GPU-accelerated)
    |
[LM Studio LLM] --> Generate response (streaming tokens)
    |
[Edge TTS] --> Speak response aloud (optional)
    |
React UI <-- FastAPI WebSocket events (real-time)
```

```
+---------------------------------------------+
|  Electron Desktop App (.exe)                |
|  +---------------------------------------+  |
|  |  React Frontend (Vite, port 5173)     |  |
|  |  - SplashScreen (main voice UI)       |  |
|  |  - GraphsPage (live metrics)          |  |
|  |  - SettingsPage (full config)         |  |
|  +---------------------------------------+  |
|        HTTP REST + WebSocket                |
+---------------------------------------------+
                    |
+---------------------------------------------+
|  Python Backend (FastAPI, port 8000)        |
|  - REST API (9 endpoints)                   |
|  - WebSocket event streaming                |
|  - Voice assistant service (threaded)       |
|  - Metrics collector (CPU/GPU/RAM/Disk)     |
+---------------------------------------------+
```

## Features

- **Custom hotword detection** - "Hey Dice" wake word via Porcupine
- **Speech-to-text** - GPU-accelerated transcription with Faster Whisper (configurable model size)
- **Streaming LLM responses** - Token-by-token display via LM Studio
- **Voice Activity Detection (VAD)** - Auto-stops recording when you finish speaking
- **Text-to-Speech (TTS)** - Speaks responses aloud via Microsoft Edge TTS (7 voice options)
- **Model selection** - Choose Whisper model size and LLM model from the GUI
- **Real-time metrics dashboard** - CPU, GPU, RAM, Disk I/O charts
- **Desktop application** - Electron .exe with system tray and error dialogs
- **Live configuration** - Adjust all settings at runtime via the Settings page
- **WebSocket events** - Real-time state updates across the full pipeline
- **Conversation history** - Maintains context across interactions

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **LM Studio** - Download from [lmstudio.ai](https://lmstudio.ai/) and load a model
- **Picovoice Access Key** - Free tier at [console.picovoice.ai](https://console.picovoice.ai/)
- **NVIDIA GPU** (recommended) - For Whisper acceleration via CUDA

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DICEsda/conversational-ai-voice-assistant.git
   cd conversational-ai-voice-assistant
   ```

2. **Configure the application**
   ```bash
   cp config.example.py config.py
   # Edit config.py with your Porcupine access key and LM Studio URL
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install frontend dependencies**
   ```bash
   cd figma_project
   npm install
   cd ..
   npm install
   ```

## Running

### Option 1: Electron Desktop App (.exe)

If already built:
```bash
dist-electron\win-unpacked\Voice Assistant.exe
```

To build the .exe yourself:
```bash
npm run build
```
The exe auto-starts the Python backend. If Python or dependencies are missing, it shows an error dialog telling you what to install.

### Option 2: Development Mode (browser)

```bash
# Terminal 1: Start the backend API
python start_backend.py

# Terminal 2: Start the frontend dev server
cd figma_project
npm run dev
```
Then open http://localhost:5173 in your browser.

### Option 3: Development with Electron

```bash
# Terminal 1: Start the backend
python start_backend.py

# Terminal 2: Start frontend dev server
cd figma_project
npm run dev

# Terminal 3: Launch Electron (connects to dev server)
npm start
```

## Testing

### Quick Verification (backend only, no microphone needed)

```bash
# 1. Start the backend
python start_backend.py

# 2. Wait ~15 seconds for startup, then run tests
python test_backend.py
```

Expected output:
```
[PASS] Health check passed
[PASS] Status check passed
[PASS] Config check passed
[PASS] Metrics check passed
Results: 4 passed, 0 failed
```

### Test Individual Endpoints (with curl)

```bash
# Health check
curl http://127.0.0.1:8000/api/health

# Full config (should show VAD, TTS, model settings)
curl http://127.0.0.1:8000/api/config

# Available models (Whisper sizes + LLM models from LM Studio)
curl http://127.0.0.1:8000/api/models

# Live system metrics
curl http://127.0.0.1:8000/api/metrics

# Update config at runtime
curl -X POST http://127.0.0.1:8000/api/config \
  -H "Content-Type: application/json" \
  -d '{"vad_enabled": true, "tts_enabled": true, "whisper_model_size": "small"}'

# Interactive API docs
# Open http://127.0.0.1:8000/docs in browser
```

### Test WebSocket Events

```bash
python debug_websocket.py
```
This connects to the WebSocket and prints all events in real-time.

### Test the Full Voice Pipeline

Requires: microphone + LM Studio running with a loaded model.

1. Start backend: `python start_backend.py`
2. Start frontend: `cd figma_project && npm run dev`
3. Open http://localhost:5173
4. Click **Start Assistant**
5. Say **"Hey Dice"** - recording should start
6. Ask a question - recording auto-stops (VAD), transcribes, and streams the LLM response
7. If TTS is enabled in settings, the response is spoken aloud

### Test Settings Page

1. Open http://localhost:5173 and click the sliders icon (top left)
2. Verify these controls are present:
   - **LLM Model dropdown** (populated if LM Studio is running)
   - **Whisper Model dropdown** (tiny/base/small/medium/large-v2)
   - **Temperature slider** (0-2)
   - **Max Tokens slider** (50-4096)
   - **Recording Duration slider** (3-10s)
   - **Stream Responses toggle**
   - **VAD section**: Enable VAD toggle, Silence Timeout slider, Max Recording slider
   - **TTS section**: Enable TTS toggle, Voice dropdown (7 options)
3. Change some values and click **Apply Settings** - should show "Settings saved successfully!"

### Test Metrics Dashboard

1. Open http://localhost:5173 and click the chart icon (top right)
2. Verify live charts for GPU, CPU, RAM, DISK tabs
3. Charts should auto-refresh every 2 seconds

### Test Electron .exe

1. Build: `npm run build`
2. Run: `dist-electron\win-unpacked\Voice Assistant.exe`
3. Verify:
   - Window appears as a small transparent card
   - Backend auto-starts (check system tray icon)
   - Right-click tray icon shows backend status
   - All features work same as browser mode

### Test Error Handling

To verify error dialogs in the Electron app:
- **No Python**: Uninstall Python or remove from PATH, run the .exe - should show "Python is not installed" dialog
- **No config.py**: Delete config.py, run the .exe - should show "config.py not found" dialog
- **Missing pip packages**: Uninstall a dependency (`pip uninstall fastapi`), run the .exe - should show "Missing Python dependency: fastapi" dialog
- **No LM Studio**: Don't start LM Studio - frontend shows "Backend not running" overlay with retry button; `/api/models` returns empty LLM list

## Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── api_server.py           # REST API (9 endpoints) + WebSocket
│   ├── models.py               # Pydantic data models
│   ├── voice_assistant_service.py  # Threaded voice pipeline
│   └── metrics_collector.py    # System metrics (CPU/GPU/RAM/Disk)
├── STT/                        # Speech-to-Text
│   ├── hotword_detector.py     # Porcupine hotword detection
│   ├── speech_to_text.py       # Whisper transcription (configurable model)
│   └── audio_recorder.py       # Audio recording with VAD
├── TTS/                        # Text-to-Speech
│   └── tts_engine.py           # Edge TTS engine with pygame playback
├── LMStudio_LLMClient/        # LLM integration
│   └── llm_client.py           # LM Studio API client (streaming)
├── electron/                   # Electron desktop wrapper
│   ├── main.js                 # Main process + tray + error dialogs
│   ├── backend-manager.js      # Python backend lifecycle + dependency checks
│   └── preload.js              # IPC security bridge
├── figma_project/              # React frontend
│   ├── src/app/components/     # SplashScreen, GraphsPage, SettingsPage
│   ├── src/services/           # API + WebSocket clients
│   └── src/types/              # TypeScript type definitions
├── dist-electron/              # Built Electron app (gitignored)
│   └── win-unpacked/
│       └── Voice Assistant.exe
├── config.example.py           # Configuration template
├── main.py                     # CLI-only voice assistant (no GUI)
├── start_backend.py            # Backend launcher
├── test_backend.py             # Backend API test suite
├── debug_websocket.py          # WebSocket event debugger
└── requirements.txt            # Python dependencies
```

## Configuration

Edit `config.py` (copied from `config.example.py`):

| Setting | Default | Description |
|---------|---------|-------------|
| `LM_STUDIO_URL` | `http://localhost:1234` | LM Studio API endpoint |
| `MODEL_NAME` | `mistralai/mistral-7b-instruct-v0.3` | LLM model identifier |
| `PORCUPINE_ACCESS_KEY` | (required) | Picovoice API key |
| `SAMPLE_RATE` | `16000` | Audio sample rate (Hz) |
| `RECORD_SECONDS` | `5` | Fallback recording duration (when VAD off) |
| `WHISPER_MODEL_SIZE` | `base` | Whisper model: tiny/base/small/medium/large-v2 |
| `MAX_TOKENS` | `150` | LLM response max tokens |
| `TEMPERATURE` | `0.7` | LLM sampling temperature |
| `API_HOST` | `127.0.0.1` | Backend API host |
| `API_PORT` | `8000` | Backend API port |
| `ENABLE_STREAMING` | `True` | Stream LLM tokens in real-time |
| `VAD_ENABLED` | `True` | Auto-stop recording on silence |
| `VAD_SILENCE_DURATION` | `1.5` | Seconds of silence before stopping |
| `VAD_MAX_DURATION` | `15.0` | Max recording length (safety cap) |
| `TTS_ENABLED` | `False` | Speak responses aloud |
| `TTS_VOICE` | `en-US-GuyNeural` | Edge TTS voice name |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Assistant state and status |
| POST | `/api/assistant/start` | Start voice assistant |
| POST | `/api/assistant/stop` | Stop voice assistant |
| GET | `/api/config` | Get current configuration |
| POST | `/api/config` | Update configuration at runtime |
| GET | `/api/models` | List available LLM and Whisper models |
| GET | `/api/metrics` | Current system metrics |
| GET | `/api/metrics/history` | Historical metrics (60s window) |
| WS | `/api/events` | Real-time WebSocket event stream |

## What Was Built

This project was finalized in a single session covering:

1. **Git hygiene** - Organized all untracked code into 5 structured commits, set up .gitignore/.gitattributes, closed 6 of 7 GitHub issues
2. **Backend API** - FastAPI with 9 REST endpoints + WebSocket, modernized with lifespan context manager
3. **React frontend** - SplashScreen, GraphsPage, SettingsPage with HashRouter for Electron compatibility
4. **Voice Activity Detection (#3)** - Energy-based silence detection replaces fixed 5-second recording
5. **Text-to-Speech (#4)** - Edge TTS with pygame playback, 7 English voice options, SPEAKING pipeline state
6. **Model selection (#5)** - Whisper model size selector + LLM model dropdown from LM Studio
7. **Streaming LLM (#2)** - Token-by-token response streaming via WebSocket
8. **Metrics dashboard (#6)** - Live CPU/GPU/RAM/Disk charts with recharts
9. **Electron packaging** - Portable .exe build with electron-builder, error dialogs for missing dependencies
10. **Documentation** - Full README with testing guide, PROGRESS.md, TESTING_GUIDE.md

## Note

This project requires a Picovoice access key and LM Studio running with a loaded model. The `config.py` file is gitignored to protect API keys. The Electron .exe requires Python and pip dependencies installed on the machine - it is a launcher, not a fully self-contained bundle.
