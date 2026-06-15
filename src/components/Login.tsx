// src/components/Login.tsx
import React, { useState } from 'react';
import { StorageManager } from '../utils/storage';
import { Award, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
  onNavigateToSetup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToSetup }) => {
  const [username, setUsername] = useState(StorageManager.db.currentUser || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('ユーザー名を入力してください。');
      return;
    }
    
    StorageManager.setCurrentUser(trimmed);
    onLoginSuccess(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80svh] px-4">
      <div className="w-full max-w-md p-8 rounded-2xl glass glass-card text-center relative overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
        
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <Award size={48} className="animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 font-display">
          Callan AI Tutor
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Gemini Live API を用いた超低遅延カランメソッド英語学習
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              ユーザー名を入力してログイン
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="例: yusuke"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-center font-semibold text-lg"
            />
            {error && <p className="mt-2 text-sm text-rose-500 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold transition-all shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 btn-bounce"
          >
            学習を開始する <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-xs text-gray-500">
            APIキーの設定がまだ完了していない場合は
            <button
              onClick={onNavigateToSetup}
              className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4 ml-1 focus:outline-none"
            >
              初期セットアップへ
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
