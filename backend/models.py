"""Pydantic models for API request/response schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AssistantState(str, Enum):
    """Voice assistant state machine states"""
    IDLE = "idle"
    LISTENING = "listening"
    RECORDING = "recording"
    TRANSCRIBING = "transcribing"
    THINKING = "thinking"
    RESPONDING = "responding"
    ERROR = "error"


class EventType(str, Enum):
    """WebSocket event types"""
    STATE_CHANGE = "state_change"
    HOTWORD_DETECTED = "hotword_detected"
    RECORDING_START = "recording_start"
    RECORDING_COMPLETE = "recording_complete"
    TRANSCRIPTION = "transcription"
    LLM_TOKEN = "llm_token"
    LLM_COMPLETE = "llm_complete"
    ERROR = "error"
    METRICS = "metrics"


class AssistantStatus(BaseModel):
    """Current status of the voice assistant"""
    state: AssistantState
    message: str
    is_running: bool = False
    last_error: Optional[str] = None
    
    class Config:
        use_enum_values = True


class Config(BaseModel):
    """LLM and assistant configuration"""
    lm_studio_url: str
    model_name: str
    system_prompt: str
    max_tokens: int = Field(ge=1, le=4096)
    temperature: float = Field(ge=0.0, le=2.0)
    hotword_name: str
    sample_rate: int
    record_seconds: int
    enable_streaming: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "lm_studio_url": "http://192.168.1.141:1234",
                "model_name": "mistralai/mistral-7b-instruct-v0.3",
                "system_prompt": "You are a helpful voice assistant.",
                "max_tokens": 150,
                "temperature": 0.7,
                "hotword_name": "Hey Dice",
                "sample_rate": 16000,
                "record_seconds": 5,
                "enable_streaming": True
            }
        }


class ConfigUpdate(BaseModel):
    """Partial config update (all fields optional)"""
    lm_studio_url: Optional[str] = None
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = Field(None, ge=1, le=4096)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    record_seconds: Optional[int] = None
    enable_streaming: Optional[bool] = None


class SystemMetrics(BaseModel):
    """System resource usage metrics"""
    cpu_percent: float
    cpu_temp: Optional[float] = None
    cpu_freq: Optional[float] = None
    ram_used_gb: float
    ram_total_gb: float
    ram_percent: float
    disk_read_mb: float
    disk_write_mb: float
    gpu_percent: Optional[float] = None
    gpu_temp: Optional[float] = None
    gpu_memory_used_gb: Optional[float] = None
    gpu_memory_total_gb: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class TimingMetrics(BaseModel):
    """Timing metrics for voice assistant pipeline"""
    hotword_latency_ms: Optional[float] = None
    recording_duration_ms: Optional[float] = None
    transcription_time_ms: Optional[float] = None
    llm_first_token_ms: Optional[float] = None
    llm_total_time_ms: Optional[float] = None
    llm_tokens_per_second: Optional[float] = None
    total_latency_ms: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class MetricsData(BaseModel):
    """Combined metrics data"""
    system: SystemMetrics
    timing: Optional[TimingMetrics] = None


class MetricsHistory(BaseModel):
    """Historical metrics data"""
    system_history: List[SystemMetrics]
    timing_history: List[TimingMetrics]
    

class Event(BaseModel):
    """WebSocket event message"""
    type: EventType
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        use_enum_values = True


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.now)
