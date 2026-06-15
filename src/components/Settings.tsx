// src/components/Settings.tsx
import React, { useState } from 'react';
import { StorageManager } from '../utils/storage';
import { ChevronLeft, Volume2, Key, Activity, RefreshCw, Trash2 } from 'lucide-react';

interface SettingsProps {
  onBackToDashboard: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBackToDashboard }) => {
  const db = StorageManager.db;

  // Form States
  const [geminiKey, setGeminiKey] = useState(db.apiKey || '');
  const [githubPat, setGithubPat] = useState(db.githubToken || '');
  const [gistId, setGistId] = useState(db.gistId || '');

  // Audio States
  const [voiceName, setVoiceName] = useState(db.settings.voiceName || 'Aoede');
  const [rate, setRate] = useState(db.settings.rate || 1.1);
  const [pitch, setPitch] = useState(db.settings.pitch || 1.0);
  const [volume, setVolume] = useState(db.settings.volume !== undefined ? db.settings.volume : 0.9);

  // Status States
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [creatingGist, setCreatingGist] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    await StorageManager.save({
      apiKey: geminiKey,
      githubToken: githubPat,
      gistId: gistId,
      settings: { voiceName, rate, pitch, volume }
    });
    showToast('設定を保存しました。');
    onBackToDashboard();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('接続テスト中...');
    
    try {
      const results = await StorageManager.testConnection(githubPat, gistId, geminiKey);
      let out = '=== Connection Test Results ===\n';
      out += `GitHub Token : ${results.github ? 'OK (Valid Token)' : 'FAIL / OMITTED'}\n`;
      out += `GitHub Gist  : ${results.gist ? 'OK (Writable ID)' : 'FAIL / OMITTED'}\n`;
      out += `Gemini API   : ${results.gemini ? 'OK (Response Success)' : 'FAIL / OMITTED'}\n`;
      
      if (results.errors.length > 0) {
        out += '\n--- Errors ---\n' + results.errors.join('\n');
      }
      setTestResult(out);
    } catch (e: any) {
      setTestResult(`テスト実行時エラー: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleAutoCreateGist = async () => {
    if (!githubPat) {
      showToast('先にGitHub Personal Access Tokenを入力してください。');
      return;
    }
    setCreatingGist(true);
    try {
      const newGistId = await StorageManager.createSyncGist(githubPat);
      setGistId(newGistId);
      showToast('プライベートGistを作成しました！IDをセットしました。');
    } catch (err: any) {
      console.error(err);
      showToast(`Gist作成失敗: ${err.message}`);
    } finally {
      setCreatingGist(false);
    }
  };

  const handleResetData = async () => {
    if (confirm('警告！すべてのローカルおよび設定データが消去されます。続行しますか？')) {
      await StorageManager.resetAll();
      showToast('データを初期化しました。');
      // Force reload to setup state
      window.location.reload();
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xl shadow-black/30 text-white font-medium text-sm z-50 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBackToDashboard}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-gray-400 hover:text-white transition-all btn-bounce"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white font-display">設定</h2>
      </div>

      <div className="space-y-6">
        {/* Voice settings */}
        <section className="p-6 rounded-2xl glass glass-card">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Volume2 size={18} className="text-indigo-400" /> 音声設定（英語チューター）
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="select-voice" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                音声の選択 (Gemini Live Voice)
              </label>
              <select
                id="select-voice"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="Aoede">Aoede (女性風 - 明瞭・自然)</option>
                <option value="Charon">Charon (男性風 - 落ち着いた声)</option>
                <option value="Fenrir">Fenrir (男性風 - 力強い声)</option>
                <option value="Kore">Kore (女性風 - 早口向き)</option>
                <option value="Puck">Puck (男性風 - フレンドリー)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  発話速度: <span className="text-indigo-400">{rate}x</span>
                </label>
                <input
                  type="range"
                  min="0.7"
                  max="1.6"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">※カランは早口推奨</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  音の高さ: <span className="text-indigo-400">{pitch}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">※デフォルトは1.0</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  音量レベル: <span className="text-indigo-400">{volume}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">※音割れ防止に0.9以下推奨</span>
              </div>
            </div>
          </div>
        </section>

        {/* API credentials */}
        <section className="p-6 rounded-2xl glass glass-card">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-cyan-400" /> API 接続設定
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="gemini-key" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                id="gemini-key"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AI Studioのキーを入力"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div>
              <label htmlFor="github-pat" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                id="github-pat"
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                placeholder="ghp_xxx..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div>
              <label htmlFor="gist-id" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                GitHub Gist ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="gist-id"
                  value={gistId}
                  onChange={(e) => setGistId(e.target.value)}
                  placeholder="Gist IDを入力"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={handleAutoCreateGist}
                  disabled={creatingGist}
                  className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-gray-200 border border-slate-700/50 transition-all flex items-center gap-1 btn-bounce"
                >
                  <RefreshCw size={14} className={creatingGist ? 'animate-spin' : ''} />
                  自動作成
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <section className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold transition-all shadow-lg shadow-indigo-950/30 text-center btn-bounce"
            >
              設定を保存して戻る
            </button>
            
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold border border-slate-700/50 transition-all flex items-center justify-center btn-bounce"
              title="接続テスト"
            >
              <Activity size={18} className={testing ? 'animate-pulse' : ''} />
            </button>
          </div>

          {testResult && (
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono text-cyan-400 overflow-x-auto whitespace-pre-wrap">
              {testResult}
            </pre>
          )}

          <button
            onClick={handleResetData}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-950/10 hover:bg-rose-950/20 border border-rose-900/20 hover:border-rose-900/40 text-rose-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 btn-bounce"
          >
            <Trash2 size={14} /> 全てのデータを消去して初期状態に戻す
          </button>
        </section>
      </div>
    </div>
  );
};
