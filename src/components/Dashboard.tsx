// src/components/Dashboard.tsx
import React from 'react';
import type { UserProgress } from '../utils/storage';
import { curriculumSyllabus } from '../data/curriculum';
import { Flame, Award, Percent, BookOpen, Settings, History, LogOut } from 'lucide-react';

interface DashboardProps {
  progress: UserProgress;
  username: string;
  onStartLesson: (stage: number, lesson: number) => void;
  onNavigateToSettings: () => void;
  onNavigateToHistory: () => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  progress,
  username,
  onStartLesson,
  onNavigateToSettings,
  onNavigateToHistory,
  onLogout
}) => {
  const totalQ = progress.totalAnswered || 0;
  const correctQ = progress.correctAnswers || 0;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  const streak = progress.streak || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Upper Navigation / User info */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-display">
            Active Student
          </span>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {username.toUpperCase()}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-gray-200 text-sm font-semibold transition-all btn-bounce"
          >
            <History size={16} /> 履歴
          </button>
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-gray-200 text-sm font-semibold transition-all btn-bounce"
          >
            <Settings size={16} /> 設定
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 text-sm font-semibold transition-all btn-bounce"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Stats Hero Widget */}
      <section className="grid grid-cols-3 gap-4 mb-10">
        <div className="p-5 rounded-2xl glass glass-card flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500" />
          <Flame className="text-amber-500 mb-2" size={28} />
          <span className="text-xs text-gray-400 font-medium">連続学習日数</span>
          <span className="text-2xl md:text-3xl font-bold text-white font-display mt-1">{streak}日</span>
        </div>
        
        <div className="p-5 rounded-2xl glass glass-card flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500" />
          <Award className="text-indigo-400 mb-2" size={28} />
          <span className="text-xs text-gray-400 font-medium">回答総数</span>
          <span className="text-2xl md:text-3xl font-bold text-white font-display mt-1">{totalQ}回</span>
        </div>

        <div className="p-5 rounded-2xl glass glass-card flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
          <Percent className="text-emerald-400 mb-2" size={28} />
          <span className="text-xs text-gray-400 font-medium">平均正解率</span>
          <span className="text-2xl md:text-3xl font-bold text-white font-display mt-1">{accuracy}%</span>
        </div>
      </section>

      {/* Curriculum Grid */}
      <section className="space-y-10">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-l-4 border-cyan-500 pl-3">
          <BookOpen size={20} className="text-cyan-400" /> カリキュラム
        </h3>

        {Object.keys(curriculumSyllabus).map((stageKeyStr) => {
          const stageKey = parseInt(stageKeyStr);
          const stage = curriculumSyllabus[stageKey];
          return (
            <div key={stageKey} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                <h4 className="text-lg font-bold text-white font-display">
                  {stage.name}
                </h4>
                <span className="text-xs text-gray-400">
                  {stage.description}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(stage.lessons).map((lessonKeyStr) => {
                  const lessonKey = parseInt(lessonKeyStr);
                  const lesson = stage.lessons[lessonKey];
                  const lessonCode = `stage-${stageKey}-lesson-${lessonKey}`;
                  const isCompleted = progress.completedLessons?.includes(lessonCode);

                  return (
                    <div
                      key={lessonKey}
                      className={`p-5 rounded-2xl transition-all border ${
                        isCompleted
                          ? 'bg-emerald-950/10 border-emerald-500/20'
                          : 'bg-slate-900/30 border-slate-800'
                      } flex items-center justify-between`}
                    >
                      <div className="space-y-1 pr-4">
                        <span className="text-xs font-bold text-slate-500">
                          LESSON {lessonKey}
                        </span>
                        <h5 className="font-bold text-white text-base">
                          {lesson.name}
                        </h5>
                        <p className="text-xs text-slate-400">
                          全 {lesson.questions.length} 問 (目標: フルセンテンス回答)
                        </p>
                      </div>

                      <div>
                        {isCompleted ? (
                          <button
                            onClick={() => onStartLesson(stageKey, lessonKey)}
                            className="px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all btn-bounce"
                          >
                            復習する
                          </button>
                        ) : (
                          <button
                            onClick={() => onStartLesson(stageKey, lessonKey)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/30 btn-bounce"
                          >
                            開始
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
