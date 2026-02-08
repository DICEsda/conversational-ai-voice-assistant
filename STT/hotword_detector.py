"""Hotword detection module using Porcupine"""
import sys
import struct
import pyaudio
import pvporcupine
import sounddevice as sd
import soundfile as sf
import os
from config import PORCUPINE_ACCESS_KEY, CUSTOM_KEYWORD_PATH, KEYWORD_NAME, HOTWORD_SOUND_PATH


class HotwordDetector:
    """Handles hotword detection using Porcupine"""
    
    def __init__(self):
        self._load_porcupine()
    
    def _load_porcupine(self):
        """Initialize Porcupine hotword detector"""
        print("Initializing Porcupine...")
        try:
            self.porcupine = pvporcupine.create(
                access_key=PORCUPINE_ACCESS_KEY,
                keyword_paths=[CUSTOM_KEYWORD_PATH]
            )
            print(f"✅ Porcupine loaded: '{KEYWORD_NAME}'\n")
        except Exception as e:
            print(f"❌ Porcupine failed: {e}")
            print("Get API key at: https://console.picovoice.ai/")
            sys.exit(1)
    
    def listen(self):
        """Listen for hotword"""
        pa = pyaudio.PyAudio()
        stream = pa.open(
            rate=self.porcupine.sample_rate,
            channels=1,
            format=pyaudio.paInt16,
            input=True,
            frames_per_buffer=self.porcupine.frame_length
        )
        
        print(f"🎤 Listening for '{KEYWORD_NAME}'...")
        
        try:
            while True:
                pcm = stream.read(self.porcupine.frame_length)
                pcm = struct.unpack_from("h" * self.porcupine.frame_length, pcm)
                
                if self.porcupine.process(pcm) >= 0:
                    print(f"✅ Hotword detected!")
                    stream.stop_stream()
                    stream.close()
                    self._play_sound()
                    return True
        except KeyboardInterrupt:
            stream.stop_stream()
            stream.close()
            pa.terminate()
            return False
    
    def _play_sound(self):
        """Play hotword detection sound"""
        try:
            if os.path.exists(HOTWORD_SOUND_PATH):
                sound_data, sound_sr = sf.read(HOTWORD_SOUND_PATH)
                sd.play(sound_data, sound_sr)
                sd.wait()
        except Exception:
            pass
    
    def cleanup(self):
        """Clean up resources"""
        self.porcupine.delete()
