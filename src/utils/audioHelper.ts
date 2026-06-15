// src/utils/audioHelper.ts

class AudioHelper {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private inputWorkletNode: AudioWorkletNode | null = null;
  private outputWorkletNode: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  constructor() {}

  /**
   * Initialize browser AudioContext, load custom processors,
   * hook up microphone stream, and connect nodes.
   */
  public async initAudio(
    onAudioChunk: (chunk: ArrayBuffer) => void
  ): Promise<{ inputNode: AudioWorkletNode; outputNode: AudioWorkletNode; analyser: AnalyserNode }> {
    // 1. Setup AudioContext (explicitly set output sample rate to 24000 for speech synthesis compatibility)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // 2. Request user microphone permissions
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    // 3. Load AudioWorkletProcessor modules from public directory
    try {
      await this.audioCtx.audioWorklet.addModule('/audio-processor.js');
    } catch (err) {
      console.error('Failed to load AudioWorklet module. WebSockets fallback might be required.', err);
      throw new Error('AudioWorklet module failed to load. Make sure browser supports AudioWorklet.');
    }

    // 4. Create AnalyserNode for mic visualizer
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;

    // 5. Instantiate Worklet Nodes
    this.inputWorkletNode = new AudioWorkletNode(this.audioCtx, 'input-processor');
    // For output, we require 24000Hz PCM playback compatibility
    this.outputWorkletNode = new AudioWorkletNode(this.audioCtx, 'output-processor');

    // 6. Connect Mic Stream -> Analyser -> InputWorklet
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.micSource.connect(this.analyserNode);
    this.analyserNode.connect(this.inputWorkletNode);

    // Note: We do NOT connect inputWorkletNode to destination because we don't want to echo the mic!
    
    // 7. Connect OutputWorklet -> Destination (Speakers)
    this.outputWorkletNode.connect(this.audioCtx.destination);

    // 8. Bind microphone input handler to pass chunks to WebSocket client callback
    this.inputWorkletNode.port.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        onAudioChunk(event.data);
      }
    };

    // Make sure AudioContext is active (browsers block initial playback without user interaction)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return {
      inputNode: this.inputWorkletNode,
      outputNode: this.outputWorkletNode,
      analyser: this.analyserNode,
    };
  }

  /**
   * Stop all active streams and close context
   */
  public async stopAudio() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.inputWorkletNode) {
      this.inputWorkletNode.disconnect();
      this.inputWorkletNode = null;
    }

    if (this.outputWorkletNode) {
      this.outputWorkletNode.disconnect();
      this.outputWorkletNode = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }

    this.analyserNode = null;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }
}

export const audioHelper = new AudioHelper();
