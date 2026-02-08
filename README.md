# Voice Assistant with Hotword Detection

A voice-activated AI assistant using Porcupine for hotword detection, Whisper for speech-to-text, and LM Studio for conversational AI.

##  Pipeline

\\\
Microphone → Hotword (Porcupine) → Record Audio → Whisper STT → LM Studio API → Response
\\\

##  Features

-  **Custom hotword detection** - Wake word activation with Porcupine
-  **Speech-to-text** - GPU-accelerated transcription with Faster Whisper
-  **Conversational AI** - Local LLM inference via LM Studio
-  **Audio feedback** - Play sound on hotword detection
-  **Conversation history** - Maintains context across interactions
-  **Modular design** - Clean, organized codebase

##  Prerequisites

- **Python 3.8+**
- **LM Studio** - Download from [lmstudio.ai](https://lmstudio.ai/)
- **Picovoice Access Key** - Free tier at [console.picovoice.ai](https://console.picovoice.ai/)
- **CUDA** (optional) - For GPU acceleration

##  Note to self

This project requires a Picovoice access key and LM Studio. Make sure not to commit \config.py\ file with API keys.



