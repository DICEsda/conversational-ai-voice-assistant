"""Main voice assistant application"""
import warnings
import torch
from STT.hotword_detector import HotwordDetector
from STT.speech_to_text import SpeechToText
from LMStudio_LLMClient.llm_client import LLMClient
from STT.audio_recorder import AudioRecorder
from config import KEYWORD_NAME, LM_STUDIO_URL

warnings.filterwarnings('ignore')


class VoiceAssistant:
    """Main Voice Assistant orchestrator"""
    
    def __init__(self):
        self._print_startup_info()
        self.hotword = HotwordDetector()
        self.stt = SpeechToText()
        self.llm = LLMClient()
        self.recorder = AudioRecorder()
    
    def _print_startup_info(self):
        """Print system information"""
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"\U0001f5a5\ufe0f Device: {device}")
        if device == "cuda":
            print(f"🎮 GPU: {torch.cuda.get_device_name(0)}")
            print(f"💾 VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB\n")
        else:
            print()
    
    def run(self):
        """Main loop"""
        print("=" * 60)
        print("🎙️ Voice Assistant Ready!")
        print(f"📢 Hotword: '{KEYWORD_NAME}'")
        print(f"🧠 LLM: {LM_STUDIO_URL}")
        print(f"🎯 Whisper: {self.stt.get_device()}")
        print("=" * 60 + "\n")
        
        try:
            while True:
                # Listen for hotword
                if not self.hotword.listen():
                    break
                
                # Record audio
                audio = self.recorder.record()
                
                # Validate audio
                if not self.recorder.is_audio_valid(audio):
                    print("⚠️ Audio too quiet\n")
                    continue
                
                # Transcribe
                print("🔄 Transcribing...")
                text = self.stt.transcribe(audio)
                
                if not text:
                    print("⚠️ No speech detected\n")
                    continue
                
                print(f"🧑 You: {text}")
                
                # Query LLM
                print("🤔 Thinking...")
                reply = self.llm.query(text)
                
                # Display response
                if not reply.startswith("Error:"):
                    print(f"🤖 Assistant: {reply}\n\n")
                else:
                    print(f"❌ {reply}\n\n")
        
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
        finally:
            self.hotword.cleanup()


if __name__ == "__main__":
    assistant = VoiceAssistant()
    assistant.run()
