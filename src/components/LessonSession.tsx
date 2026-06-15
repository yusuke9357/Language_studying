// src/components/LessonSession.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StorageManager } from '../utils/storage';
import type { QuestionHistoryEntry } from '../utils/storage';
import { CurriculumManager } from '../data/curriculum';
import type { Question } from '../data/curriculum';
import { audioHelper } from '../utils/audioHelper';
import { geminiLiveService } from '../services/geminiLive';
import type { LiveSessionState } from '../services/geminiLive';
import { Volume2, Mic, CheckCircle2, XCircle, AlertCircle, Play, ChevronRight, RotateCcw, Home } from 'lucide-react';

interface LessonSessionProps {
  stage: number;
  lesson: number;
  onQuit: () => void;
}

interface QuestionFeedback {
  isCorrect: boolean;
  callanFeedback: string;
  grammarFeedback: string;
  pronunciationFeedback: string;
}

export const LessonSession: React.FC<LessonSessionProps> = ({ stage, lesson, onQuit }) => {
  // Curriculum Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<QuestionHistoryEntry[]>([]);

  // Timer
  const [startTime] = useState<number>(Date.now());

  // UI States
  const [sessionState, setSessionState] = useState<'connecting' | 'ready' | 'active' | 'completed' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [liveState, setLiveState] = useState<LiveSessionState>('idle');
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [volume, setVolume] = useState(StorageManager.db.settings.volume !== undefined ? StorageManager.db.settings.volume : 0.9);

  // HTML Element Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const activeQuestion = questions[currentIndex];

  // Compile curriculum on mount
  useEffect(() => {
    const qList = CurriculumManager.compileSessionQuestions(stage, lesson);
    setQuestions(qList);
  }, [stage, lesson]);

  // Connect Audio & Gemini Live on mount
  useEffect(() => {
    let active = true;

    const startSession = async () => {
      try {
        const apiKey = StorageManager.db.apiKey;
        if (!apiKey) {
          throw new Error('Gemini APIキーが設定されていません。「設定」画面から登録してください。');
        }

        // 1. Initialize Audio nodes and Worklets
        console.log('Initializing Audio Context...');
        const { outputNode } = await audioHelper.initAudio((chunk) => {
          // Send microphone chunk directly to Gemini
          geminiLiveService.sendAudioChunk(chunk);
        });

        // 2. Set node reference in LiveService for playback routing
        geminiLiveService.setOutputNode(outputNode);

        // Set live service callbacks
        geminiLiveService.onStateChange = (state) => {
          if (active) setLiveState(state);
        };

        geminiLiveService.onInterrupt = () => {
          if (active) {
            console.log('Model interrupted by user voice.');
          }
        };

        geminiLiveService.onTextMessage = (text) => {
          if (!active) return;
          console.log('Tutor raw text response:', text);

          // Try parsing response as evaluation JSON
          // The System Instruction tells Gemini to output evaluation JSON like:
          // {"isCorrect": true, "callanFeedback": "...", "grammarFeedback": "...", "pronunciationFeedback": "..."}
          try {
            // Find JSON-like substring in text responses
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              const jsonStr = text.substring(jsonStart, jsonEnd + 1);
              const evalResult: QuestionFeedback = JSON.parse(jsonStr);
              setFeedback(evalResult);
            }
          } catch (e) {
            // Text is not JSON, might be a regular text statement or feedback fragment
            if (text.toLowerCase().includes('correct')) {
              setFeedback((prev) => prev || {
                isCorrect: true,
                callanFeedback: '正しくフルセンテンスで答えられました！',
                grammarFeedback: '',
                pronunciationFeedback: ''
              });
            } else if (text.toLowerCase().includes('wrong') || text.toLowerCase().includes('repeat') || text.toLowerCase().includes('no,')) {
              setFeedback((prev) => prev || {
                isCorrect: false,
                callanFeedback: '短縮形とフルセンテンスを意識して、もう一度繰り返してください。',
                grammarFeedback: '',
                pronunciationFeedback: ''
              });
            }
          }
        };

        geminiLiveService.onError = (err) => {
          if (active) {
            setErrorMessage(err);
            setSessionState('error');
          }
        };

        // 3. Establish WebSocket connection
        // Set rigid Callan Method prompt instructions
        const systemInstruction = `
You are a strict, robotic, and fast-paced Callan Method English Tutor.
Rules you must strictly follow:
1. The student is practicing English under Callan rules.
2. For each question turn, read the target Question exactly TWICE in a very fast, rhythmic, and clear voice.
3. Immediately after the second question, speak the first 1-2 words of the Expected Answer (the start-up hint, e.g., "No, it...") as a prompt to help them start, then wait.
4. Listen to the student's voice response. The student must answer in a complete sentence, and they MUST use contractions (e.g., "it's" instead of "it is", "isn't" instead of "is not", "I'm" instead of "I am").
5. If the student answers correctly (following contraction rules and complete sentence rules), say "Correct!" and write the evaluation JSON to the text channel.
6. If the student makes a grammatical error, fails to use contractions, or replies with a short answer:
   IMMEDIATELY interrupt their speech (speak over them) and say the correct expected answer in full, then instruct them to repeat it: "No, repeat after me: [Expected Answer]".
7. Small talk, pleasantries (like "Excellent", "Great job"), and chit-chat are strictly prohibited. Maintain a high speed.
8. Every time you evaluate a user answer, write a JSON output strictly to the text channel in this format:
   {"isCorrect": true/false, "callanFeedback": "Japanese comments about contractions/fluency", "grammarFeedback": "Japanese explanation of any errors", "pronunciationFeedback": "Japanese pronunciation advice"}
`;

        console.log('Connecting to Gemini Live API...');
        await geminiLiveService.connect({
          apiKey,
          systemInstruction,
          voiceName: StorageManager.db.settings.voiceName || 'Aoede',
          volume
        });

        if (active) setSessionState('ready');
      } catch (err: any) {
        console.error('Session start error:', err);
        if (active) {
          let friendlyMessage = err.message || '接続に失敗しました。';
          const isPermissionError = err.name === 'NotAllowedError' || 
                                    err.name === 'SecurityError' ||
                                    err.message?.toLowerCase().includes('permission') || 
                                    err.message?.toLowerCase().includes('allowed');
          
          if (isPermissionError) {
            friendlyMessage = 'マイクの使用権限（Permission）が拒否されました。\n\n' +
              '【対処法】\n' +
              '1. ブラウザのアドレスバーの鍵アイコンをクリックし、マイクの使用が「許可」になっているか確認してください。\n' +
              '2. スマホなどからIPアドレス（http://192.168...等）でアクセスしている場合、ブラウザのセキュリティ制限によりマイクの使用が自動的にブロックされます。HTTPSで暗号化されたURL（デプロイ先）からアクセスするか、PCのローカルホスト（http://localhost:5173）でお試しください。';
          }
          setErrorMessage(friendlyMessage);
          setSessionState('error');
        }
      }
    };

    startSession();

    return () => {
      active = false;
      geminiLiveService.disconnect();
      audioHelper.stopAudio();
    };
  }, []);

  // Set up Visualizer canvas loop when listening state is active
  useEffect(() => {
    if (sessionState !== 'active' || liveState !== 'listening') {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 80;

    const analyser = audioHelper.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.fillStyle = '#080b11'; // Match space background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 6;
      ctx.shadowColor = '#06b6d4';

      const drawWave = (color: string, amplitude: number, speed: number, offset: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        const points = [];
        const segments = 16;
        const segmentWidth = canvas.width / segments;

        points.push({ x: 0, y: canvas.height / 2 });

        for (let i = 1; i < segments; i++) {
          const dataIdx = Math.floor((i / segments) * bufferLength);
          const frequencyVal = analyser ? dataArray[dataIdx] / 255 : 0.1;
          
          const x = i * segmentWidth;
          const time = Date.now() * 0.003 * speed + offset + i;
          const waveValue = Math.sin(time) * amplitude * (0.2 + frequencyVal * 0.8);
          
          // Hanning window to taper near edges
          const edgeDamp = Math.sin((i / segments) * Math.PI);
          const y = canvas.height / 2 + waveValue * edgeDamp;
          
          points.push({ x, y });
        }

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

      // 3 layers of Siri waves
      drawWave('rgba(99, 102, 241, 0.8)', 22, 1.2, 0);         // Indigo
      drawWave('rgba(6, 182, 212, 0.5)', 14, 0.8, Math.PI / 2); // Cyan
      drawWave('rgba(16, 185, 129, 0.3)', 8, 1.5, Math.PI);      // Emerald

      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [sessionState, liveState]);

  // Adjust volume dynamically
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    geminiLiveService.setVolume(val);
  };

  // Start the actual Q&A session
  const handleStartSession = () => {
    setSessionState('active');
    triggerQuestion(0);
  };

  // Send the current question instruction to Gemini
  const triggerQuestion = (index: number) => {
    setFeedback(null);
    setUserTranscript('');
    
    const q = questions[index];
    if (!q) return;

    // Send a message containing target Q&A to Gemini Live.
    // It will immediately speak Q twice and give expected answer start hint.
    const instruction = `
[NEXT_QUESTION]
Question: "${q.question}"
Expected Answer: "${q.expectedAnswer}"
Start Speaking immediately.
`;
    geminiLiveService.sendTextMessage(instruction);
  };

  // Re-read current question (repeats speaking phase)
  const handleRepeatQuestion = () => {
    geminiLiveService.clearPlaybackQueue();
    triggerQuestion(currentIndex);
  };

  // Submit assessment and record score
  const handleNext = () => {
    if (!activeQuestion) return;

    // Record history
    const isCorrect = feedback ? feedback.isCorrect : true;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    const newHistoryEntry: QuestionHistoryEntry = {
      id: activeQuestion.id,
      question: activeQuestion.question,
      expectedAnswer: activeQuestion.expectedAnswer,
      userAnswer: userTranscript || '(Voice Input)',
      isCorrect: isCorrect,
      callanFeedback: feedback?.callanFeedback || '',
      grammarFeedback: feedback?.grammarFeedback || '',
      pronunciationFeedback: feedback?.pronunciationFeedback || ''
    };

    setSessionHistory((prev) => [...prev, newHistoryEntry]);

    const nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      triggerQuestion(nextIndex);
    } else {
      // Completed curriculum session
      handleCompleteSession([...sessionHistory, newHistoryEntry]);
    }
  };

  // Close and push history data
  const handleCompleteSession = async (finalHistory: QuestionHistoryEntry[]) => {
    setSessionState('completed');
    geminiLiveService.disconnect();
    audioHelper.stopAudio();

    const duration = Math.round((Date.now() - startTime) / 1000);
    const correct = finalHistory.filter(h => h.isCorrect).length;

    try {
      await StorageManager.addHistoryEntry({
        stage,
        lesson,
        questionsCount: questions.length,
        correctCount: correct,
        score: Math.round((correct / questions.length) * 100),
        duration,
        questions: finalHistory
      });
    } catch (e) {
      console.error('Failed to sync completed session history:', e);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 1. Loading/Connecting */}
      {sessionState === 'connecting' && (
        <div className="flex flex-col items-center justify-center min-h-[50svh] text-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mb-6" />
          <h3 className="text-lg font-bold text-white font-display">Tutor に接続中...</h3>
          <p className="text-gray-400 text-sm mt-2">Gemini Live API への WebSocket 接続を初期化しています。</p>
        </div>
      )}

      {/* 2. Connection Error */}
      {sessionState === 'error' && (
        <div className="p-8 rounded-2xl bg-rose-950/10 border border-rose-900/30 text-center space-y-4">
          <AlertCircle size={48} className="text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white font-display">接続エラー</h3>
          <p className="text-rose-400 text-sm">{errorMessage}</p>
          <button
            onClick={onQuit}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all btn-bounce"
          >
            戻る
          </button>
        </div>
      )}

      {/* 3. Session Ready to Start */}
      {sessionState === 'ready' && (
        <div className="p-8 rounded-2xl glass glass-card text-center space-y-6">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-display">
            Session Prepared
          </span>
          <h3 className="text-2xl font-bold text-white font-display">
            Stage {stage} - Lesson {lesson}
          </h3>
          <p className="text-gray-400 text-sm">
            チューターの接続とマイクのセットアップが完了しました。<br />
            カランメソッドの授業が開始されると、チューターが高速で質問を話します。
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onQuit}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold transition-all btn-bounce"
            >
              キャンセル
            </button>
            <button
              onClick={handleStartSession}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold transition-all shadow-lg shadow-indigo-950/30 flex items-center gap-1.5 btn-bounce"
            >
              <Play size={18} /> レッスン開始
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Q&A Session */}
      {sessionState === 'active' && activeQuestion && (
        <div className="space-y-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              問題 {currentIndex + 1} / {questions.length} ({activeQuestion.phase})
            </span>
            <button
              onClick={() => {
                if (confirm('レッスンを終了しますか？進捗は保存されません。')) {
                  onQuit();
                }
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-gray-400 hover:text-white transition-all text-xs font-semibold"
            >
              退出
            </button>
          </div>

          {/* Tutor Voice Visualizer (Blob Aura) */}
          <div className="flex justify-center py-6">
            <div
              className={`w-36 h-36 rounded-full aura-blob flex items-center justify-center ${
                liveState === 'speaking' ? 'speaking' : liveState === 'listening' ? 'listening' : ''
              }`}
            >
              {liveState === 'speaking' ? (
                <Volume2 size={32} className="text-white animate-pulse" />
              ) : liveState === 'listening' ? (
                <Mic size={32} className="text-white animate-bounce" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/80" />
              )}
            </div>
          </div>

          {/* Status Overlay */}
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wider font-display">
              {liveState === 'speaking' && (
                <span className="text-pink-400">TUTOR SPEAKING...</span>
              )}
              {liveState === 'listening' && (
                <span className="text-emerald-400 animate-pulse">LISTENING... SPEAK NOW!</span>
              )}
              {liveState === 'connecting' && (
                <span className="text-gray-400">CONNECTING...</span>
              )}
              {liveState === 'idle' && (
                <span className="text-gray-500">IDLE</span>
              )}
            </p>
          </div>

          {/* Siri styled dynamic wave for microphone inputs */}
          {liveState === 'listening' && (
            <div className="overflow-hidden rounded-xl bg-slate-950 border border-slate-900 py-2">
              <canvas ref={canvasRef} className="w-full block" />
            </div>
          )}

          {/* Curriculm Text card (Glow style) */}
          <div className="p-6 rounded-2xl glass border border-slate-800/80 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Target Pattern
              </span>
              <p className="text-lg font-bold text-white">
                {activeQuestion.question}
              </p>
            </div>
            
            <div className="space-y-1 pt-2 border-t border-slate-900">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Expected Answer (Contraction strictly enforced)
              </span>
              <p className="text-sm text-emerald-400 font-semibold leading-relaxed">
                {activeQuestion.expectedAnswer}
              </p>
            </div>
          </div>

          {/* Assessment & Feedback panel */}
          {feedback && (
            <div
              className={`p-5 rounded-2xl border ${
                feedback.isCorrect
                  ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-950/10 border-rose-500/20 text-rose-400'
              } space-y-3`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {feedback.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span>{feedback.isCorrect ? 'Correct! (合格)' : 'Try Repeating (要修正)'}</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-300">
                {feedback.callanFeedback && <p className="font-semibold text-indigo-300">💡 {feedback.callanFeedback}</p>}
                {feedback.grammarFeedback && <p>📝 <span className="font-semibold text-gray-400">文法:</span> {feedback.grammarFeedback}</p>}
                {feedback.pronunciationFeedback && <p>🗣️ <span className="font-semibold text-gray-400">発音:</span> {feedback.pronunciationFeedback}</p>}
              </div>
            </div>
          )}

          {/* Control Triggers */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleRepeatQuestion}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-gray-300 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 btn-bounce"
            >
              <RotateCcw size={16} /> 聞き直す
            </button>
            
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-950/30 flex items-center justify-center gap-1.5 btn-bounce"
            >
              {currentIndex + 1 < questions.length ? '次の質問' : 'レッスン完了'} <ChevronRight size={16} />
            </button>
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 max-w-sm mx-auto">
            <Volume2 size={16} className="text-gray-400" />
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 h-1"
            />
            <span className="text-xs text-gray-400 w-8 font-mono">{volume}</span>
          </div>
        </div>
      )}

      {/* 5. Session Completed Score card */}
      {sessionState === 'completed' && (
        <div className="p-8 rounded-2xl glass glass-card text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
              Session Finished
            </span>
            <h3 className="text-2xl font-bold text-white font-display">レッスン完了！</h3>
          </div>

          <div className="py-4 border-y border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block">スコア</span>
              <span className="text-2xl font-bold text-white font-display">
                {correctCount} / {questions.length}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">所要時間</span>
              <span className="text-2xl font-bold text-white font-display">
                {Math.round((Date.now() - startTime) / 1000)}秒
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            スコアと学習履歴が保存されました。Gist同期が有効な場合、自動的にクラウドへアップロードされます。
          </p>

          <button
            onClick={onQuit}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all flex items-center justify-center gap-1.5 btn-bounce"
          >
            <Home size={16} /> ダッシュボードに戻る
          </button>
        </div>
      )}
    </div>
  );
};
