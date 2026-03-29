"""Audio recording utilities with Voice Activity Detection (VAD)"""
import numpy as np
import sounddevice as sd
from config import SAMPLE_RATE, RECORD_SECONDS


class AudioRecorder:
    """Handles audio recording with optional VAD-based silence detection"""

    def __init__(self):
        # VAD settings (can be overridden via update_vad_config)
        self.vad_enabled = True
        self.silence_threshold = 0.015  # RMS energy below this = silence
        self.silence_duration = 1.5     # Stop after this many seconds of silence
        self.max_duration = 15.0        # Hard cap on recording length
        self.min_duration = 0.5         # Minimum recording length

    def update_vad_config(self, **kwargs):
        """Update VAD settings at runtime"""
        for key in ('vad_enabled', 'silence_threshold', 'silence_duration',
                    'max_duration', 'min_duration'):
            if key in kwargs and kwargs[key] is not None:
                setattr(self, key, kwargs[key])

    def record(self, duration=RECORD_SECONDS):
        """Record audio from microphone, using VAD if enabled"""
        if self.vad_enabled:
            return self._record_vad()
        return self._record_fixed(duration)

    def _record_fixed(self, duration):
        """Fixed-duration recording (original behavior)"""
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

    def _record_vad(self):
        """VAD-based recording: stops on silence after speech is detected"""
        chunk_size = int(SAMPLE_RATE * 0.1)  # 100ms chunks
        max_chunks = int(self.max_duration / 0.1)
        min_chunks = int(self.min_duration / 0.1)
        silence_chunks_needed = int(self.silence_duration / 0.1)

        chunks = []
        speech_detected = False
        silence_count = 0

        print(f"🔴 Recording (VAD, max {self.max_duration}s)...")

        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='float32',
                            blocksize=chunk_size) as stream:
            for i in range(max_chunks):
                data, _ = stream.read(chunk_size)
                chunk = data.squeeze()
                chunks.append(chunk)

                rms = np.sqrt(np.mean(chunk ** 2))

                if rms >= self.silence_threshold:
                    speech_detected = True
                    silence_count = 0
                elif speech_detected:
                    silence_count += 1
                    if silence_count >= silence_chunks_needed and i >= min_chunks:
                        break

        audio = np.concatenate(chunks) if chunks else np.array([], dtype='float32')
        actual_duration = len(audio) / SAMPLE_RATE
        print(f"⏹️ Recording complete ({actual_duration:.1f}s)")
        return audio

    @staticmethod
    def is_audio_valid(audio, threshold=0.01):
        """Check if audio is loud enough"""
        if len(audio) == 0:
            return False
        return np.abs(audio).max() >= threshold
