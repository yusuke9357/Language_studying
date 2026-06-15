// src/services/geminiLive.ts

export type LiveSessionState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

export interface GeminiLiveConfig {
  apiKey: string;
  systemInstruction: string;
  voiceName?: string;
  volume?: number;
}

export class GeminiLiveService {
  private socket: WebSocket | null = null;
  private state: LiveSessionState = 'idle';
  private outputWorkletNode: AudioWorkletNode | null = null;
  
  // Callbacks
  public onStateChange: (state: LiveSessionState) => void = () => {};
  public onTextMessage: (text: string) => void = () => {};
  public onInterrupt: () => void = () => {};
  public onError: (err: string) => void = () => {};

  constructor() {}

  public setOutputNode(node: AudioWorkletNode | null) {
    this.outputWorkletNode = node;
  }

  public getState(): LiveSessionState {
    return this.state;
  }

  private updateState(newState: LiveSessionState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  /**
   * Connect to Gemini Live API WebSocket endpoint
   */
  public connect(config: GeminiLiveConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.disconnect();
      }

      this.updateState('connecting');
      const model = 'models/gemini-2.0-flash-exp'; // Use Gemini 2.0 Multimodal Live API model
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;

      try {
        this.socket = new WebSocket(url);
      } catch (err: any) {
        this.updateState('error');
        this.onError(`WebSocket creation failed: ${err.message}`);
        reject(err);
        return;
      }

      this.socket.onopen = () => {
        console.log('Gemini Live API connection established.');
        this.updateState('connected');
        
        // 1. Send the initialization setup message immediately
        const setupMessage = {
          setup: {
            model: model,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: config.voiceName || "Aoede" // Choose Aoede, Charon, Fenrir, Kore, Puck
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: config.systemInstruction }]
            }
          }
        };

        this.sendJson(setupMessage);
        
        // Push initial volume parameter to output node if exists
        if (this.outputWorkletNode && config.volume !== undefined) {
          this.outputWorkletNode.port.postMessage({ type: 'volume', value: config.volume });
        }
        
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.socket.onerror = (event) => {
        console.error('Gemini Live WebSocket error:', event);
        this.updateState('error');
        this.onError('WebSocket connection error occurred.');
      };

      this.socket.onclose = (event) => {
        console.log('Gemini Live WebSocket closed:', event.code, event.reason);
        this.updateState('idle');
      };
    });
  }

  /**
   * Disconnect and clear resources
   */
  public disconnect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.clearPlaybackQueue();
    this.updateState('idle');
  }

  /**
   * Send text instruction to trigger questions or send commands
   */
  public sendTextMessage(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send text message, WebSocket not connected.');
      return;
    }

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text: text }]
        }],
        turnComplete: true
      }
    };
    this.sendJson(message);
  }

  /**
   * Send microphone PCM16 audio chunk
   */
  public sendAudioChunk(arrayBuffer: ArrayBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Convert ArrayBuffer to Base64
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm',
          data: base64Data
        }]
      }
    };

    this.sendJson(message);
  }

  /**
   * Set playback volume dynamically (0.0 to 1.0)
   */
  public setVolume(volume: number) {
    if (this.outputWorkletNode) {
      this.outputWorkletNode.port.postMessage({ type: 'volume', value: volume });
    }
  }

  /**
   * Clear target playback node queue immediately
   */
  public clearPlaybackQueue() {
    if (this.outputWorkletNode) {
      this.outputWorkletNode.port.postMessage({ type: 'reset' });
    }
  }

  private sendJson(payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  /**
   * Handle incoming WebSocket messages from Gemini
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      // 1. Detect server-side interruption (user spoke over the model)
      if (data.interrupted) {
        console.log('Gemini Live API: Model was interrupted by the user.');
        this.clearPlaybackQueue();
        this.updateState('listening');
        this.onInterrupt();
        return;
      }

      // 2. Extract Server Turn content (Text or Audio)
      if (data.serverContent) {
        const parts = data.serverContent.modelTurn?.parts || [];
        
        for (const part of parts) {
          // Handle Text Response if any
          if (part.text) {
            this.onTextMessage(part.text);
          }
          
          // Handle Audio Output Response
          if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
            const base64Audio = part.inlineData.data;
            const audioBuffer = this.base64ToArrayBuffer(base64Audio);
            
            // Send the raw PCM chunk to output AudioWorklet for speaker playback
            if (this.outputWorkletNode) {
              this.updateState('speaking');
              this.outputWorkletNode.port.postMessage(audioBuffer, [audioBuffer]);
            }
          }
        }

        // Check if model's turn is finished
        if (data.serverContent.turnComplete) {
          console.log('Gemini Live API: Model finished speaking turn.');
          this.updateState('listening');
        }
      }
    } catch (err) {
      console.error('Failed to parse Gemini Live API response:', err);
    }
  }

  /**
   * Convert Base64 back to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Single instance export
export const geminiLiveService = new GeminiLiveService();
