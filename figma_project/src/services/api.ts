/**
 * HTTP API client for Voice Assistant backend
 */

import { API_BASE_URL, API_ENDPOINTS } from './config';
import type {
  AssistantStatus,
  Config,
  ConfigUpdate,
  MetricsData,
  MetricsHistory,
  HealthResponse,
} from '../types/assistant';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Check if backend is available
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>(API_ENDPOINTS.health);
  }

  /**
   * Get current assistant status
   */
  async getStatus(): Promise<AssistantStatus> {
    return this.request<AssistantStatus>(API_ENDPOINTS.status);
  }

  /**
   * Start the voice assistant
   */
  async startAssistant(): Promise<{ status: string; message: string }> {
    return this.request(API_ENDPOINTS.startAssistant, {
      method: 'POST',
    });
  }

  /**
   * Stop the voice assistant
   */
  async stopAssistant(): Promise<{ status: string; message: string }> {
    return this.request(API_ENDPOINTS.stopAssistant, {
      method: 'POST',
    });
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<Config> {
    return this.request<Config>(API_ENDPOINTS.getConfig);
  }

  /**
   * Update configuration
   */
  async updateConfig(config: ConfigUpdate): Promise<{ status: string; changes: string[]; message: string }> {
    return this.request(API_ENDPOINTS.updateConfig, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<MetricsData> {
    return this.request<MetricsData>(API_ENDPOINTS.getMetrics);
  }

  /**
   * Get historical metrics
   */
  async getMetricsHistory(): Promise<MetricsHistory> {
    return this.request<MetricsHistory>(API_ENDPOINTS.getMetricsHistory);
  }
}

// Export singleton instance
export const api = new APIClient();
