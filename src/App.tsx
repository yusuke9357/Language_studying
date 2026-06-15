// src/App.tsx
import React, { useEffect, useState } from 'react';
import { StorageManager } from './utils/storage';
import type { UserProgress } from './utils/storage';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { History } from './components/History';
import { LessonSession } from './components/LessonSession';
import { Key, RefreshCw } from 'lucide-react';

type ScreenState = 'setup' | 'login' | 'dashboard' | 'settings' | 'history' | 'session';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('login');
  const [currentUser, setCurrentUser] = useState('');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activeLesson, setActiveLesson] = useState<{ stage: number; lesson: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup Form States
  const [geminiKey, setGeminiKey] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [gistId, setGistId] = useState('');
  const [creatingGist, setCreatingGist] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('Initializing Callan AI Tutor...');
        const syncResult = await StorageManager.init();
        
        if (!StorageManager.isConfigured()) {
          setScreen('setup');
        } else {
          const lastUser = StorageManager.db.currentUser;
          if (!lastUser) {
            setScreen('login');
          } else {
            StorageManager.setCurrentUser(lastUser);
            setCurrentUser(lastUser);
            setProgress(StorageManager.getActiveProgress());
            setScreen('dashboard');
            if (syncResult.synced) {
              console.log('Successfully synced with cloud Gist on start.');
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize StorageManager:', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setProgress(StorageManager.getActiveProgress());
    setScreen('dashboard');
  };

  const handleStartLesson = (stage: number, lesson: number) => {
    setActiveLesson({ stage, lesson });
    setScreen('session');
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey.trim()) {
      setSetupError('Gemini API Keyは必須です。');
      return;
    }

    setLoading(true);
    try {
      await StorageManager.save({
        apiKey: geminiKey.trim(),
        githubToken: githubPat.trim(),
        gistId: gistId.trim()
      });

      // Synchronize
      await StorageManager.init();
      
      setScreen('login');
    } catch (err: any) {
      setSetupError(`セットアップ保存エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCreateGist = async () => {
    if (!githubPat.trim()) {
      setSetupError('先にGitHub Personal Access Tokenを入力してください。');
      return;
    }
    setCreatingGist(true);
    setSetupError('');
    try {
      const newGistId = await StorageManager.createSyncGist(githubPat.trim());
      setGistId(newGistId);
    } catch (err: any) {
      setSetupError(`Gist作成失敗: ${err.message}`);
    } finally {
      setCreatingGist(false);
    }
  };

  const handleQuitLesson = () => {
    setActiveLesson(null);
    setProgress(StorageManager.getActiveProgress()); // reload progress
    setScreen('dashboard');
  };

  const handleBackToDashboard = () => {
    setProgress(StorageManager.getActiveProgress()); // reload progress
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#080b11] text-gray-200">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-cyan-500 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide">データを読み込んでいます...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b11] text-[#f3f4f6]">
      {/* 1. Initial Setup wizard screen */}
      {screen === 'setup' && (
        <div className="flex flex-col items-center justify-center min-h-[90svh] px-4 py-8">
          <div className="w-full max-w-md p-8 rounded-2xl glass glass-card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 to-indigo-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Key size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-display">Tutor セットアップ</h1>
                <p className="text-xs text-gray-400">最初のAPIキー設定を行ってください</p>
              </div>
            </div>

            <form onSubmit={handleSetupSubmit} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="setup-gemini-key" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Gemini API Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  id="setup-gemini-key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AI StudioのAPIキーを入力"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="setup-github-pat" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  GitHub Personal Access Token (オプション)
                </label>
                <input
                  type="password"
                  id="setup-github-pat"
                  value={githubPat}
                  onChange={(e) => setGithubPat(e.target.value)}
                  placeholder="進捗同期用トークンを入力"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="setup-gist-id" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  GitHub Gist ID (オプション)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="setup-gist-id"
                    value={gistId}
                    onChange={(e) => setGistId(e.target.value)}
                    placeholder="既存のGist IDを入力"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAutoCreateGist}
                    disabled={creatingGist}
                    className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-gray-200 border border-slate-700/50 transition-all flex items-center gap-1 btn-bounce"
                  >
                    <RefreshCw size={12} className={creatingGist ? 'animate-spin' : ''} />
                    自動作成
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  ※GitHub Token入力後に「自動作成」を押すとクラウド同期用の領域を生成します。
                </p>
              </div>

              {setupError && (
                <p className="text-xs text-rose-500 font-semibold text-center mt-2">{setupError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-lg shadow-cyan-950/40 text-center btn-bounce"
              >
                キーを保存して開始する
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Login screen */}
      {screen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToSetup={() => setScreen('setup')}
        />
      )}

      {/* 3. Dashboard screen */}
      {screen === 'dashboard' && progress && (
        <Dashboard
          progress={progress}
          username={currentUser}
          onStartLesson={handleStartLesson}
          onNavigateToSettings={() => setScreen('settings')}
          onNavigateToHistory={() => setScreen('history')}
          onLogout={() => {
            StorageManager.setCurrentUser('');
            setScreen('login');
          }}
        />
      )}

      {/* 4. Settings screen */}
      {screen === 'settings' && (
        <Settings onBackToDashboard={handleBackToDashboard} />
      )}

      {/* 5. History screen */}
      {screen === 'history' && (
        <History onBackToDashboard={handleBackToDashboard} />
      )}

      {/* 6. Active Lesson session screen */}
      {screen === 'session' && activeLesson && (
        <LessonSession
          stage={activeLesson.stage}
          lesson={activeLesson.lesson}
          onQuit={handleQuitLesson}
        />
      )}
    </main>
  );
};
export default App;
