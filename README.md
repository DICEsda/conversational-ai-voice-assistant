# Conversational AI Voice Assistant

A desktop voice assistant with hotword detection, speech-to-text, LLM integration, and a real-time monitoring dashboard. Built with a Python backend (FastAPI) and a React + Electron frontend.

## Architecture

```
Microphone
    |
[Porcupine Hotword] --> "Hey Dice" wake word
    |
[Audio Recorder] --> Record speech (5s or VAD)
    |
[Whisper STT] --> Transcribe to text (GPU-accelerated)
    |
[LM Studio LLM] --> Generate response (streaming tokens)
    |
React UI <-- FastAPI WebSocket events (real-time)
```

```
+---------------------------------------------+
|  Electron Desktop App                       |
|  +---------------------------------------+  |
|  |  React Frontend (Vite, port 5173)     |  |
|  |  - SplashScreen (main voice UI)       |  |
|  |  - GraphsPage (live metrics)          |  |
|  |  - SettingsPage (LLM config)          |  |
|  +---------------------------------------+  |
|        HTTP REST + WebSocket                |
+---------------------------------------------+
                    |
+---------------------------------------------+
|  Python Backend (FastAPI, port 8000)        |
|  - REST API (8 endpoints)                   |
|  - WebSocket event streaming                |
|  - Voice assistant service (threaded)       |
|  - Metrics collector (CPU/GPU/RAM/Disk)     |
+---------------------------------------------+
```

## Features

- **Custom hotword detection** - "Hey Dice" wake word via Porcupine
- **Speech-to-text** - GPU-accelerated transcription with Faster Whisper
- **Streaming LLM responses** - Token-by-token display via LM Studio
- **Real-time metrics dashboard** - CPU, GPU, RAM, Disk I/O charts
- **Desktop application** - Electron wrapper with system tray
- **Live configuration** - Adjust temperature, max tokens, recording duration
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
   ```

## Running

### Development Mode

```bash
# Terminal 1: Start the backend API
python start_backend.py

# Terminal 2: Start the frontend dev server
cd figma_project
npm run dev

# Terminal 3 (optional): Launch Electron wrapper
npx electron electron/main.js
```

Then open http://localhost:5173 in your browser, or use the Electron window.

### Testing

```bash
# Run backend API tests
python test_backend.py

# Debug WebSocket events
python debug_websocket.py
```

## Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── api_server.py           # REST API + WebSocket endpoints
│   ├── models.py               # Pydantic data models
│   ├── voice_assistant_service.py  # Threaded voice pipeline
│   └── metrics_collector.py    # System metrics (CPU/GPU/RAM/Disk)
├── STT/                        # Speech-to-Text
│   ├── hotword_detector.py     # Porcupine hotword detection
│   ├── speech_to_text.py       # Whisper transcription
│   └── audio_recorder.py       # Audio recording
├── LMStudio_LLMClient/        # LLM integration
│   └── llm_client.py           # LM Studio API client (streaming)
├── electron/                   # Electron desktop wrapper
│   ├── main.js                 # Main process + tray
│   ├── backend-manager.js      # Python backend lifecycle
│   └── preload.js              # IPC security bridge
├── figma_project/              # React frontend
│   ├── src/app/components/     # SplashScreen, GraphsPage, SettingsPage
│   ├── src/services/           # API + WebSocket clients
│   └── src/types/              # TypeScript type definitions
├── config.example.py           # Configuration template
├── main.py                     # CLI-only voice assistant
├── start_backend.py            # Backend launcher
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
| `RECORD_SECONDS` | `5` | Recording duration after hotword |
| `MAX_TOKENS` | `150` | LLM response max tokens |
| `TEMPERATURE` | `0.7` | LLM sampling temperature |
| `API_HOST` | `127.0.0.1` | Backend API host |
| `API_PORT` | `8000` | Backend API port |
| `ENABLE_STREAMING` | `True` | Stream LLM tokens in real-time |

## Note

This project requires a Picovoice access key and LM Studio running with a loaded model. The `config.py` file is gitignored to protect API keys.
