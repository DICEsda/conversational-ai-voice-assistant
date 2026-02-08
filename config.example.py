"""Configuration for Voice Assistant - EXAMPLE
Copy this to config.py and fill in your values"""
import os

# LM Studio Configuration
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234")
MODEL_NAME = os.getenv("MODEL_NAME", "mistralai/mistral-7b-instruct-v0.3")

# Picovoice Configuration
PORCUPINE_ACCESS_KEY = os.getenv("PORCUPINE_ACCESS_KEY", "YOUR_ACCESS_KEY_HERE")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CUSTOM_KEYWORD_PATH = os.path.join(BASE_DIR, "STT", "Hey-Dice", "Hey-Dice_en_windows_v4_0_0.ppn")
HOTWORD_SOUND_PATH = os.path.join(BASE_DIR, "assets", "hotword_detected.mp3")

# Audio Settings
SAMPLE_RATE = 16000
RECORD_SECONDS = 5
KEYWORD_NAME = "Hey Dice"

# LLM Settings
SYSTEM_PROMPT = "You are a helpful voice assistant. Keep responses brief and conversational."
MAX_TOKENS = 150
TEMPERATURE = 0.7
