"""Performance metrics collection and monitoring"""
import psutil
import time
from collections import deque
from datetime import datetime
from typing import Optional, List
from threading import Thread, Lock
from backend.models import SystemMetrics, TimingMetrics

# Try to import GPU monitoring (optional)
try:
    import pynvml
    NVIDIA_GPU_AVAILABLE = True
except ImportError:
    NVIDIA_GPU_AVAILABLE = False


class MetricsCollector:
    """Collects system and timing metrics for the voice assistant"""
    
    def __init__(self, history_seconds: int = 60, collection_interval: float = 0.5):
        """
        Initialize metrics collector
        
        Args:
            history_seconds: Number of seconds of history to keep
            collection_interval: Time between metric collections (seconds)
        """
        self.history_seconds = history_seconds
        self.collection_interval = collection_interval
        self.max_samples = int(history_seconds / collection_interval)
        
        # Circular buffers for historical data
        self.system_history: deque = deque(maxlen=self.max_samples)
        self.timing_history: deque = deque(maxlen=100)  # Keep last 100 requests
        
        # Thread control
        self._running = False
        self._thread: Optional[Thread] = None
        self._lock = Lock()
        
        # Current timing metrics (for active request)
        self._current_timing: Optional[TimingMetrics] = None
        
        # GPU initialization
        self.gpu_available = False
        self.gpu_handle = None
        if NVIDIA_GPU_AVAILABLE:
            try:
                pynvml.nvmlInit()
                self.gpu_handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                self.gpu_available = True
            except Exception:
                pass
        
        # Disk I/O tracking
        self._last_disk_io = psutil.disk_io_counters()
        self._last_disk_time = time.time()
    
    def start(self):
        """Start collecting metrics in background thread"""
        if self._running:
            return
        
        self._running = True
        self._thread = Thread(target=self._collection_loop, daemon=True)
        self._thread.start()
    
    def stop(self):
        """Stop collecting metrics"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        
        if self.gpu_available:
            try:
                pynvml.nvmlShutdown()
            except Exception:
                pass
    
    def _collection_loop(self):
        """Background loop for collecting system metrics"""
        while self._running:
            try:
                metrics = self._collect_system_metrics()
                with self._lock:
                    self.system_history.append(metrics)
            except Exception:
                pass  # Silently skip if collection fails
            
            time.sleep(self.collection_interval)
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system resource metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_freq = psutil.cpu_freq()
        cpu_freq_mhz = cpu_freq.current if cpu_freq else None
        
        # Try to get CPU temperature (platform-dependent)
        cpu_temp = None
        try:
            temps = psutil.sensors_temperatures()
            if 'coretemp' in temps:
                cpu_temp = temps['coretemp'][0].current
            elif 'cpu_thermal' in temps:
                cpu_temp = temps['cpu_thermal'][0].current
        except (AttributeError, KeyError):
            pass
        
        # RAM metrics
        ram = psutil.virtual_memory()
        ram_used_gb = ram.used / (1024 ** 3)
        ram_total_gb = ram.total / (1024 ** 3)
        ram_percent = ram.percent
        
        # Disk I/O metrics (calculate rates)
        current_disk_io = psutil.disk_io_counters()
        current_time = time.time()
        time_delta = current_time - self._last_disk_time
        
        if time_delta > 0:
            read_mb = (current_disk_io.read_bytes - self._last_disk_io.read_bytes) / (1024 ** 2) / time_delta
            write_mb = (current_disk_io.write_bytes - self._last_disk_io.write_bytes) / (1024 ** 2) / time_delta
        else:
            read_mb = write_mb = 0.0
        
        self._last_disk_io = current_disk_io
        self._last_disk_time = current_time
        
        # GPU metrics (if available)
        gpu_percent = None
        gpu_temp = None
        gpu_memory_used_gb = None
        gpu_memory_total_gb = None
        
        if self.gpu_available and self.gpu_handle:
            try:
                gpu_util = pynvml.nvmlDeviceGetUtilizationRates(self.gpu_handle)
                gpu_percent = float(gpu_util.gpu)
                
                gpu_temp = float(pynvml.nvmlDeviceGetTemperature(self.gpu_handle, pynvml.NVML_TEMPERATURE_GPU))
                
                gpu_mem = pynvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
                gpu_memory_used_gb = gpu_mem.used / (1024 ** 3)
                gpu_memory_total_gb = gpu_mem.total / (1024 ** 3)
            except Exception:
                pass
        
        return SystemMetrics(
            cpu_percent=cpu_percent,
            cpu_temp=cpu_temp,
            cpu_freq=cpu_freq_mhz,
            ram_used_gb=ram_used_gb,
            ram_total_gb=ram_total_gb,
            ram_percent=ram_percent,
            disk_read_mb=read_mb,
            disk_write_mb=write_mb,
            gpu_percent=gpu_percent,
            gpu_temp=gpu_temp,
            gpu_memory_used_gb=gpu_memory_used_gb,
            gpu_memory_total_gb=gpu_memory_total_gb,
            timestamp=datetime.now()
        )
    
    def get_latest_system_metrics(self) -> Optional[SystemMetrics]:
        """Get the most recent system metrics"""
        with self._lock:
            if self.system_history:
                return self.system_history[-1]
        return None
    
    def get_system_history(self) -> List[SystemMetrics]:
        """Get all historical system metrics"""
        with self._lock:
            return list(self.system_history)
    
    def start_timing(self):
        """Start timing a new request"""
        self._current_timing = TimingMetrics()
    
    def record_hotword_latency(self, latency_ms: float):
        """Record hotword detection latency"""
        if self._current_timing:
            self._current_timing.hotword_latency_ms = latency_ms
    
    def record_recording_duration(self, duration_ms: float):
        """Record audio recording duration"""
        if self._current_timing:
            self._current_timing.recording_duration_ms = duration_ms
    
    def record_transcription_time(self, time_ms: float):
        """Record transcription processing time"""
        if self._current_timing:
            self._current_timing.transcription_time_ms = time_ms
    
    def record_llm_timing(self, first_token_ms: Optional[float], total_time_ms: float, tokens_per_second: Optional[float]):
        """Record LLM inference timing"""
        if self._current_timing:
            self._current_timing.llm_first_token_ms = first_token_ms
            self._current_timing.llm_total_time_ms = total_time_ms
            self._current_timing.llm_tokens_per_second = tokens_per_second
    
    def finish_timing(self):
        """Finish timing and calculate total latency"""
        if self._current_timing:
            # Calculate total latency
            total = 0.0
            if self._current_timing.hotword_latency_ms:
                total += self._current_timing.hotword_latency_ms
            if self._current_timing.recording_duration_ms:
                total += self._current_timing.recording_duration_ms
            if self._current_timing.transcription_time_ms:
                total += self._current_timing.transcription_time_ms
            if self._current_timing.llm_total_time_ms:
                total += self._current_timing.llm_total_time_ms
            
            self._current_timing.total_latency_ms = total
            self._current_timing.timestamp = datetime.now()
            
            # Add to history
            with self._lock:
                self.timing_history.append(self._current_timing)
            
            self._current_timing = None
    
    def get_timing_history(self) -> List[TimingMetrics]:
        """Get all historical timing metrics"""
        with self._lock:
            return list(self.timing_history)
    
    def get_latest_timing(self) -> Optional[TimingMetrics]:
        """Get the most recent timing metrics"""
        with self._lock:
            if self.timing_history:
                return self.timing_history[-1]
        return None
