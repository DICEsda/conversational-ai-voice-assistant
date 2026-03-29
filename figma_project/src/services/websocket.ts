/**
 * WebSocket client for real-time events from Voice Assistant backend
 */

import { WS_URL } from './config';
import type { Event, EventType } from '../types/assistant';

type EventHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<EventType | 'all', EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionallyClosed = false;
      
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log(`✅ WebSocket connected to ${this.url}`);
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle pong/keepalive messages
            if (message.type === 'pong' || message.type === 'keepalive') {
              console.debug('Received heartbeat:', message.type);
              return;
            }
            
            // Handle normal events
            console.log('📨 WebSocket message:', message);
            this.handleEvent(message as Event);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('❌ WebSocket disconnected');
          this.stopHeartbeat();
          
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Clear all event handlers
   */
  clearHandlers() {
    this.handlers.clear();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // Send ping every 25 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(event: Event) {
    console.log(`🎯 Handling event: ${event.type}`, event.data);
    
    // Call handlers registered for this specific event type
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      console.log(`  → Found ${typeHandlers.length} handler(s) for ${event.type}`);
      typeHandlers.forEach((handler) => handler(event.data));
    } else {
      console.log(`  ⚠️ No handlers registered for ${event.type}`);
    }

    // Call handlers registered for all events
    const allHandlers = this.handlers.get('all');
    if (allHandlers) {
      allHandlers.forEach((handler) => handler(event));
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: EventType | 'all', handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from event type
   */
  off(eventType: EventType | 'all', handler: EventHandler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Debug: List all registered handlers
   */
  debugHandlers(): void {
    console.log('📋 Registered handlers:');
    this.handlers.forEach((handlers, eventType) => {
      console.log(`  ${eventType}: ${handlers.length} handler(s)`);
    });
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
