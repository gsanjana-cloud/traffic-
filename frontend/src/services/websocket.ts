import { SimulationState } from '../types/traffic';

type StateCallback = (state: SimulationState) => void;

class TrafficWebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private onStateUpdate: StateCallback | null = null;
  private isConnecting = false;
  private reconnectTimeout: number | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/traffic`;
  }

  public connect(callback: StateCallback) {
    this.onStateUpdate = callback;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if ((payload.type === 'SIMULATION_TICK' || payload.type === 'INITIAL_STATE') && payload.data) {
            if (this.onStateUpdate) {
              this.onStateUpdate(payload.data);
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      this.socket.onclose = () => {
        this.socket = null;
        this.isConnecting = false;
        // Auto-reconnect after 2 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect(callback);
          }, 2000);
        }
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch (err) {
      this.isConnecting = false;
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new TrafficWebSocketClient();
