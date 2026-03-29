/**
 * TypeScript types for Voice Assistant API
 * These match the Python Pydantic models
 */

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'responding'
  | 'speaking'
  | 'error';

export type EventType =
  | 'state_change'
  | 'hotword_detected'
  | 'recording_start'
  | 'recording_complete'
  | 'transcription'
  | 'llm_token'
  | 'llm_complete'
  | 'tts_start'
  | 'tts_complete'
  | 'error'
  | 'metrics';

export interface AssistantStatus {
  state: AssistantState;
  message: string;
  is_running: boolean;
  last_error?: string | null;
}

export interface Config {
  lm_studio_url: string;
  model_name: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  hotword_name: string;
  sample_rate: number;
  record_seconds: number;
  enable_streaming: boolean;
  vad_enabled: boolean;
  vad_silence_duration: number;
  vad_max_duration: number;
  tts_enabled: boolean;
  tts_voice: string;
  whisper_model_size: string;
}

export interface ConfigUpdate {
  lm_studio_url?: string;
  model_name?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  record_seconds?: number;
  enable_streaming?: boolean;
  vad_enabled?: boolean;
  vad_silence_duration?: number;
  vad_max_duration?: number;
  tts_enabled?: boolean;
  tts_voice?: string;
  whisper_model_size?: string;
}

export interface SystemMetrics {
  cpu_percent: number;
  cpu_temp?: number | null;
  cpu_freq?: number | null;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  disk_read_mb: number;
  disk_write_mb: number;
  gpu_percent?: number | null;
  gpu_temp?: number | null;
  gpu_memory_used_gb?: number | null;
  gpu_memory_total_gb?: number | null;
  timestamp: string;
}

export interface TimingMetrics {
  hotword_latency_ms?: number | null;
  recording_duration_ms?: number | null;
  transcription_time_ms?: number | null;
  llm_first_token_ms?: number | null;
  llm_total_time_ms?: number | null;
  llm_tokens_per_second?: number | null;
  total_latency_ms?: number | null;
  timestamp: string;
}

export interface MetricsData {
  system: SystemMetrics;
  timing?: TimingMetrics | null;
}

export interface MetricsHistory {
  system_history: SystemMetrics[];
  timing_history: TimingMetrics[];
}

export interface Event {
  type: EventType;
  data?: Record<string, any>;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ModelsResponse {
  llm_models: string[];
  current_llm_model: string;
  whisper_sizes: string[];
  current_whisper_size: string;
}
