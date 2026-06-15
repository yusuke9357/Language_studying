/**
 * Storage & Sync Module for Callan AI Tutor
 * Manages localStorage caching and cloud-sync with GitHub Gist.
 * Supports multi-user isolation by keying progress/history by username.
 */

const StorageManager = {
  // App state database structure
  db: {
    apiKey: '',
    githubToken: '',
    gistId: '',
    users: {}, // Map of usernames -> { progress: {...}, history: [...] }
    currentUser: '', // Currently logged in user (e.g. 'yusuke')
    settings: {
      voiceName: '',
      rate: 1.1,
      pitch: 1.0,
      volume: 0.9
    }
  },

  // Key used in browser localStorage
  localStorageKey: 'callan_ai_tutor_db',

  // Initialize data
  async init() {
    this.loadLocal();
    
    // If GitHub credentials exist, sync down from cloud
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
      } catch (err) {
        console.warn('Failed to sync with Gist during initialization (offline?).', err);
        return { success: true, synced: false, error: err.message };
      }
    }
    return { success: true, synced: false };
  },

  // Load from localStorage
  loadLocal() {
    const raw = localStorage.getItem(this.localStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        
        // Setup initial database
        this.db = {
          ...this.db,
          ...parsed,
          users: parsed.users || {},
          settings: { ...this.db.settings, ...(parsed.settings || {}) }
        };

        // --- Backward Compatibility Migration ---
        // If there is legacy progress/history at the root level, migrate it to the active user
        if (parsed.progress && Object.keys(this.db.users).length === 0) {
          const defaultUser = parsed.currentUser || 'guest';
          this.db.users[defaultUser] = {
            progress: parsed.progress,
            history: parsed.history || []
          };
          this.db.currentUser = defaultUser;
        }

        // Clean up root level legacy items from active db
        delete this.db.progress;
        delete this.db.history;

      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }
  },

  // Save to localStorage
  saveLocal() {
    // Make a copy of db to avoid mutation issues
    const output = { ...this.db };
    localStorage.setItem(this.localStorageKey, JSON.stringify(output));
  },

  // Switch the active user
  setCurrentUser(username) {
    const cleanUser = (username || 'guest').trim().toLowerCase();
    this.db.currentUser = cleanUser;

    // Initialize user if not exists
    if (!this.db.users[cleanUser]) {
      this.db.users[cleanUser] = {
        progress: {
          currentStage: 1,
          currentLesson: 1,
          streak: 0,
          lastActiveDate: null,
          totalAnswered: 0,
          correctAnswers: 0,
          completedLessons: [] // List of completed lesson keys
        },
        history: []
      };
    }
    this.saveLocal();
  },

  // Get current user's progress
  getActiveProgress() {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }
    return this.db.users[user].progress;
  },

  // Get current user's history
  getActiveHistory() {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }
    return this.db.users[user].history || [];
  },

  // Save data locally and sync to cloud
  async save(newData = {}) {
    const user = this.db.currentUser || 'guest';
    if (!this.db.users[user]) {
      this.setCurrentUser(user);
    }

    // Merge updates
    if (newData.progress) {
      this.db.users[user].progress = {
        ...this.db.users[user].progress,
        ...newData.progress
      };
    }
    if (newData.history) {
      this.db.users[user].history = newData.history;
    }
    
    if (newData.settings) this.db.settings = { ...this.db.settings, ...newData.settings };
    if (newData.apiKey !== undefined) this.db.apiKey = newData.apiKey;
    if (newData.githubToken !== undefined) this.db.githubToken = newData.githubToken;
    if (newData.gistId !== undefined) this.db.gistId = newData.gistId;

    this.saveLocal();

    // Trigger Gist push if sync configured
    if (this.db.githubToken && this.db.gistId) {
      try {
        await this.pushToGist();
        return { success: true, synced: true };
      } catch (err) {
        console.error('Gist sync failed', err);
        return { success: true, synced: false, error: err.message };
      }
    }
    return { success: true, synced: false };
  },

  // Check if minimum configuration (Gemini Key) is present
  isConfigured() {
    return !!this.db.apiKey;
  },

  // Merge cloud data into local state
  mergeData(cloudData) {
    // Maintain settings and credentials
    if (cloudData.apiKey) this.db.apiKey = cloudData.apiKey;
    if (cloudData.settings) this.db.settings = { ...this.db.settings, ...cloudData.settings };

    // Migrate old Gist format if cloud data has legacy progress/history at root
    if (cloudData.progress && !cloudData.users) {
      const defaultUser = cloudData.currentUser || 'guest';
      this.db.users[defaultUser] = {
        progress: cloudData.progress,
        history: cloudData.history || []
      };
      return;
    }

    // Merge multi-user structure
    if (cloudData.users) {
      Object.keys(cloudData.users).forEach(user => {
        const cloudUser = cloudData.users[user];
        const localUser = this.db.users[user];

        if (!localUser) {
          // If user doesn't exist locally, copy entirely
          this.db.users[user] = cloudUser;
        } else {
          // Compare answered stats to merge latest progress
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

  // Reset database
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

  // Add a lesson session to history and update overall stats
  async addHistoryEntry(session) {
    const user = this.db.currentUser || 'guest';
    const progress = this.getActiveProgress();
    const history = this.getActiveHistory();

    const updatedHistory = [session, ...history];
    
    // Keep max 50 entries
    const slicedHistory = updatedHistory.slice(0, 50);

    // Update statistics
    const prevAnswered = progress.totalAnswered || 0;
    const prevCorrect = progress.correctAnswers || 0;
    
    const newAnswered = prevAnswered + session.questionsCount;
    const newCorrect = prevCorrect + session.correctCount;

    // Check Streak
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
        currentStreak += 1; // Continuous streak
      } else if (lastActiveStr !== todayStr) {
        currentStreak = 1; // Streak broken, reset
      }
    }

    // Add completed lesson code
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

  /* --- GitHub Gist API Actions --- */

  // Fetch Gist data
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

  // Push local database to Gist
  async pushToGist() {
    const url = `https://api.github.com/gists/${this.db.gistId}`;
    
    // We send credentials, user configurations, and settings
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

  // Test credentials (validates token)
  async testConnection(token, gistId, geminiKey) {
    const results = { github: false, gist: false, gemini: false, errors: [] };

    // 1. Test GitHub Token
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
      } catch (e) {
        results.errors.push(`GitHub Network: ${e.message}`);
      }
    }

    // 2. Test Gist ID
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
      } catch (e) {
        results.errors.push(`Gist Network: ${e.message}`);
      }
    }

    // 3. Test Gemini API
    if (geminiKey) {
      try {
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
      } catch (e) {
        results.errors.push(`Gemini Network: ${e.message}`);
      }
    }

    return results;
  },

  // Create a private Gist for sync
  async createSyncGist(token) {
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
window.StorageManager = StorageManager;
