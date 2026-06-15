export interface UserProgress {
  currentStage: number;
  currentLesson: number;
  streak: number;
  lastActiveDate: string | null;
  totalAnswered: number;
  correctAnswers: number;
  completedLessons: string[];
}

export interface QuestionHistoryEntry {
  id: string;
  question: string;
  expectedAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  callanFeedback: string;
  grammarFeedback: string;
  pronunciationFeedback: string;
}

export interface SessionHistory {
  date: string;
  stage: number;
  lesson: number;
  questionsCount: number;
  correctCount: number;
  score: number;
  duration: number; // in seconds
  questions: QuestionHistoryEntry[];
}

export interface AppSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface UserData {
  progress: UserProgress;
  history: SessionHistory[];
}

export interface AppDatabase {
  apiKey: string;
  githubToken: string;
  gistId: string;
  users: { [username: string]: UserData };
  currentUser: string;
  settings: AppSettings;
}

export const StorageManager = {
  db: {
    apiKey: '',
    githubToken: '',
    gistId: '',
    users: {},
    currentUser: '',
    settings: {
      voiceName: '',
      rate: 1.1,
      pitch: 1.0,
      volume: 0.9
    }
  } as AppDatabase,

  localStorageKey: 'callan_ai_tutor_db',

  async init(): Promise<{ success: boolean; synced: boolean; error?: string }> {
    this.loadLocal();
    
    if (this.db.githubToken && this.db.gistId) {
      try {
        console.log('Synchronizing with GitHub Gist...');
        const cloudData = await this.fetchFromGist();
        if (cloudData) {
          this.mergeData(cloudData);
          this.saveLocal();
          console.log('Synchronization complete. Data merged.');
          return { success: true, synced: true };
        }
      } catch (err: any) {
        console.warn('Failed to sync with Gist during initialization (offline?).', err);
        return { success: true, synced: false, error: err.message };
      }
    }
    return { success: true, synced: false };
  },

  loadLocal() {
    const raw = localStorage.getItem(this.localStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        
        this.db = {
          ...this.db,
          ...parsed,
          users: parsed.users || {},
          settings: { ...this.db.settings, ...(parsed.settings || {}) }
        };

        // Backward Compatibility Migration (from very early single-user version)
        if (parsed.progress && Object.keys(this.db.users).length === 0) {
          const defaultUser = parsed.currentUser || 'guest';
          this.db.users[defaultUser] = {
            progress: parsed.progress,
            history: parsed.history || []
          };
          this.db.currentUser = defaultUser;
        }

        // Clean up root level legacy items from active db
        delete (this.db as any).progress;
        delete (this.db as any).history;

      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }
  },

  saveLocal() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.db));
  },

  setCurrentUser(username: string) {
    const cleanUser = (username || 'guest').trim().toLowerCase();
    this.db.currentUser = cleanUser;

    if (!this.db.users[cleanUser]) {
      this.db.users[cleanUser] = {
        progress: {
          currentStage: 1,
          currentLesson: 1,
          streak: 0,
          lastActiveDate: null,
          totalAnswered: 0,
          correctAnswers: 0,
          completedLessons: []
        },
        history: []
      };
    }
    this.saveLocal();
  },

  getActiveProgress(): UserProgress {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }
    return this.db.users[user].progress;
  },

  getActiveHistory(): SessionHistory[] {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }
    return this.db.users[user].history || [];
  },

  async save(newData: {
    progress?: Partial<UserProgress>;
    history?: SessionHistory[];
    settings?: Partial<AppSettings>;
    apiKey?: string;
    githubToken?: string;
    gistId?: string;
  }): Promise<{ success: boolean; synced: boolean; error?: string }> {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }

    if (newData.progress) {
      this.db.users[user].progress = {
        ...this.db.users[user].progress,
        ...newData.progress
      };
    }
    if (newData.history) {
      this.db.users[user].history = newData.history;
    }
    
    if (newData.settings) {
      this.db.settings = { ...this.db.settings, ...newData.settings };
    }
    if (newData.apiKey !== undefined) this.db.apiKey = newData.apiKey;
    if (newData.githubToken !== undefined) this.db.githubToken = newData.githubToken;
    if (newData.gistId !== undefined) this.db.gistId = newData.gistId;

    this.saveLocal();

    if (this.db.githubToken && this.db.gistId) {
      try {
        await this.pushToGist();
        return { success: true, synced: true };
      } catch (err: any) {
        console.error('Gist sync failed', err);
        return { success: true, synced: false, error: err.message };
      }
    }
    return { success: true, synced: false };
  },

  isConfigured(): boolean {
    return !!this.db.apiKey;
  },

  mergeData(cloudData: any) {
    if (cloudData.apiKey) this.db.apiKey = cloudData.apiKey;
    if (cloudData.settings) {
      this.db.settings = { ...this.db.settings, ...cloudData.settings };
    }

    // Migrate old Gist format if cloud data has legacy progress/history at root
    if (cloudData.progress && !cloudData.users) {
      const defaultUser = cloudData.currentUser || 'guest';
      this.db.users[defaultUser] = {
        progress: cloudData.progress,
        history: cloudData.history || []
      };
      return;
    }

    if (cloudData.users) {
      Object.keys(cloudData.users).forEach(user => {
        const cloudUser = cloudData.users[user];
        const localUser = this.db.users[user];

        if (!localUser) {
          this.db.users[user] = cloudUser;
        } else {
          const cloudTotal = (cloudUser.progress && cloudUser.progress.totalAnswered) || 0;
          const localTotal = (localUser.progress && localUser.progress.totalAnswered) || 0;
          
          if (cloudTotal >= localTotal) {
            this.db.users[user] = {
              progress: { ...localUser.progress, ...cloudUser.progress },
              history: cloudUser.history || []
            };
          }
        }
      });
    }
  },

  async resetAll() {
    this.db = {
      apiKey: '',
      githubToken: '',
      gistId: '',
      users: {},
      currentUser: '',
      settings: {
        voiceName: '',
        rate: 1.1,
        pitch: 1.0,
        volume: 0.9
      }
    };
    this.saveLocal();
    localStorage.removeItem(this.localStorageKey);
  },

  async addHistoryEntry(session: Omit<SessionHistory, 'date'>) {
    const progress = this.getActiveProgress();
    const history = this.getActiveHistory();

    const newSession: SessionHistory = {
      ...session,
      date: new Date().toISOString()
    };

    const updatedHistory = [newSession, ...history];
    const slicedHistory = updatedHistory.slice(0, 50);

    const prevAnswered = progress.totalAnswered || 0;
    const prevCorrect = progress.correctAnswers || 0;
    
    const newAnswered = prevAnswered + session.questionsCount;
    const newCorrect = prevCorrect + session.correctCount;

    let currentStreak = progress.streak || 0;
    const todayStr = new Date().toDateString();
    const lastActive = progress.lastActiveDate;

    if (!lastActive) {
      currentStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      const lastActiveStr = new Date(lastActive).toDateString();

      if (lastActiveStr === yesterdayStr) {
        currentStreak += 1;
      } else if (lastActiveStr !== todayStr) {
        currentStreak = 1;
      }
    }

    const lessonCode = `stage-${session.stage}-lesson-${session.lesson}`;
    const completedList = [...(progress.completedLessons || [])];
    if (!completedList.includes(lessonCode)) {
      completedList.push(lessonCode);
    }

    await this.save({
      history: slicedHistory,
      progress: {
        totalAnswered: newAnswered,
        correctAnswers: newCorrect,
        streak: currentStreak,
        lastActiveDate: new Date().toISOString(),
        completedLessons: completedList
      }
    });
  },

  async fetchFromGist() {
    const url = `https://api.github.com/gists/${this.db.gistId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${this.db.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText} (${response.status})`);
    }

    const gist = await response.json();
    const file = gist.files['callan_db.json'];
    if (!file || !file.content) {
      return null;
    }

    return JSON.parse(file.content);
  },

  async pushToGist() {
    const url = `https://api.github.com/gists/${this.db.gistId}`;
    
    const syncPayload = {
      apiKey: this.db.apiKey,
      users: this.db.users,
      settings: this.db.settings
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${this.db.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'callan_db.json': {
            content: JSON.stringify(syncPayload, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText} (${response.status})`);
    }
  },

  async testConnection(token: string, gistId: string, geminiKey: string) {
    const results = { github: false, gist: false, gemini: false, errors: [] as string[] };

    if (token) {
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `token ${token}` }
        });
        if (userRes.ok) {
          results.github = true;
        } else {
          results.errors.push(`GitHub Token: ${userRes.statusText}`);
        }
      } catch (e: any) {
        results.errors.push(`GitHub Network: ${e.message}`);
      }
    }

    if (token && gistId) {
      try {
        const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (gistRes.ok) {
          results.gist = true;
        } else {
          results.errors.push(`Gist ID: ${gistRes.statusText}`);
        }
      } catch (e: any) {
        results.errors.push(`Gist Network: ${e.message}`);
      }
    }

    if (geminiKey) {
      try {
        // Test using the recommended models in v1beta
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with OK.' }] }]
          })
        });
        if (geminiRes.ok) {
          results.gemini = true;
        } else {
          results.errors.push(`Gemini API: Status ${geminiRes.status}`);
        }
      } catch (e: any) {
        results.errors.push(`Gemini Network: ${e.message}`);
      }
    }

    return results;
  },

  async createSyncGist(token: string): Promise<string> {
    if (!token) throw new Error('Token is required');

    const initialPayload = {
      apiKey: this.db.apiKey || '',
      users: this.db.users,
      settings: this.db.settings
    };

    const url = 'https://api.github.com/gists';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Callan AI Tutor Sync Data (Private)',
        public: false,
        files: {
          'callan_db.json': {
            content: JSON.stringify(initialPayload, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub Gist Creation failed: ${response.statusText} (${response.status})`);
    }

    const gist = await response.json();
    return gist.id;
  }
};
