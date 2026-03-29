"""Voice assistant service wrapper for API integration"""
import threading
import time
import warnings
from typing import Optional, Callable, Any
from queue import Queue
import torch

from STT.hotword_detector import HotwordDetector
from STT.speech_to_text import SpeechToText
from LMStudio_LLMClient.llm_client import LLMClient
from STT.audio_recorder import AudioRecorder
from backend.models import AssistantState, EventType
from backend.metrics_collector import MetricsCollector
from config import KEYWORD_NAME

warnings.filterwarnings('ignore')


class VoiceAssistantService:
    """
    Threaded voice assistant service that emits events for GUI integration
    """
    
    def __init__(self, metrics_collector: MetricsCollector, event_callback: Optional[Callable] = None):
        """
        Initialize the voice assistant service
        
        Args:
            metrics_collector: MetricsCollector instance for performance tracking
            event_callback: Function to call when events occur (for WebSocket emission)
        """
        self.metrics = metrics_collector
        self.event_callback = event_callback
        
        # State management
        self._state = AssistantState.IDLE
        self._state_lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        
        # Voice assistant components
        self.hotword: Optional[HotwordDetector] = None
        self.stt: Optional[SpeechToText] = None
        self.llm: Optional[LLMClient] = None
        self.recorder = AudioRecorder()
        
        # Message queue for last exchange
        self.last_user_query: Optional[str] = None
        self.last_assistant_response: Optional[str] = None
        
        # Dynamic config (can be updated via API)
        self.temperature: Optional[float] = None
        self.max_tokens: Optional[int] = None
    
    def _emit_event(self, event_type: EventType, data: Optional[dict] = None):
        """Emit an event to the callback (WebSocket)"""
        if self.event_callback:
            try:
                print(f"📡 Emitting event: {event_type.value} - {data}")
                self.event_callback(event_type, data or {})
            except Exception as e:
                print(f"❌ Failed to emit event {event_type.value}: {e}")
    
    def _set_state(self, new_state: AssistantState, message: str = ""):
        """Thread-safe state update with event emission"""
        with self._state_lock:
            self._state = new_state
        
        self._emit_event(EventType.STATE_CHANGE, {
            "state": new_state.value,
            "message": message
        })
    
    def get_state(self) -> AssistantState:
        """Get current state"""
        with self._state_lock:
            return self._state
    
    def is_running(self) -> bool:
        """Check if service is running"""
        return self._running
    
    def start(self):
        """Start the voice assistant in a background thread"""
        if self._running:
            return  # Already running
        
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
    
    def stop(self):
        """Stop the voice assistant"""
        self._running = False
        self._set_state(AssistantState.IDLE, "Assistant stopped")
        
        if self._thread:
            self._thread.join(timeout=2.0)
        
        # Cleanup
        if self.hotword:
            try:
                self.hotword.cleanup()
            except Exception:
                pass
    
    def _initialize_components(self):
        """Initialize voice assistant components (done in thread)"""
        try:
            self._set_state(AssistantState.IDLE, "Initializing components...")
            
            # Initialize hotword detector
            self.hotword = HotwordDetector()
            
            # Initialize speech-to-text
            self.stt = SpeechToText()
            
            # Initialize LLM client
            self.llm = LLMClient()
            
            self._set_state(AssistantState.IDLE, f"Ready! Listening for '{KEYWORD_NAME}'...")
            
        except Exception as e:
            self._set_state(AssistantState.ERROR, f"Initialization failed: {e}")
            self._running = False
    
    def _run_loop(self):
        """Main voice assistant loop running in background thread"""
        # Initialize components
        self._initialize_components()
        
        if not self._running:
            return  # Initialization failed
        
        # Main loop
        while self._running:
            try:
                # Start timing for this request
                self.metrics.start_timing()
                request_start_time = time.time()
                
                # Phase 1: Listen for hotword
                self._set_state(AssistantState.LISTENING, f"Listening for '{KEYWORD_NAME}'...")
                
                hotword_start = time.time()
                hotword_detected = self.hotword.listen()
                hotword_time = (time.time() - hotword_start) * 1000  # Convert to ms
                
                if not hotword_detected or not self._running:
                    break  # User interrupted or hotword listen failed
                
                # Record hotword detection time
                self.metrics.record_hotword_latency(hotword_time)
                
                # Emit hotword detected event
                self._emit_event(EventType.HOTWORD_DETECTED, {
                    "latency_ms": hotword_time
                })
                
                # Phase 2: Record audio
                self._set_state(AssistantState.RECORDING, "Recording...")
                self._emit_event(EventType.RECORDING_START)
                
                recording_start = time.time()
                audio = self.recorder.record()
                recording_time = (time.time() - recording_start) * 1000
                
                self.metrics.record_recording_duration(recording_time)
                self._emit_event(EventType.RECORDING_COMPLETE, {
                    "duration_ms": recording_time
                })
                
                # Validate audio
                if not self.recorder.is_audio_valid(audio):
                    self._emit_event(EventType.ERROR, {
                        "message": "Audio too quiet, please speak louder"
                    })
                    self.metrics.finish_timing()
                    continue
                
                # Phase 3: Transcribe
                self._set_state(AssistantState.TRANSCRIBING, "Transcribing...")
                
                transcription_start = time.time()
                text = self.stt.transcribe(audio)
                transcription_time = (time.time() - transcription_start) * 1000
                
                self.metrics.record_transcription_time(transcription_time)
                
                if not text:
                    self._emit_event(EventType.ERROR, {
                        "message": "No speech detected"
                    })
                    self.metrics.finish_timing()
                    continue
                
                # Store user query
                self.last_user_query = text
                
                # Emit transcription
                self._emit_event(EventType.TRANSCRIPTION, {
                    "text": text,
                    "time_ms": transcription_time
                })
                
                # Phase 4: Query LLM with streaming
                self._set_state(AssistantState.THINKING, "Thinking...")
                
                llm_start = time.time()
                first_token_time = None
                full_response = ""
                token_count = 0
                
                self._set_state(AssistantState.RESPONDING, "Responding...")
                
                try:
                    for token in self.llm.query_stream(text, self.temperature, self.max_tokens):
                        if not self._running:
                            break
                        
                        # Record first token timing
                        if first_token_time is None:
                            first_token_time = (time.time() - llm_start) * 1000
                        
                        full_response += token
                        token_count += 1
                        
                        # Emit token for real-time streaming
                        self._emit_event(EventType.LLM_TOKEN, {
                            "token": token
                        })
                
                except Exception as e:
                    self._emit_event(EventType.ERROR, {
                        "message": f"LLM error: {str(e)}"
                    })
                    self.metrics.finish_timing()
                    continue
                
                llm_total_time = (time.time() - llm_start) * 1000
                tokens_per_second = (token_count / (llm_total_time / 1000)) if llm_total_time > 0 else None
                
                self.metrics.record_llm_timing(first_token_time, llm_total_time, tokens_per_second)
                
                # Store assistant response
                self.last_assistant_response = full_response
                
                # Emit complete response
                self._emit_event(EventType.LLM_COMPLETE, {
                    "text": full_response,
                    "time_ms": llm_total_time,
                    "tokens_per_second": tokens_per_second
                })
                
                # Finish timing
                self.metrics.finish_timing()
                
                # Back to listening
                self._set_state(AssistantState.LISTENING, f"Listening for '{KEYWORD_NAME}'...")
                
            except Exception as e:
                self._emit_event(EventType.ERROR, {
                    "message": f"Unexpected error: {str(e)}"
                })
                self._set_state(AssistantState.ERROR, str(e))
                time.sleep(1)  # Prevent rapid error loop
                if self._running:
                    self._set_state(AssistantState.LISTENING, f"Listening for '{KEYWORD_NAME}'...")
        
        # Cleanup on exit
        self._set_state(AssistantState.IDLE, "Assistant stopped")
    
    def update_config(self, temperature: Optional[float] = None, max_tokens: Optional[int] = None):
        """Update LLM configuration on the fly"""
        if temperature is not None:
            self.temperature = temperature
        if max_tokens is not None:
            self.max_tokens = max_tokens
