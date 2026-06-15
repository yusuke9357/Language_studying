// src/components/History.tsx
import React, { useState } from 'react';
import { StorageManager } from '../utils/storage';
import { ChevronLeft, Calendar, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface HistoryProps {
  onBackToDashboard: () => void;
}

export const History: React.FC<HistoryProps> = ({ onBackToDashboard }) => {
  const history = StorageManager.getActiveHistory();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return isoString;
    }
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}分${sec}秒`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBackToDashboard}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-gray-400 hover:text-white transition-all btn-bounce"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white font-display">学習履歴</h2>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 p-8 rounded-2xl glass glass-card">
          <p className="text-gray-400">まだ学習履歴がありません。レッスンを開始しましょう！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((session, idx) => {
            const isExpanded = expandedIndex === idx;
            const accuracy = Math.round((session.correctCount / session.questionsCount) * 100);

            return (
              <div
                key={idx}
                className="rounded-2xl glass glass-card border border-slate-800/80 overflow-hidden transition-all"
              >
                {/* Session Summary Card */}
                <div
                  onClick={() => toggleExpand(idx)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/10 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-display">
                      Stage {session.stage} - Lesson {session.lesson}
                    </span>
                    <h3 className="font-bold text-white text-base">
                      セッションスコア: {session.correctCount} / {session.questionsCount} ({accuracy}%)
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {formatDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {formatDuration(session.duration)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        accuracy >= 80
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                          : accuracy >= 50
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {accuracy >= 80 ? 'Excellent' : accuracy >= 50 ? 'Good' : 'Needs Practice'}
                    </span>
                    
                    <button className="text-gray-400 hover:text-white p-1">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Session Details Accordion */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800 bg-slate-950/30 space-y-6">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                      回答の明細
                    </h4>
                    
                    <div className="space-y-4">
                      {session.questions.map((q, qIdx) => (
                        <div
                          key={q.id || qIdx}
                          className="p-4 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col md:flex-row gap-4 justify-between"
                        >
                          <div className="space-y-2 flex-1">
                            <p className="text-xs font-semibold text-gray-500">
                              Q {qIdx + 1}:
                            </p>
                            <p className="text-sm font-semibold text-white">
                              {q.question}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                              <div>
                                <span className="text-gray-400 block font-medium mb-0.5">お手本:</span>
                                <span className="text-emerald-400 font-semibold">{q.expectedAnswer}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium mb-0.5">あなたの発話:</span>
                                <span className={q.isCorrect ? 'text-white' : 'text-rose-400 font-semibold'}>
                                  {q.userAnswer || '(無回答)'}
                                </span>
                              </div>
                            </div>

                            {/* Grammar & Pronunciation tips */}
                            {(q.grammarFeedback || q.pronunciationFeedback || q.callanFeedback) && (
                              <div className="pt-2 border-t border-slate-900 mt-2 space-y-1">
                                {q.callanFeedback && (
                                  <p className="text-xs text-indigo-300">
                                    💡 {q.callanFeedback}
                                  </p>
                                )}
                                {q.grammarFeedback && (
                                  <p className="text-xs text-amber-300">
                                    📝 <span className="font-semibold text-gray-400">文法:</span> {q.grammarFeedback}
                                  </p>
                                )}
                                {q.pronunciationFeedback && (
                                  <p className="text-xs text-cyan-300">
                                    🗣️ <span className="font-semibold text-gray-400">発音:</span> {q.pronunciationFeedback}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex md:flex-col items-center justify-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-900">
                            {q.isCorrect ? (
                              <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                                <CheckCircle size={16} /> 正解
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rose-400 font-bold text-sm">
                                <XCircle size={16} /> 修正
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
