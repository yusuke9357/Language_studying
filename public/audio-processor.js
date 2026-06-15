// public/audio-processor.js

/**
 * AudioWorkletProcessor for capturing microphone input,
 * downsampling it to 16kHz, and converting it to 16-bit linear PCM.
 */
class InputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetSampleRate = 16000;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    // Use only mono (channel 0)
    const channelData = input[0];
    
    // Accumulate samples
    for (let i = 0; i < channelData.length; i++) {
      this.buffer.push(channelData[i]);
    }

    // Downsample when buffer gets large enough to process
    // original rate / target rate = downsample ratio
    const ratio = sampleRate / this.targetSampleRate;
    
    while (this.buffer.length >= channelData.length * ratio) {
      const chunkLength = Math.floor(channelData.length);
      const outputBuffer = new Int16Array(chunkLength);
      
      for (let i = 0; i < chunkLength; i++) {
        // Linear interpolation or simple index sampling
        const origIdx = Math.floor(i * ratio);
        if (origIdx >= this.buffer.length) break;
        
        const sample = this.buffer[origIdx];
        // Scale Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const int16Sample = Math.max(-32768, Math.min(32767, sample < 0 ? sample * 0x8000 : sample * 0x7FFF));
        outputBuffer[i] = int16Sample;
      }

      // Send the Int16Array chunk to the main thread
      this.port.postMessage(outputBuffer.buffer, [outputBuffer.buffer]);

      // Remove processed samples from front of buffer
      const samplesProcessed = Math.floor(chunkLength * ratio);
      this.buffer.splice(0, samplesProcessed);
    }

    return true;
  }
}

registerProcessor('input-processor', InputProcessor);


/**
 * AudioWorkletProcessor for playing back received 24kHz 16-bit PCM chunks from Gemini.
 * Implements a ring buffer queue to achieve smooth, jitter-free playback.
 */
class OutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.volume = 0.9; // Default volume scaling factor
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'volume') {
        this.volume = event.data.value;
      } else if (event.data.type === 'reset') {
        this.queue = [];
      } else if (event.data instanceof ArrayBuffer) {
        // Convert received Int16Array PCM data to Float32Array
        const int16Array = new Int16Array(event.data);
        const float32Array = new Float32Array(int16Array.length);
        
        for (let i = 0; i < int16Array.length; i++) {
          // Normalize back to Float32 [-1.0, 1.0]
          const rawSample = int16Array[i] / 32768.0;
          // Apply volume scaling inside Worklet to prevent clipping / distortion
          float32Array[i] = rawSample * this.volume;
        }
        
        // Push processed Float32 chunk to queue
        this.queue.push(float32Array);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channelLeft = output[0];
    const channelRight = output[1] || output[0]; // Copy to right channel if stereo
    const bufferSize = channelLeft.length;

    let writeCount = 0;

    while (writeCount < bufferSize && this.queue.length > 0) {
      const activeChunk = this.queue[0];
      const samplesAvailable = activeChunk.length;
      const samplesToRead = Math.min(bufferSize - writeCount, samplesAvailable);

      for (let i = 0; i < samplesToRead; i++) {
        const val = activeChunk[i];
        channelLeft[writeCount + i] = val;
        channelRight[writeCount + i] = val;
      }

      writeCount += samplesToRead;

      if (samplesToRead === samplesAvailable) {
        // Current chunk is fully played, drop it
        this.queue.shift();
      } else {
        // Keep remaining portion of the chunk in the queue
        this.queue[0] = activeChunk.subarray(samplesToRead);
      }
    }

    // Zero-fill remaining space in the current output frame if queue is starved (silence)
    if (writeCount < bufferSize) {
      for (let i = writeCount; i < bufferSize; i++) {
        channelLeft[i] = 0;
        channelRight[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor('output-processor', OutputProcessor);
