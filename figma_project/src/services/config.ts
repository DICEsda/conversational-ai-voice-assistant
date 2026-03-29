/**
 * API configuration constants
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/api/events';

export const API_ENDPOINTS = {
  health: '/api/health',
  status: '/api/status',
  startAssistant: '/api/assistant/start',
  stopAssistant: '/api/assistant/stop',
  getConfig: '/api/config',
  updateConfig: '/api/config',
  getMetrics: '/api/metrics',
  getMetricsHistory: '/api/metrics/history',
  getModels: '/api/models',
  events: '/api/events',
};
