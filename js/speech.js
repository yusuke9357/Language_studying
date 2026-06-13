/**
 * Speech Module for Callan AI Tutor
 * Handles SpeechSynthesis (TTS) and webkitSpeechRecognition (STT)
 * and microphone audio level visualization.
 */

const SpeechManager = {
  recognition: null,
  isListening: false,
  audioContext: null,
  analyser: null,
  dataArray: null,
  animationFrameId: null,
  mediaStream: null,
  isSpeechSupported: false,

  init() {
    // 1. Check Speech Recognition Support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.isSpeechSupported = true;
    } else {
      console.warn('Speech Recognition API is not supported in this browser.');
    }

    // Check Speech Synthesis Support
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis API is not supported in this browser.');
    }
  },

  /* --- Text to Speech (TTS) --- */

  // Speak text once
  speakOnce(text, options = {}, callback) {
    if (!('speechSynthesis' in window)) {
      if (callback) callback();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Load options from storage or parameters
    const settings = StorageManager.db.settings || {};
    utterance.rate = options.rate || settings.rate || 1.1;
    utterance.pitch = options.pitch || settings.pitch || 1.0;

    // Apply voice if selected
    if (settings.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === settings.voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (callback) callback();
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  },

  // Callan Method: speak the question TWICE with a brief pause
  speakQuestion(text, options = {}, callback) {
    // Speak first time
    this.speakOnce(text, options, () => {
      // Pause 800ms before second delivery
      setTimeout(() => {
        // Speak second time
        this.speakOnce(text, options, callback);
      }, 700);
    });
  },

  cancelSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  // Get available English voices
  getEnglishVoices() {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().filter(voice => 
      voice.lang.startsWith('en-')
    );
  },

  /* --- Speech to Text (STT) --- */

  startListening(onResult, onEnd, onError, canvasElement) {
    if (!this.isSpeechSupported) {
      if (onError) onError('Speech recognition not supported in this browser.');
      return;
    }

    if (this.isListening) return;

    this.isListening = true;
    let finalTranscript = '';

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Send back interim and final values
      if (onResult) {
        onResult(finalTranscript + interimTranscript, event.results[event.results.length - 1].isFinal);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.stopVisualizer();
      if (onEnd) onEnd(finalTranscript.trim());
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.stopVisualizer();
      console.error('Speech recognition error:', event.error);
      if (onError) onError(event.error);
    };

    // Start native recognition
    try {
      this.recognition.start();
      // Start wave visualizer in parallel
      if (canvasElement) {
        this.startVisualizer(canvasElement);
      }
    } catch (e) {
      this.isListening = false;
      console.error('Failed to start recognition:', e);
      if (onError) onError(e.message);
    }
  },

  stopListening() {
    if (!this.isListening || !this.recognition) return;
    this.recognition.stop();
    this.isListening = false;
    this.stopVisualizer();
  },

  /* --- Audio Wave Visualizer --- */

  async startVisualizer(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 50;

    try {
      // Capture microphone audio stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        if (!this.isListening) return;

        this.animationFrameId = requestAnimationFrame(draw);
        this.analyser.getByteFrequencyData(this.dataArray);
        
        ctx.fillStyle = '#0b0a14'; // Background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        // Draw audio spectrum bars with smooth gradients
        for (let i = 0; i < bufferLength; i++) {
          barHeight = this.dataArray[i] / 2.5;
          
          // Apply min height for visual aesthetics when quiet
          if (barHeight < 2) barHeight = 2; 

          // Cyan to purple gradient based on frequency
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, '#8b5cf6');
          gradient.addColorStop(1, '#06b6d4');
          
          ctx.fillStyle = gradient;
          
          // Draw symmetric bars from bottom middle or standard bars
          // Let's do rounded rectangles for a premium feel
          const y = (canvas.height - barHeight) / 2;
          this.drawRoundedRect(ctx, x, y, barWidth - 2, barHeight, 3);

          x += barWidth + 1;
        }
      };

      draw();
    } catch (err) {
      console.warn('Microphone stream visualizer block or failure:', err);
      this.drawSimulatedWave(canvas);
    }
  },

  drawRoundedRect(ctx, x, y, width, height, radius) {
    if (height <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  },

  stopVisualizer() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  },

  // Fallback visualizer if mic permission is blocked or browser does not support Web Audio
  drawSimulatedWave(canvas) {
    const ctx = canvas.getContext('2d');
    let phase = 0;
    
    const drawSim = () => {
      if (!this.isListening) return;
      this.animationFrameId = requestAnimationFrame(drawSim);
      
      ctx.fillStyle = '#0b0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw 3 sine waves
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 2 : 1;
        ctx.strokeStyle = w === 0 ? 'rgba(6, 182, 212, 0.7)' : w === 1 ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.2)';
        
        const amplitude = (3 - w) * 8;
        const frequency = (w + 1) * 0.01;
        
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * frequency + phase) * amplitude * Math.sin(x * 0.003);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      phase += 0.15;
    };
    
    drawSim();
  }
};
window.SpeechManager = SpeechManager;
