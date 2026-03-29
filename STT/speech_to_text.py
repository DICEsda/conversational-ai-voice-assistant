"""Speech-to-text module using Whisper"""
import tempfile
import torch
import soundfile as sf
from faster_whisper import WhisperModel
from config import SAMPLE_RATE


class SpeechToText:
    """Handles speech-to-text transcription using Whisper"""

    def __init__(self, model_size: str = None):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        from config import WHISPER_MODEL_SIZE
        self.model_size = model_size or getattr(
            __import__('config'), 'WHISPER_MODEL_SIZE', 'base'
        )
        self._load_whisper()

    def _load_whisper(self):
        """Load Whisper model"""
        print(f"Loading Whisper ({self.model_size})...")
        compute_type = "float16" if self.device == "cuda" else "float32"
        self.whisper = WhisperModel(self.model_size, device=self.device, compute_type=compute_type)
        print(f"✅ Whisper ({self.model_size}) loaded\n")
    
    def transcribe(self, audio):
        """Transcribe audio to text"""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, audio, SAMPLE_RATE)
            segments, _ = self.whisper.transcribe(tmp.name)
            return " ".join(seg.text for seg in segments).strip()
    
    def get_device(self):
        """Get current device being used"""
        return self.device
