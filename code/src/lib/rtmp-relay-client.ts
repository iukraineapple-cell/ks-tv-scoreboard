export type RelayStatus = 'connecting' | 'connected' | 'streaming' | 'error' | 'stopped' | 'disconnected';

export interface StreamConfig {
  stream: MediaStream;
  rtmpUrl: string;
  streamKey: string;
}

export class RTMPRelayClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private relayUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private _status: RelayStatus = 'disconnected';
  private currentConfig: StreamConfig | null = null;

  public onStatusChange: ((status: RelayStatus) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor(relayUrl: string) {
    this.relayUrl = relayUrl;
  }

  get status(): RelayStatus {
    return this._status;
  }

  get isStreaming(): boolean {
    return this._status === 'streaming';
  }

  private setStatus(status: RelayStatus) {
    this._status = status;
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.relayUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          
          if (this.currentConfig && !this.isStreaming) {
            // Re-initialize streaming if we reconnected while trying to stream
            this.startStreamingInternal(this.currentConfig).catch(e => {
              if (this.onError) this.onError(`Failed to resume stream: ${e.message}`);
            });
          }
          
          resolve();
        };

        this.ws.onclose = (event) => {
          if (this._status === 'streaming' || this.currentConfig) {
            this.handleDisconnect(event);
          } else {
            this.setStatus('disconnected');
          }
        };

        this.ws.onerror = (error) => {
          if (this.onError) {
            this.onError('WebSocket error occurred');
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'status') {
              if (data.status === 'error' && this.onError) {
                this.onError(data.message || 'Unknown relay error');
                this.stopStreaming();
              }
            }
          } catch (e) {
            // Ignore non-JSON messages if any
          }
        };
      } catch (error: any) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  private handleDisconnect(event: CloseEvent) {
    this.cleanupMediaRecorder();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      this.setStatus('connecting');
      
      setTimeout(() => {
        this.connect().catch(e => {
          console.error('Reconnection failed:', e);
        });
      }, timeout);
    } else {
      this.setStatus('error');
      if (this.onError) {
        this.onError('Connection lost and max reconnect attempts reached.');
      }
      this.stopStreaming();
    }
  }

  public async startStreaming(config: StreamConfig): Promise<void> {
    this.currentConfig = config;
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    
    await this.startStreamingInternal(config);
  }

  private async startStreamingInternal(config: StreamConfig): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    try {
      // 1. Send start message
      this.ws.send(JSON.stringify({
        type: 'start',
        rtmpUrl: config.rtmpUrl,
        streamKey: config.streamKey
      }));

      // 2. Setup MediaRecorder
      const selectedMime = this.getSupportedMimeType();
      if (!selectedMime) {
        throw new Error('No supported video mime type found for MediaRecorder');
      }

      const recorderOptions: MediaRecorderOptions = {
        mimeType: selectedMime,
        videoBitsPerSecond: 2500000, // 2.5 Mbps 720p HD
        audioBitsPerSecond: 128000   // 128 kbps AAC/Opus
      };

      this.mediaRecorder = new MediaRecorder(config.stream, recorderOptions);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        if (this.onError) {
          this.onError(`MediaRecorder error: ${event.error?.message || 'Unknown error'}`);
        }
        this.stopStreaming();
      };

      // 250ms timeslice ensures steady, continuous stream of WebM clusters to FFmpeg
      this.mediaRecorder.start(250);
      this.setStatus('streaming');
      
    } catch (error: any) {
      this.setStatus('error');
      throw error;
    }
  }

  public stopStreaming(): void {
    this.currentConfig = null;
    
    this.cleanupMediaRecorder();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'stop' }));
      } catch (e) {
        // Ignore send errors during shutdown
      }
    }
    
    if (this._status !== 'error') {
      this.setStatus('stopped');
    }
  }

  public disconnect(): void {
    this.stopStreaming();
    
    if (this.ws) {
      // Remove listeners to prevent reconnect logic
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      
      this.ws.close();
      this.ws = null;
    }
    
    this.setStatus('disconnected');
  }

  private cleanupMediaRecorder() {
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {
        // Ignore stop errors
      }
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder = null;
    }
  }

  private getSupportedMimeType(): string | null {
    const types = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return null;
  }
}

export function getRelayServerUrl(): string {
  return import.meta.env.VITE_RELAY_SERVER_URL || `ws://${window.location.hostname}:3001`;
}
