"""Text-to-Speech engine using edge-tts"""
import asyncio
import tempfile
import os
from typing import Optional

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False


class TTSEngine:
    """Text-to-Speech using Microsoft Edge TTS (free, high quality)"""

    def __init__(self, voice: str = "en-US-GuyNeural", rate: str = "+0%",
                 volume: str = "+0%"):
        self.voice = voice
        self.rate = rate
        self.volume = volume
        self._initialized = False

        if not EDGE_TTS_AVAILABLE:
            print("⚠️ edge-tts not installed. TTS disabled.")
            return
        if not PYGAME_AVAILABLE:
            print("⚠️ pygame not installed. TTS audio playback disabled.")
            return

        pygame.mixer.init()
        self._initialized = True

    @property
    def available(self) -> bool:
        return self._initialized

    def speak(self, text: str) -> Optional[str]:
        """Synthesize and play text. Returns the temp file path or None."""
        if not self._initialized:
            return None

        try:
            tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            tmp_path = tmp.name
            tmp.close()

            asyncio.run(self._synthesize(text, tmp_path))

            pygame.mixer.music.load(tmp_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                pygame.time.wait(100)

            pygame.mixer.music.unload()
            os.unlink(tmp_path)
            return tmp_path

        except Exception as e:
            print(f"❌ TTS error: {e}")
            return None

    async def _synthesize(self, text: str, output_path: str):
        """Generate speech audio file from text"""
        communicate = edge_tts.Communicate(
            text, self.voice, rate=self.rate, volume=self.volume
        )
        await communicate.save(output_path)

    def update_config(self, voice: Optional[str] = None,
                      rate: Optional[str] = None,
                      volume: Optional[str] = None):
        if voice is not None:
            self.voice = voice
        if rate is not None:
            self.rate = rate
        if volume is not None:
            self.volume = volume

    def cleanup(self):
        if PYGAME_AVAILABLE and self._initialized:
            try:
                pygame.mixer.quit()
            except Exception:
                pass

    @staticmethod
    def list_voices():
        """Return available voices (requires async)"""
        if not EDGE_TTS_AVAILABLE:
            return []
        return asyncio.run(edge_tts.list_voices())
