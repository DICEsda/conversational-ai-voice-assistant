import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { api } from '../../services/api';
import type { SystemMetrics } from '../../types/assistant';

type MetricType = 'GPU' | 'CPU' | 'RAM' | 'DISK';

interface ChartDataPoint {
  name: string;
  value: number;
}

export default function GraphsPage() {
  const navigate = useNavigate();
  const [opacity, setOpacity] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('GPU');
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics on mount and set up polling
  useEffect(() => {
    fetchMetrics();
    
    // Fade in content
    setTimeout(() => setOpacity(1), 50);
    
    // Poll metrics every 2 seconds
    const interval = setInterval(fetchMetrics, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const history = await api.getMetricsHistory();
      setMetricsHistory(history.system_history);
      
      if (history.system_history.length > 0) {
        setLatestMetrics(history.system_history[history.system_history.length - 1]);
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load metrics');
      setLoading(false);
    }
  };

  const getChartData = (): ChartDataPoint[] => {
    if (metricsHistory.length === 0) return [];
    
    return metricsHistory.map((metrics, index) => {
      let value = 0;
      
      switch (selectedMetric) {
        case 'GPU':
          value = metrics.gpu_percent || 0;
          break;
        case 'CPU':
          value = metrics.cpu_percent;
          break;
        case 'RAM':
          value = metrics.ram_percent;
          break;
        case 'DISK':
          // Average of read and write as percentage (arbitrary scale)
          value = Math.min(100, (metrics.disk_read_mb + metrics.disk_write_mb) / 10);
          break;
      }
      
      return {
        name: `${index}s`,
        value: value
      };
    });
  };

  const getMetrics = () => {
    if (!latestMetrics) {
      return { label1: 'N/A', label2: 'N/A', label3: 'N/A', label4: 'N/A' };
    }

    switch (selectedMetric) {
      case 'GPU':
        return {
          label1: 'temp',
          value1: latestMetrics.gpu_temp ? `${latestMetrics.gpu_temp.toFixed(0)}°C` : 'N/A',
          label2: 'memory',
          value2: latestMetrics.gpu_memory_used_gb && latestMetrics.gpu_memory_total_gb
            ? `${latestMetrics.gpu_memory_used_gb.toFixed(1)}/${latestMetrics.gpu_memory_total_gb.toFixed(1)} GB`
            : 'N/A',
          label3: 'usage',
          value3: latestMetrics.gpu_percent ? `${latestMetrics.gpu_percent.toFixed(0)}%` : 'N/A',
          label4: 'available',
          value4: latestMetrics.gpu_percent ? 'Yes' : 'No GPU'
        };
      case 'CPU':
        return {
          label1: 'temp',
          value1: latestMetrics.cpu_temp ? `${latestMetrics.cpu_temp.toFixed(0)}°C` : 'N/A',
          label2: 'freq',
          value2: latestMetrics.cpu_freq ? `${latestMetrics.cpu_freq.toFixed(0)} MHz` : 'N/A',
          label3: 'usage',
          value3: `${latestMetrics.cpu_percent.toFixed(0)}%`,
          label4: 'cores',
          value4: 'Multi'
        };
      case 'RAM':
        return {
          label1: 'used',
          value1: `${latestMetrics.ram_used_gb.toFixed(2)} GB`,
          label2: 'total',
          value2: `${latestMetrics.ram_total_gb.toFixed(2)} GB`,
          label3: 'usage',
          value3: `${latestMetrics.ram_percent.toFixed(0)}%`,
          label4: 'free',
          value4: `${(latestMetrics.ram_total_gb - latestMetrics.ram_used_gb).toFixed(2)} GB`
        };
      case 'DISK':
        return {
          label1: 'read',
          value1: `${latestMetrics.disk_read_mb.toFixed(1)} MB/s`,
          label2: 'write',
          value2: `${latestMetrics.disk_write_mb.toFixed(1)} MB/s`,
          label3: 'total',
          value3: `${(latestMetrics.disk_read_mb + latestMetrics.disk_write_mb).toFixed(1)} MB/s`,
          label4: 'active',
          value4: (latestMetrics.disk_read_mb + latestMetrics.disk_write_mb) > 1 ? 'Yes' : 'No'
        };
      default:
        return { label1: 'N/A', value1: 'N/A', label2: 'N/A', value2: 'N/A', label3: 'N/A', value3: 'N/A', label4: 'N/A', value4: 'N/A' };
    }
  };

  const metrics = getMetrics();
  const chartData = getChartData();

  return (
    <>
      {/* Back button - top left corner */}
      <button 
        className="absolute top-2 left-2 p-1.5 opacity-40 hover:opacity-60 transition-opacity duration-100 z-10"
        aria-label="Back"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-4 h-4 text-gray-700" />
      </button>

      {/* Content */}
      <div 
        className="w-full h-full flex flex-col px-4 py-10 transition-opacity duration-300" 
        style={{ opacity }}
      >
        {/* Toggle buttons */}
        <div className="flex gap-2 mb-4 mt-2">
          {(['GPU', 'CPU', 'RAM', 'DISK'] as MetricType[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
                selectedMetric === metric
                  ? 'bg-orange-400 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {metric}
            </button>
          ))}
        </div>

        {/* Loading/Error states */}
        {loading && (
          <div className="flex items-center justify-center h-32 text-xs text-gray-500">
            Loading metrics...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-red-500">
            <p>{error}</p>
            <p className="text-[10px] text-gray-500 mt-1">Is the backend running?</p>
          </div>
        )}

        {/* Large graph */}
        {!loading && !error && chartData.length > 0 && (
          <>
            <div className="w-full h-32 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#fb923c" 
                    fill="#fed7aa" 
                    strokeWidth={2}
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col">
                <span className="text-xs text-gray-500 uppercase mb-1">
                  {metrics.label1}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {metrics.value1}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col">
                <span className="text-xs text-gray-500 uppercase mb-1">
                  {metrics.label2}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {metrics.value2}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col">
                <span className="text-xs text-gray-500 uppercase mb-1">
                  {metrics.label3}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {metrics.value3}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col">
                <span className="text-xs text-gray-500 uppercase mb-1">
                  {metrics.label4}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {metrics.value4}
                </span>
              </div>
            </div>
          </>
        )}

        {/* No data state */}
        {!loading && !error && chartData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-gray-500">
            Waiting for metrics data...
          </div>
        )}
      </div>
    </>
  );
}
