"""Audio recording utilities"""
import numpy as np
import sounddevice as sd
from config import SAMPLE_RATE, RECORD_SECONDS


class AudioRecorder:
    """Handles audio recording"""
    
    @staticmethod
    def record(duration=RECORD_SECONDS):
        """Record audio from microphone"""
        print(f"🔴 Recording for {duration}s...")
        recording = sd.rec(
            int(duration * SAMPLE_RATE),
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype='float32'
        )
        sd.wait()
        print("⏹️ Recording complete")
        return recording.squeeze()
    
    @staticmethod
    def is_audio_valid(audio, threshold=0.01):
        """Check if audio is loud enough"""
        return np.abs(audio).max() >= threshold
