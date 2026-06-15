/**
 * UI Module for Callan AI Tutor
 * Controls screen transitions, dashboard populating, modal triggers,
 * toast alerts, LCS-based comparison diff highlighting, and dynamic SVG illustrations.
 */

const UiManager = {
  activeScreenId: 'screen-dashboard',
  toastTimeout: null,

  init() {
    // Inject Lucide icons on start
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Navigate to a specific screen
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden');
      this.activeScreenId = screenId;
    }

    // Auto-scroll content area to top on transition
    const content = document.querySelector('.app-content');
    if (content) content.scrollTop = 0;
  },

  // Display a brief toast notification
  showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    
    // Clear any existing timeouts
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  },

  // Render curriculum dashboard list
  renderDashboard(progress, syllabus) {
    const container = document.getElementById('stages-list');
    container.innerHTML = '';

    const currentStage = progress.currentStage || 1;
    const currentLesson = progress.currentLesson || 1;
    const completedLessons = progress.completedLessons || [];

    Object.keys(syllabus).forEach(stageNum => {
      const stage = syllabus[stageNum];
      const isStageLocked = parseInt(stageNum) > currentStage;

      const stageCard = document.createElement('div');
      stageCard.className = `card stage-card ${isStageLocked ? 'locked' : ''}`;
      
      // Stage Header
      const header = `
        <div class="stage-header-row">
          <div class="stage-title-wrap">
            <h4>Stage ${stageNum}: ${stage.name.split(': ')[1] || stage.name}</h4>
            <p class="stage-desc">${stage.description}</p>
          </div>
          ${parseInt(stageNum) === currentStage ? '<span class="badge">現在進行中</span>' : ''}
        </div>
        <div class="lessons-list"></div>
      `;
      stageCard.innerHTML = header;
      
      const lessonsListContainer = stageCard.querySelector('.lessons-list');
      
      // Render Lessons in Stage
      Object.keys(stage.lessons).forEach(lessonNum => {
        const lesson = stage.lessons[lessonNum];
        const lessonCode = `stage-${stageNum}-lesson-${lessonNum}`;
        const isCompleted = completedLessons.includes(lessonCode);
        
        // Locked logic: locked if stage is locked, OR if previous lessons in this stage are not completed yet
        let isLessonLocked = isStageLocked;
        if (!isStageLocked && parseInt(stageNum) === currentStage) {
          isLessonLocked = parseInt(lessonNum) > currentLesson;
        }

        const button = document.createElement('button');
        button.className = `lesson-btn ${isCompleted ? 'completed' : ''} ${isLessonLocked ? 'locked' : ''}`;
        button.disabled = isLessonLocked;
        button.dataset.stage = stageNum;
        button.dataset.lesson = lessonNum;

        button.innerHTML = `
          <div class="lesson-btn-left">
            <span class="lesson-num">Lesson ${lessonNum}</span>
            <span class="lesson-name">${lesson.name.split(': ')[1] || lesson.name}</span>
          </div>
          <div class="lesson-btn-right">
            <i data-lucide="${isCompleted ? 'check' : isLessonLocked ? 'lock' : 'chevron-right'}"></i>
          </div>
        `;

        lessonsListContainer.appendChild(button);
      });

      container.appendChild(stageCard);
    });

    // Recreate Lucide Icons on newly rendered list items
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Render History panel list
  renderHistory(history) {
    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="calendar"></i>
          <p>履歴はまだありません。レッスンを始めましょう！</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    history.forEach((session, sIdx) => {
      const card = document.createElement('div');
      card.className = 'card glass history-card';

      const date = new Date(session.timestamp).toLocaleDateString('ja-JP', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const scorePercent = Math.round((session.correctCount / session.questionsCount) * 100) || 0;

      card.innerHTML = `
        <div class="history-card-header">
          <span class="history-card-title">Stage ${session.stage} - Lesson ${session.lesson}</span>
          <span class="history-card-date">${date}</span>
        </div>
        <div class="history-stats-row">
          <div class="history-stat-item">
            <span class="history-stat-val">${scorePercent}%</span>
            <span class="history-stat-lbl">正答率</span>
          </div>
          <div class="history-stat-item">
            <span class="history-stat-val">${session.correctCount}/${session.questionsCount}</span>
            <span class="history-stat-lbl">正解数</span>
          </div>
        </div>
        <button class="history-detail-toggle" data-index="${sIdx}">履歴の詳細を表示 <i data-lucide="chevron-down"></i></button>
        <div class="history-details hidden" id="history-details-${sIdx}"></div>
      `;

      const detailsContainer = card.querySelector(`#history-details-${sIdx}`);
      session.questions.forEach((q) => {
        const qRow = document.createElement('div');
        qRow.className = 'history-q-row';
        qRow.innerHTML = `
          <span class="history-q-text">Q: ${q.question}</span>
          <span class="history-a-text ${q.isCorrect ? 'corr' : 'inc'}">
            <i data-lucide="${q.isCorrect ? 'check' : 'x'}"></i> ${q.answer || '(無回答)'}
          </span>
          ${!q.isCorrect ? `<span class="history-expected-text expected-text" style="font-size: 0.75rem;">目標: ${q.expected}</span>` : ''}
        `;
        detailsContainer.appendChild(qRow);
      });

      container.appendChild(card);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Perform a Longest Common Subsequence (LCS) word-level diff
  // Highlights added/wrong words in red, missing words in green.
  renderWordDiff(expected, actual) {
    const cleanWord = w => w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
    
    // Split into words, stripping extra whitespaces
    const expList = expected.split(/\s+/).filter(Boolean);
    const actList = actual.split(/\s+/).filter(Boolean);
    
    const n = expList.length;
    const m = actList.length;
    
    // DP array for LCS
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (cleanWord(expList[i - 1]) === cleanWord(actList[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Backtrack to assemble matches, additions, and deletions
    let i = n, j = m;
    const diff = [];
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && cleanWord(expList[i - 1]) === cleanWord(actList[j - 1])) {
        diff.unshift({ type: 'match', word: actList[j - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        // Word present in student's answer but missing/different from target
        diff.unshift({ type: 'added', word: actList[j - 1] });
        j--;
      } else {
        // Word present in target but omitted by student
        diff.unshift({ type: 'removed', word: expList[i - 1] });
        i--;
      }
    }

    // Convert diff arrays to styled HTML string
    let userResultHtml = '';
    let targetResultHtml = '';

    diff.forEach(item => {
      if (item.type === 'match') {
        userResultHtml += `<span>${item.word}</span> `;
        targetResultHtml += `<span>${item.word}</span> `;
      } else if (item.type === 'added') {
        userResultHtml += `<span class="diff-removed">${item.word}</span> `;
      } else if (item.type === 'removed') {
        targetResultHtml += `<span class="diff-added">${item.word}</span> `;
      }
    });

    return {
      userHtml: userResultHtml.trim(),
      expectedHtml: targetResultHtml.trim()
    };
  },

  // Draw SVG illustrations dynamically based on active Q ID (visual cues for student)
  renderIllustration(questionId) {
    const el = document.getElementById('question-illustration');
    if (!el) return;

    const svgs = {
      // Stage 1 Lesson 1
      's1-l1-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M70 20 L80 30 L35 75 L20 80 L25 65 Z" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="30" y1="60" x2="40" y2="70" stroke="var(--secondary)" stroke-width="2"/><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/></svg>`, // Pen
      's1-l1-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M15 55 L85 55 L75 85 M25 85 L25 55" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M45 45 L45 25 L65 25 L65 45 M55 45 L55 85" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/></svg>`, // Table & Chair
      's1-l1-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M10 50 L90 50 L80 55 L20 55 Z" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/></svg>`, // Long bar (pen)
      's1-l1-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M20 25 L50 35 L80 25 L80 75 L50 85 L20 75 Z M50 35 L50 85" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 38 L45 43 M30 50 L45 55 M30 62 L45 67" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"/><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/></svg>`, // Book
      's1-l1-q5': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M50 25 L75 37 L75 67 L50 80 L25 67 L25 37 Z" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M25 37 L50 50 L75 37 M50 50 L50 80" stroke="var(--secondary)" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/></svg>`, // Small Box

      // Stage 1 Lesson 2
      's1-l2-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M20 60 L50 70 L80 60 L80 85 L50 95 L20 85 Z M50 70 L50 95" stroke="var(--primary)" stroke-width="2" fill="none"/><path d="M40 35 L70 25 L50 50 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Pen on Book
      's1-l2-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M50 20 L80 32 L80 62 L50 75 L20 62 L20 32 Z M20 32 L50 45 L80 32 M50 45 L50 75" stroke="var(--primary)" stroke-width="2" fill="none"/><line x1="25" y1="85" x2="75" y2="85" stroke="var(--secondary)" stroke-width="2"/><circle cx="50" cy="85" r="4" fill="var(--secondary)"/></svg>`, // Pencil under Box
      's1-l2-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><circle cx="50" cy="25" r="8" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M50 33 L50 55 L70 55 L80 80 M50 55 L35 70 L35 85" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M25 60 L45 60 L45 85" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Sitting
      's1-l2-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><rect x="15" y="25" width="40" height="40" stroke="var(--primary)" stroke-width="2" fill="none"/><line x1="35" y1="25" x2="35" y2="65" stroke="var(--primary)" stroke-width="1.5"/><circle cx="75" cy="40" r="7" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M75 47 L75 85 M75 55 L60 70 M75 55 L90 70" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Standing next to window

      // Stage 1 Lesson 3
      's1-l3-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M20 30 L30 40 L15 75 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M50 30 L60 40 L45 75 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M80 30 L90 40 L75 75 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Plural Pens
      's1-l3-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M25 40 L50 50 L75 40 L75 80 L50 90 L25 80 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M35 25 L60 35 L85 25 L85 65 L60 75 L35 65 Z" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Plural Books
      's1-l3-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M15 45 L50 60 L85 45 L85 85 L50 95 L15 85 Z M50 60 L50 95" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M15 45 L5 25 L40 40 M85 45 L95 25 L60 40" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Open box
      's1-l3-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><rect x="20" y="20" width="60" height="60" stroke="var(--secondary)" stroke-width="2" fill="none"/><line x1="50" y1="20" x2="50" y2="80" stroke="var(--secondary)" stroke-width="1.5"/><line x1="20" y1="50" x2="80" y2="50" stroke="var(--secondary)" stroke-width="1.5"/></svg>`, // Window Closed

      // Stage 2 Lesson 1
      's2-l1-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><circle cx="50" cy="20" r="8" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M50 28 L50 65 M50 65 L40 90 M50 65 L60 90 M50 35 L30 50 M50 35 L70 50" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Standing
      's2-l1-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M25 65 C25 45 40 30 60 30 C75 30 85 45 85 55 C85 65 75 75 60 75 L45 75 L30 85 L35 70 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><line x1="45" y1="50" x2="65" y2="50" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/><line x1="45" y1="58" x2="75" y2="58" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/></svg>`, // Speech bubble
      's2-l1-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><rect x="20" y="30" width="45" height="50" rx="3" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M75 25 L85 35 L55 65 L45 65 L45 55 Z" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Student Writing
      's2-l1-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><circle cx="40" cy="30" r="8" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M40 38 L40 70 M40 70 L30 90 M40 70 L50 90 M40 45 L20 30 M40 45 L65 15" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Student answering (raise hand)

      // Stage 2 Lesson 2
      's2-l2-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M30 40 L60 50 L90 40 L90 80 L60 90 L30 80 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M10 25 L25 35 L15 15 Z" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Point to Book
      's2-l2-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M35 20 L65 20 L75 50 L60 50 L55 85 L45 85 L40 50 L25 50 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M80 60 L95 70 L85 50 Z" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Coat / Point to Coat
      's2-l2-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><path d="M20 35 L40 55 L15 85 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><path d="M50 35 L70 55 L45 85 Z" stroke="var(--secondary)" stroke-width="2" fill="none"/><circle cx="75" cy="40" r="10" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Pencils
      's2-l2-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><rect x="15" y="20" width="70" height="50" rx="4" stroke="var(--secondary)" stroke-width="2" fill="none"/><line x1="15" y1="60" x2="85" y2="60" stroke="var(--secondary)" stroke-width="1.5"/><rect x="35" y="30" width="30" height="20" stroke="var(--primary)" stroke-width="1.5" fill="none"/></svg>`, // Classroom

      // Stage 3 Lesson 1
      's3-l1-q1': `<svg viewBox="0 0 100 100" class="svg-line-art"><circle cx="30" cy="50" r="22" stroke="var(--secondary)" stroke-width="3" fill="none"/><circle cx="75" cy="50" r="12" stroke="var(--primary)" stroke-width="2" fill="none"/></svg>`, // Bigger vs Smaller Circle
      's3-l1-q2': `<svg viewBox="0 0 100 100" class="svg-line-art"><rect x="15" y="20" width="30" height="60" stroke="var(--secondary)" stroke-width="3" fill="none"/><rect x="60" y="30" width="25" height="40" stroke="var(--primary)" stroke-width="1.5" fill="none"/></svg>`, // Wider door vs narrower window
      's3-l1-q3': `<svg viewBox="0 0 100 100" class="svg-line-art"><circle cx="35" cy="50" r="3" stroke="var(--primary)" stroke-width="1.5" fill="none"/><path d="M55 55 L75 55 L70 70 M60 70 L60 55" stroke="var(--secondary)" stroke-width="2" fill="none"/></svg>`, // Fly vs Dog
      's3-l1-q4': `<svg viewBox="0 0 100 100" class="svg-line-art"><line x1="10" y1="35" x2="80" y2="35" stroke="var(--secondary)" stroke-width="3"/><line x1="10" y1="65" x2="50" y2="65" stroke="var(--primary)" stroke-width="2"/></svg>` // Longer table vs shorter room
    };

    if (svgs[questionId]) {
      el.innerHTML = svgs[questionId];
      el.classList.remove('hidden');
    } else {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  }
};
window.UiManager = UiManager;
