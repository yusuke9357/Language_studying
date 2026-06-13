/**
 * Main Application Coordinator for Callan AI Tutor
 * Implements the session state machine, binds events, and orchestrates
 * Storage, Speech, API, and UI managers.
 * Updates in Phase 2: Added user login routing, dynamic illustrations, and speech advice UI.
 */

const App = {
  // Session State
  session: {
    stage: 1,
    lesson: 1,
    questions: [],
    currentIndex: 0,
    correctCount: 0,
    historyQuestions: [], // Detailed question results for this session
    startTime: null,
    currentQuestionStartTime: null,
    isMuted: false,
    inputMode: 'speech', // 'speech' | 'text'
    isQuestionVisible: false
  },

  init() {
    // 1. Initialize Sub-modules
    StorageManager.init().then(syncResult => {
      UiManager.init();
      SpeechManager.init();
      
      // Register global voices loading hook (TTS voices are loaded asynchronously in some browsers)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => this.populateVoiceList();
        this.populateVoiceList();
      }

      // 2. Setup Routing check
      if (!StorageManager.isConfigured()) {
        UiManager.showScreen('screen-setup');
      } else {
        // If configured but currentUser is empty, show Login screen
        const lastUser = StorageManager.db.currentUser;
        if (!lastUser) {
          UiManager.showScreen('screen-login');
        } else {
          // Auto login to last session user
          StorageManager.setCurrentUser(lastUser);
          this.refreshDashboard();
          UiManager.showScreen('screen-dashboard');
          
          if (syncResult.synced) {
            UiManager.showToast('Gistと同期しました！');
          }
        }
      }
    });

    // 3. Bind Event Listeners
    this.bindEvents();
  },

  // Update header and dashboard hero stats
  updateHeaderStats() {
    const p = StorageManager.getActiveProgress();
    
    // Streaks
    document.getElementById('header-streak').textContent = p.streak || 0;
    
    // Dashboard Stats
    const totalQ = p.totalAnswered || 0;
    const correctQ = p.correctAnswers || 0;
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

    document.getElementById('stat-total-q').textContent = totalQ;
    document.getElementById('stat-avg-acc').textContent = `${accuracy}%`;
    document.getElementById('current-stage-badge').textContent = `Stage ${p.currentStage}`;
    
    const subtitle = document.getElementById('dashboard-subtitle');
    const userDisplay = StorageManager.db.currentUser ? `[${StorageManager.db.currentUser}] ` : '';
    if (p.streak > 0) {
      subtitle.textContent = `${userDisplay}現在 ${p.streak} 日連続学習中！素晴らしいペースです。`;
    } else {
      subtitle.textContent = `${userDisplay}今日も英語の反射神経を鍛えましょう。`;
    }
  },

  // Refresh curriculum list based on current progress
  refreshDashboard() {
    const progress = StorageManager.getActiveProgress();
    UiManager.renderDashboard(progress, CurriculumManager.syllabus);
    this.updateHeaderStats();
    this.populateSettingsForm();
  },

  // Populate settings fields with active database configuration
  populateSettingsForm() {
    const db = StorageManager.db;
    document.getElementById('settings-gemini-key').value = db.apiKey || '';
    document.getElementById('settings-github-pat').value = db.githubToken || '';
    document.getElementById('settings-gist-id').value = db.gistId || '';

    // Settings Slider Values
    const s = db.settings;
    document.getElementById('range-rate').value = s.rate || 1.1;
    document.getElementById('rate-value').textContent = s.rate || 1.1;
    document.getElementById('range-pitch').value = s.pitch || 1.0;
    document.getElementById('pitch-value').textContent = s.pitch || 1.0;
  },

  // Populates speech synthesis voice selections in the UI settings screen
  populateVoiceList() {
    const select = document.getElementById('select-voice');
    if (!select) return;
    
    select.innerHTML = '<option value="">システムデフォルト (English)</option>';
    
    const voices = SpeechManager.getEnglishVoices();
    const currentVoiceName = StorageManager.db.settings.voiceName;

    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === currentVoiceName) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  /* --- Event Binding --- */

  bindEvents() {
    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('input-login-username').value.trim();
      if (!username) {
        UiManager.showToast('ユーザー名を入力してください');
        return;
      }

      StorageManager.setCurrentUser(username);
      this.refreshDashboard();
      UiManager.showScreen('screen-dashboard');
      UiManager.showToast(`${username} としてログインしました`);
    });

    // Login screen redirect link to Setup screen
    document.getElementById('link-login-to-setup').addEventListener('click', (e) => {
      e.preventDefault();
      this.populateSettingsForm();
      UiManager.showScreen('screen-setup');
    });

    // Navigation Headers
    document.getElementById('btn-show-history').addEventListener('click', () => {
      const history = StorageManager.getActiveHistory();
      UiManager.renderHistory(history);
      UiManager.showScreen('screen-history');
    });

    document.getElementById('btn-back-from-history').addEventListener('click', () => {
      UiManager.showScreen('screen-dashboard');
    });

    document.getElementById('btn-show-settings').addEventListener('click', () => {
      this.populateSettingsForm();
      this.populateVoiceList();
      UiManager.showScreen('screen-settings');
    });

    document.getElementById('btn-back-from-settings').addEventListener('click', () => {
      UiManager.showScreen('screen-dashboard');
    });

    // Setup Wizard Form Submit
    document.getElementById('setup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const geminiKey = document.getElementById('input-gemini-key').value.trim();
      const githubPat = document.getElementById('input-github-pat').value.trim();
      const gistId = document.getElementById('input-gist-id').value.trim();

      if (!geminiKey) {
        UiManager.showToast('Gemini API Keyは必須です');
        return;
      }

      // Save initial keys
      await StorageManager.save({
        apiKey: geminiKey,
        githubToken: githubPat,
        gistId: gistId
      });

      // Synchronize/Initialize
      const sync = await StorageManager.init();
      if (sync.synced) {
        UiManager.showToast('セットアップ完了。クラウドデータと接続しました。');
      } else {
        UiManager.showToast('セットアップを完了しました。');
      }

      // Route to login screen to pick username
      UiManager.showScreen('screen-login');
    });

    // Auto Gist Creator helper in Setup Wizard
    document.getElementById('btn-auto-create-gist').addEventListener('click', async () => {
      const token = document.getElementById('input-github-pat').value.trim();
      if (!token) {
        UiManager.showToast('先にGitHub Personal Access Tokenを入力してください');
        return;
      }

      const btn = document.getElementById('btn-auto-create-gist');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="status-icon pulse-icon" data-lucide="loader-2"></i> 作成中...';
      if (window.lucide) window.lucide.createIcons();

      try {
        const gistId = await StorageManager.createSyncGist(token);
        document.getElementById('input-gist-id').value = gistId;
        UiManager.showToast('プライベートGistを作成しました！IDを入力欄にセットしました。');
      } catch (err) {
        console.error(err);
        UiManager.showToast(`Gist作成失敗: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Dashboard: Start Lesson click delegation
    document.getElementById('stages-list').addEventListener('click', (e) => {
      const btn = e.target.closest('.lesson-btn');
      if (!btn || btn.classList.contains('locked')) return;

      const stage = parseInt(btn.dataset.stage);
      const lesson = parseInt(btn.dataset.lesson);
      
      this.startLesson(stage, lesson);
    });

    // Lesson Screen: Controls
    document.getElementById('btn-quit-lesson').addEventListener('click', () => {
      if (confirm('レッスンを終了しますか？進捗は保存されません。')) {
        this.quitLesson();
      }
    });

    // Toggle Text Visibility (Eye button)
    document.getElementById('btn-toggle-question-visibility').addEventListener('click', () => {
      this.toggleQuestionVisibility();
    });

    // TTS Voice Test Speech in settings
    document.getElementById('btn-test-speech').addEventListener('click', () => {
      const rate = parseFloat(document.getElementById('range-rate').value);
      const pitch = parseFloat(document.getElementById('range-pitch').value);
      SpeechManager.speakOnce('This is a test of the Callan AI Tutor speech engine.', { rate, pitch });
    });

    // Range Sliders display update
    document.getElementById('range-rate').addEventListener('input', (e) => {
      document.getElementById('rate-value').textContent = e.target.value;
    });

    document.getElementById('range-pitch').addEventListener('input', (e) => {
      document.getElementById('pitch-value').textContent = e.target.value;
    });

    // Save Settings
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
      const geminiKey = document.getElementById('settings-gemini-key').value.trim();
      const githubPat = document.getElementById('settings-github-pat').value.trim();
      const gistId = document.getElementById('settings-gist-id').value.trim();
      const voiceName = document.getElementById('select-voice').value;
      const rate = parseFloat(document.getElementById('range-rate').value);
      const pitch = parseFloat(document.getElementById('range-pitch').value);

      await StorageManager.save({
        apiKey: geminiKey,
        githubToken: githubPat,
        gistId: gistId,
        settings: { voiceName, rate, pitch }
      });

      UiManager.showToast('設定を保存しました');
      this.refreshDashboard();
      UiManager.showScreen('screen-dashboard');
    });

    // Test API Connections
    document.getElementById('btn-test-connections').addEventListener('click', async () => {
      const btn = document.getElementById('btn-test-connections');
      const box = document.getElementById('connection-test-result');
      
      const geminiKey = document.getElementById('settings-gemini-key').value.trim();
      const githubPat = document.getElementById('settings-github-pat').value.trim();
      const gistId = document.getElementById('settings-gist-id').value.trim();

      btn.disabled = true;
      box.classList.remove('hidden');
      box.textContent = '接続テスト中...';

      const results = await StorageManager.testConnection(githubPat, gistId, geminiKey);
      
      let out = '=== Connection Test Results ===\n';
      out += `GitHub Token : ${results.github ? 'OK (Valid Token)' : 'FAIL / OMITTED'}\n`;
      out += `GitHub Gist  : ${results.gist ? 'OK (Writable ID)' : 'FAIL / OMITTED'}\n`;
      out += `Gemini API   : ${results.gemini ? 'OK (Response Success)' : 'FAIL / OMITTED'}\n`;
      
      if (results.errors.length > 0) {
        out += '\n--- Errors ---\n' + results.errors.join('\n');
      }

      box.textContent = out;
      btn.disabled = false;
    });

    // Reset Data
    document.getElementById('btn-reset-data').addEventListener('click', async () => {
      if (confirm('警告！すべてのローカルおよび設定データが消去されます。続行しますか？')) {
        await StorageManager.resetAll();
        UiManager.showToast('データが初期化されました。');
        this.populateSettingsForm();
        this.refreshDashboard();
        UiManager.showScreen('screen-setup');
      }
    });

    // Microphone action button toggle
    document.getElementById('btn-microphone').addEventListener('click', () => {
      if (SpeechManager.isListening) {
        this.stopSpeechRecognition();
      } else {
        this.startSpeechRecognition();
      }
    });

    // Input mode keyboard toggle
    document.getElementById('btn-toggle-input-mode').addEventListener('click', () => {
      this.toggleInputMode();
    });

    // Submit Typed Answer
    document.getElementById('btn-submit-text-answer').addEventListener('click', () => {
      this.submitTextAnswer();
    });
    
    document.getElementById('input-text-answer').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitTextAnswer();
      }
    });

    // Repeat Q button
    document.getElementById('btn-repeat-question').addEventListener('click', () => {
      this.playCurrentQuestionVoice();
    });

    // Next Question flow
    document.getElementById('btn-next-question').addEventListener('click', () => {
      this.advanceQuestion();
    });

    // Retry Question flow
    document.getElementById('btn-retry-question').addEventListener('click', () => {
      this.retryCurrentQuestion();
    });

    // History detail accordion toggle
    document.getElementById('history-container').addEventListener('click', (e) => {
      const toggle = e.target.closest('.history-detail-toggle');
      if (!toggle) return;

      const idx = toggle.dataset.index;
      const details = document.getElementById(`history-details-${idx}`);
      
      if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        toggle.innerHTML = '履歴の詳細を非表示 <i data-lucide="chevron-up"></i>';
      } else {
        details.classList.add('hidden');
        toggle.innerHTML = '履歴の詳細を表示 <i data-lucide="chevron-down"></i>';
      }

      if (window.lucide) window.lucide.createIcons();
    });
  },

  /* --- Lesson Session Logic --- */

  // Initialize and begin a new Callan lesson session
  startLesson(stage, lesson) {
    this.session.stage = stage;
    this.session.lesson = lesson;
    this.session.questions = CurriculumManager.compileSessionQuestions(stage, lesson);
    this.session.currentIndex = 0;
    this.session.correctCount = 0;
    this.session.historyQuestions = [];
    this.session.startTime = new Date();
    this.session.isQuestionVisible = false; // Hide text by default (Ear Training!)
    this.session.inputMode = 'speech'; // Reset to speech mode

    if (this.session.questions.length === 0) {
      UiManager.showToast('エラー: 質問が定義されていません。');
      return;
    }

    // Adjust visibility toggle button icon
    const visBtn = document.getElementById('btn-toggle-question-visibility');
    visBtn.innerHTML = '<i data-lucide="eye-off"></i>';

    // Transition Screen
    UiManager.showScreen('screen-lesson');
    this.updateLessonProgressBar();
    this.loadQuestion(0);
  },

  // Load a question into view and start speaking
  loadQuestion(index) {
    this.session.currentIndex = index;
    const q = this.session.questions[index];

    // Reset UI displays
    document.getElementById('question-container').className = 'card glass question-card';
    document.getElementById('question-phase-badge').textContent = q.phase;
    document.getElementById('question-phase-badge').className = `question-type-badge ${q.phase === 'Revision' ? 'revision' : 'newwork'}`;
    
    const textEl = document.getElementById('tutor-question-text');
    textEl.textContent = q.question;
    
    // Draw SVG Line-Art Visual Cue
    UiManager.renderIllustration(q.id);
    
    // Apply blur if ear training
    if (!this.session.isQuestionVisible) {
      textEl.classList.add('question-blur');
    } else {
      textEl.classList.remove('question-blur');
    }

    // Reset status fields
    document.getElementById('status-indicator').className = 'status-indicator';
    document.getElementById('status-text').textContent = 'Tutor is speaking...';
    document.getElementById('speech-preview').classList.add('hidden');
    document.getElementById('speech-preview').textContent = '';
    document.getElementById('feedback-panel').classList.add('hidden');
    
    // Toggle active keyboard bar out
    document.getElementById('text-input-container').classList.add('hidden');
    document.getElementById('input-text-answer').value = '';

    // Disable input controls during speaking phase
    document.getElementById('btn-microphone').disabled = true;
    document.getElementById('btn-toggle-input-mode').disabled = true;
    document.getElementById('btn-repeat-question').disabled = true;

    // Start speaking
    this.playCurrentQuestionVoice();
  },

  // Speak the question twice using TTS
  playCurrentQuestionVoice() {
    SpeechManager.cancelSpeech();
    SpeechManager.stopListening();
    
    const q = this.session.questions[this.session.currentIndex];
    
    // Apply Speaking Animation state
    document.getElementById('question-container').classList.add('speaking');
    document.getElementById('status-indicator').classList.remove('hidden');
    document.getElementById('status-indicator').innerHTML = '<i data-lucide="volume-2" class="status-icon pulse-icon"></i> <span>Tutor is speaking...</span>';
    if (window.lucide) window.lucide.createIcons();

    SpeechManager.speakQuestion(q.question, {}, () => {
      // Finished speaking callback
      document.getElementById('question-container').classList.remove('speaking');
      
      // Update timer stamp
      this.session.currentQuestionStartTime = new Date();

      // Enable Controls
      document.getElementById('btn-microphone').disabled = false;
      document.getElementById('btn-toggle-input-mode').disabled = false;
      document.getElementById('btn-repeat-question').disabled = false;

      // Automatically engage input mode
      if (this.session.inputMode === 'speech') {
        this.startSpeechRecognition();
      } else {
        this.activateKeyboardMode();
      }
    });
  },

  // Start Web Speech API microphone recognition
  startSpeechRecognition() {
    if (SpeechManager.isListening) return;

    document.getElementById('status-indicator').innerHTML = '<i data-lucide="mic" class="status-icon pulse-icon" style="color:#06b6d4"></i> <span>Listening... Speak now!</span>';
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('question-container').classList.add('listening-state');
    document.getElementById('waveform-wrap').classList.remove('hidden');
    
    const preview = document.getElementById('speech-preview');
    preview.classList.remove('hidden');
    preview.textContent = '...';

    const canvas = document.getElementById('waveform-canvas');

    SpeechManager.startListening(
      // Real-time result streaming callback
      (text, isFinal) => {
        preview.textContent = text;
      },
      // Listening finished callback
      (finalText) => {
        document.getElementById('question-container').classList.remove('listening-state');
        document.getElementById('waveform-wrap').classList.add('hidden');
        
        if (finalText) {
          this.submitAnswer(finalText);
        } else {
          // If silent or timed out, prompt user
          document.getElementById('status-indicator').innerHTML = '<i data-lucide="info" class="status-icon"></i> <span>音声が聞き取れませんでした。マイクを押して再発話、またはキーボード入力を選択してください。</span>';
          if (window.lucide) window.lucide.createIcons();
        }
      },
      // Error callback
      (err) => {
        document.getElementById('question-container').classList.remove('listening-state');
        document.getElementById('waveform-wrap').classList.add('hidden');
        UiManager.showToast(`音声認識エラー: ${err}`);
      },
      canvas
    );
  },

  // Stop STT microphone
  stopSpeechRecognition() {
    SpeechManager.stopListening();
  },

  // Toggle keyboard / speech input options
  toggleInputMode() {
    if (this.session.inputMode === 'speech') {
      this.session.inputMode = 'text';
      this.stopSpeechRecognition();
      this.activateKeyboardMode();
    } else {
      this.session.inputMode = 'speech';
      document.getElementById('text-input-container').classList.add('hidden');
      this.startSpeechRecognition();
    }
  },

  // Show the keyboard input bar
  activateKeyboardMode() {
    document.getElementById('waveform-wrap').classList.add('hidden');
    document.getElementById('speech-preview').classList.add('hidden');
    
    document.getElementById('status-indicator').innerHTML = '<i data-lucide="keyboard" class="status-icon"></i> <span>Type your answer below:</span>';
    if (window.lucide) window.lucide.createIcons();

    const inputBar = document.getElementById('text-input-container');
    inputBar.classList.remove('hidden');
    
    const input = document.getElementById('input-text-answer');
    input.focus();
  },

  // Submit Answer from keyboard entry
  submitTextAnswer() {
    const textVal = document.getElementById('input-text-answer').value.trim();
    if (!textVal) return;
    
    document.getElementById('text-input-container').classList.add('hidden');
    this.submitAnswer(textVal);
  },

  // Process evaluation using Gemini API
  async submitAnswer(answerText) {
    SpeechManager.cancelSpeech();

    // Show loading state
    document.getElementById('status-indicator').innerHTML = '<i class="status-icon pulse-icon" data-lucide="loader-2"></i> <span>Evaluating with Gemini API...</span>';
    if (window.lucide) window.lucide.createIcons();

    const q = this.session.questions[this.session.currentIndex];
    
    try {
      const evalResult = await ApiClient.evaluateAnswer(q.question, q.expectedAnswer, answerText);
      this.displayFeedback(evalResult, answerText);
    } catch (err) {
      console.error(err);
      UiManager.showToast('評価の取得に失敗しました。');
      
      // Fallback simple validation if offline/error to let user advance
      const simpleCorrect = answerText.toLowerCase().replace(/[^a-z]/g,'') === q.expectedAnswer.toLowerCase().replace(/[^a-z]/g,'');
      this.displayFeedback({
        isCorrect: simpleCorrect,
        callanFeedback: 'Gemini評価エラー（オフライン）。簡易判定を行いました。',
        grammarFeedback: '',
        pronunciationFeedback: '',
        expectedCorrectFormat: q.expectedAnswer
      }, answerText);
    }
  },

  // Renders the AI evaluation feedback cards
  displayFeedback(evalResult, userAnswer) {
    const q = this.session.questions[this.session.currentIndex];
    const timeTaken = ((new Date() - this.session.currentQuestionStartTime) / 1000).toFixed(1);

    // Compute diffs
    const diffs = UiManager.renderWordDiff(evalResult.expectedCorrectFormat || q.expectedAnswer, userAnswer);

    // Pop and style panels
    const panel = document.getElementById('feedback-panel');
    panel.classList.remove('hidden');
    
    const isCorrect = evalResult.isCorrect;
    panel.className = `card glass feedback-card ${isCorrect ? 'correct' : 'incorrect'}`;

    document.getElementById('result-badge').textContent = isCorrect ? 'Correct' : 'Needs Practice';
    document.getElementById('result-time').textContent = `${timeTaken}秒`;
    
    // Set text displays (diff style)
    document.getElementById('result-user-answer').innerHTML = diffs.userHtml;
    document.getElementById('result-expected-answer').innerHTML = diffs.expectedHtml;

    document.getElementById('result-callan-feedback').textContent = evalResult.callanFeedback || 'フィードバックはありません。';
    
    // 💡 Grammar Tips display
    const grammarTip = document.getElementById('result-grammar-feedback');
    if (evalResult.grammarFeedback) {
      grammarTip.textContent = `💡 文法アドバイス: ${evalResult.grammarFeedback}`;
      grammarTip.classList.remove('hidden');
    } else {
      grammarTip.classList.add('hidden');
    }

    // 🗣️ Pronunciation Tips display
    const pronTip = document.getElementById('result-pronunciation-feedback');
    if (evalResult.pronunciationFeedback) {
      pronTip.textContent = `🗣️ 発音チェック: ${evalResult.pronunciationFeedback}`;
      pronTip.classList.remove('hidden');
    } else {
      pronTip.classList.add('hidden');
    }

    // Toggle button visibilities
    if (isCorrect) {
      document.getElementById('btn-retry-question').classList.add('hidden');
      this.session.correctCount += 1;
      
      // Save details to temporary array
      this.session.historyQuestions.push({
        id: q.id,
        question: q.question,
        answer: userAnswer,
        expected: q.expectedAnswer,
        isCorrect: true,
        timeTaken
      });
    } else {
      // Force repetition (Standard Callan methodology)
      document.getElementById('btn-retry-question').classList.remove('hidden');
      
      // Save details to temporary array
      this.session.historyQuestions.push({
        id: q.id,
        question: q.question,
        answer: userAnswer,
        expected: q.expectedAnswer,
        isCorrect: false,
        timeTaken
      });
    }

    // Scroll to bottom of lesson space to show feedback card on mobile
    setTimeout(() => {
      const content = document.querySelector('.app-content');
      content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
    }, 100);
  },

  // Forced repetition action (Try answering the same Q again)
  retryCurrentQuestion() {
    document.getElementById('feedback-panel').classList.add('hidden');
    
    // Clear last inputs
    document.getElementById('input-text-answer').value = '';
    
    // Play Q voice again and listen
    this.playCurrentQuestionVoice();
  },

  // Proceed to next question in queue or end lesson
  advanceQuestion() {
    const nextIdx = this.session.currentIndex + 1;
    if (nextIdx < this.session.questions.length) {
      this.updateLessonProgressBar();
      this.loadQuestion(nextIdx);
    } else {
      this.completeLesson();
    }
  },

  // Update progress bar at the top of lesson view
  updateLessonProgressBar() {
    const total = this.session.questions.length;
    const current = this.session.currentIndex;
    const percent = Math.round((current / total) * 100);
    
    document.getElementById('lesson-progress-fill').style.width = `${percent}%`;
    document.getElementById('lesson-progress-text').textContent = `${current} / ${total}`;
  },

  // Save progress, push history, and return to dashboard
  async completeLesson() {
    const s = this.session;
    
    const sessionRecord = {
      id: `session-${Date.now()}`,
      stage: s.stage,
      lesson: s.lesson,
      timestamp: new Date().toISOString(),
      questionsCount: s.questions.length,
      correctCount: s.correctCount,
      questions: s.historyQuestions
    };

    UiManager.showToast('レッスン完了！記録を保存しています...');

    // Save history & progress database
    await StorageManager.addHistoryEntry(sessionRecord);

    // Auto-advance curriculum progress if user completed their active lesson
    const p = StorageManager.getActiveProgress();
    if (s.stage === p.currentStage && s.lesson === p.currentLesson) {
      // Find next lesson
      const activeStageData = CurriculumManager.syllabus[s.stage];
      const nextLessonNum = s.lesson + 1;
      
      if (activeStageData.lessons[nextLessonNum]) {
        // Advance lesson
        await StorageManager.save({
          progress: { currentLesson: nextLessonNum }
        });
      } else {
        // Advance stage
        const nextStageNum = s.stage + 1;
        if (CurriculumManager.stageExists(nextStageNum)) {
          await StorageManager.save({
            progress: {
              currentStage: nextStageNum,
              currentLesson: 1
            }
          });
          UiManager.showToast(`おめでとうございます！Stage ${nextStageNum} に進級しました！`);
        }
      }
    }

    // Refresh metrics and return
    this.refreshDashboard();
    UiManager.showScreen('screen-dashboard');
    UiManager.showToast('レッスン完了！進捗を保存・同期しました。');
  },

  // End lesson session abruptly (cancelled by user)
  quitLesson() {
    SpeechManager.cancelSpeech();
    SpeechManager.stopListening();
    this.refreshDashboard();
    UiManager.showScreen('screen-dashboard');
  },

  // Toggle visibility of the question text
  toggleQuestionVisibility() {
    this.session.isQuestionVisible = !this.session.isQuestionVisible;
    const textEl = document.getElementById('tutor-question-text');
    const visBtn = document.getElementById('btn-toggle-question-visibility');

    if (this.session.isQuestionVisible) {
      textEl.classList.remove('question-blur');
      visBtn.innerHTML = '<i data-lucide="eye"></i>';
    } else {
      textEl.classList.add('question-blur');
      visBtn.innerHTML = '<i data-lucide="eye-off"></i>';
    }

    if (window.lucide) window.lucide.createIcons();
  }
};

// Start application on page load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
