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
        
        // Apply Glow Effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';

        const drawWave = (color, amplitude, speed, offset) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;

          const points = [];
          const segments = 12;
          const segmentWidth = canvas.width / segments;

          // Start point
          points.push({ x: 0, y: canvas.height / 2 });

          for (let i = 1; i < segments; i++) {
            // Sample frequency bin data dynamically
            const dataIdx = Math.floor((i / segments) * bufferLength);
            const frequencyVal = (this.dataArray[dataIdx] || 0) / 255; // Normalize 0..1
            
            const x = i * segmentWidth;
            // Time index for sine phase oscillation
            const time = Date.now() * 0.003 * speed + offset + i;
            const waveValue = Math.sin(time) * amplitude * (0.2 + frequencyVal * 0.8);
            
            // Hanning Window to taper waves smoothly near edges
            const edgeDamp = Math.sin((i / segments) * Math.PI);
            const y = canvas.height / 2 + waveValue * edgeDamp;
            
            points.push({ x, y });
          }

          // End point
          points.push({ x: canvas.width, y: canvas.height / 2 });

          // Draw bezier curve through points
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
          ctx.stroke();
        };

        // Draw 3 layers of glowing waves
        drawWave('rgba(6, 182, 212, 0.8)', 22, 1.2, 0);          // Secondary (Cyan)
        drawWave('rgba(139, 92, 246, 0.6)', 16, 0.8, Math.PI / 2); // Primary (Violet)
        drawWave('rgba(249, 115, 22, 0.4)', 10, 1.5, Math.PI);     // Accent (Orange)
        
        // Reset shadow
        ctx.shadowBlur = 0;
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
      
      // Apply Glow Effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';

      const drawWave = (color, amplitude, speed, offset) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        const points = [];
        const segments = 12;
        const segmentWidth = canvas.width / segments;

        // Start point
        points.push({ x: 0, y: canvas.height / 2 });

        for (let i = 1; i < segments; i++) {
          const x = i * segmentWidth;
          const time = phase * speed + offset + i;
          // Simulated animation without microphone data
          const waveValue = Math.sin(time) * amplitude;
          
          // Hanning Window to taper waves smoothly near edges
          const edgeDamp = Math.sin((i / segments) * Math.PI);
          const y = canvas.height / 2 + waveValue * edgeDamp;
          
          points.push({ x, y });
        }

        // End point
        points.push({ x: canvas.width, y: canvas.height / 2 });

        // Draw bezier curve through points
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
      };

      // Draw 3 layers of glowing waves
      drawWave('rgba(6, 182, 212, 0.8)', 18, 0.12, 0);
      drawWave('rgba(139, 92, 246, 0.6)', 12, 0.08, Math.PI / 2);
      drawWave('rgba(249, 115, 22, 0.4)', 8, 0.15, Math.PI);

      phase += 1;
      
      // Reset shadow
      ctx.shadowBlur = 0;
    };
    
    drawSim();
  }
};
window.SpeechManager = SpeechManager;
