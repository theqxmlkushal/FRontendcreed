/**
 * Session Service - Manage study sessions with timer functionality
 */

import storageService from './storageService';
import authService from './authService';
import { v4 as uuidv4 } from 'uuid';

class SessionService {
  constructor() {
    this.activeSession = null;
    this.timer = null;
    this.elapsedTime = 0;
    this.breakStartTime = null;
  }

  /**
   * Create a new study session
   * @param {Object} options - Session options
   * @param {string} options.userId - User ID
   * @param {string} options.workspaceName - Session name
   * @param {string} options.sessionType - Session type (recommended, standard, custom)
   * @param {string} options.youtubeUrl - YouTube video URL
   * @returns {Object} Created session object
   */
  createSession({ userId, workspaceName, sessionType, youtubeUrl }) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const session = {
      id: uuidv4(),
      userId,
      workspaceName,
      youtubeUrl,
      sessionType,
      startedAt: new Date().toISOString(),
      endedAt: null,
      duration: 0,
      breaks: [],
      status: 'active',
      quiz: null,
      quizResults: null
    };

    this.activeSession = session;
    this.elapsedTime = 0;
    this.startTimer();

    // Store in sessionStorage for active session
    sessionStorage.setItem('activeSession', JSON.stringify(session));

    return session;
  }

  /**
   * Get active session
   * @returns {Object|null} Active session or null
   */
  getActiveSession() {
    if (this.activeSession) {
      return this.activeSession;
    }

    // Try to restore from sessionStorage
    const stored = sessionStorage.getItem('activeSession');
    if (stored) {
      this.activeSession = JSON.parse(stored);
      // Restore timer if session is active
      if (this.activeSession.status === 'active') {
        this.elapsedTime = this.activeSession.duration * 1000;
        this.startTimer();
      }
      return this.activeSession;
    }

    return null;
  }

  /**
   * Update video URL for active session
   * @param {string} videoUrl - YouTube video URL
   */
  updateVideoUrl(videoUrl) {
    if (!this.activeSession) {
      throw new Error('No active session');
    }

    this.updateActiveSession({ videoUrl });
  }

  /**
   * Start timer
   */
  startTimer() {
    if (this.timer) return;

    const startTime = Date.now() - this.elapsedTime;
    this.timer = setInterval(() => {
      this.elapsedTime = Date.now() - startTime;
      this.updateActiveSession({ duration: Math.floor(this.elapsedTime / 1000) });
    }, 1000);
  }

  /**
   * Pause timer (for breaks)
   */
  pauseTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Start break
   * @param {string} sessionId - Session ID
   */
  startBreak(sessionId) {
    if (!this.activeSession || this.activeSession.id !== sessionId) {
      throw new Error('Session not found or not active');
    }

    this.pauseTimer();
    this.breakStartTime = new Date().toISOString();

    this.activeSession.breaks.push({
      startTime: this.breakStartTime,
      endTime: null
    });

    this.updateActiveSession({ status: 'on_break' });
  }

  /**
   * End break
   * @param {string} sessionId - Session ID
   */
  endBreak(sessionId) {
    if (!this.activeSession || this.activeSession.id !== sessionId) {
      throw new Error('Session not found or not active');
    }

    if (!this.breakStartTime) {
      throw new Error('No active break');
    }

    const breakEndTime = new Date().toISOString();
    const lastBreak = this.activeSession.breaks[this.activeSession.breaks.length - 1];
    lastBreak.endTime = breakEndTime;

    this.breakStartTime = null;
    this.startTimer();
    this.updateActiveSession({ status: 'active' });
  }

  /**
   * Complete session and store quiz
   * @param {string} sessionId - Session ID
   * @param {Object} quiz - Quiz data with questions
   * @returns {Object} Completed session
   */
  completeSession(sessionId, quiz) {
    if (!this.activeSession || this.activeSession.id !== sessionId) {
      throw new Error('Session not found or not active');
    }

    this.pauseTimer();

    const completedSession = {
      ...this.activeSession,
      endedAt: new Date().toISOString(),
      status: 'completed',
      quiz: quiz
    };

    // Save to localStorage
    const user = authService.getCurrentUser();
    if (user) {
      const sessions = storageService.get(`sessions_${user.id}`) || [];
      sessions.push(completedSession);
      storageService.set(`sessions_${user.id}`, sessions);
    }

    // Clear active session
    sessionStorage.removeItem('activeSession');
    this.activeSession = null;
    this.elapsedTime = 0;

    return completedSession;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null
   */
  getSessionById(sessionId) {
    const user = authService.getCurrentUser();
    if (!user) return null;

    const sessions = storageService.get(`sessions_${user.id}`) || [];
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Update session quiz results
   * @param {string} sessionId - Session ID
   * @param {Object} results - Quiz results
   */
  updateSessionQuizResults(sessionId, results) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const sessions = storageService.get(`sessions_${user.id}`) || [];
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    sessions[sessionIndex].quizResults = results;
    storageService.set(`sessions_${user.id}`, sessions);
  }

  /**
   * Update active session
   * @param {Object} updates - Fields to update
   */
  updateActiveSession(updates) {
    if (!this.activeSession) return;

    this.activeSession = { ...this.activeSession, ...updates };
    sessionStorage.setItem('activeSession', JSON.stringify(this.activeSession));
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of sessions
   */
  getUserSessions(userId) {
    if (!userId) return [];
    return storageService.get(`sessions_${userId}`) || [];
  }

  /**
   * Get session statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  getSessionStats(userId) {
    const sessions = this.getUserSessions(userId);

    const totalSessions = sessions.length;
    const totalStudyTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const completedQuizzes = sessions.filter(s => s.quiz && s.quizResults).length;
    const quizzesWithScores = sessions.filter(s => s.quizResults?.score !== null && s.quizResults?.score !== undefined);
    const averageScore = quizzesWithScores.length > 0
      ? quizzesWithScores.reduce((sum, s) => sum + s.quizResults.score, 0) / quizzesWithScores.length
      : 0;

    // Get sessions from this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklySessions = sessions.filter(s => 
      new Date(s.startedAt) >= oneWeekAgo
    );

    return {
      totalSessions,
      totalStudyTime,
      completedQuizzes,
      averageScore: Math.round(averageScore) || 0,
      sessionsThisWeek: weeklySessions.length,
      weeklySessions
    };
  }

  /**
   * Get dashboard overview data
   * @returns {Object} Dashboard data
   */
  getDashboardOverview() {
    const user = authService.getCurrentUser();
    if (!user) {
      return {
        completion_percentage: 0,
        total_sessions: 0,
        completed_tests: 0,
        pending_tests: 0,
        weekly_sessions: [],
        session_limit: {
          can_create: false,
          sessions_today: 0,
          max_sessions: 3,
          blocked_reason: 'Please sign in'
        },
        weak_points_count: 0,
        stats: {
          total_study_time: 0,
          sessions_this_week: 0
        }
      };
    }

    const stats = this.getSessionStats(user.id);
    const sessions = this.getUserSessions(user.id);

    // Calculate completion percentage
    const completedTests = sessions.filter(s => s.quiz && s.quizResults).length;
    const totalSessions = sessions.length;
    const completionPercentage = totalSessions > 0 
      ? (completedTests / totalSessions) * 100 
      : 0;

    // Get pending tests (completed sessions without quiz results)
    const pendingTests = sessions.filter(s => 
      s.status === 'completed' && s.quiz && !s.quizResults
    ).length;

    // Check session limit (max 3 per day)
    const today = new Date().toDateString();
    const sessionsToday = sessions.filter(s => 
      new Date(s.startedAt).toDateString() === today
    ).length;
    const canCreate = sessionsToday < 3;

    // Format weekly sessions for dashboard
    const weeklySessions = stats.weeklySessions.map(s => ({
      id: s.id,
      workspace_name: s.workspaceName,
      session_type: s.sessionType,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      study_duration_seconds: s.duration,
      is_completed: s.status === 'completed',
      test_status: {
        exists: !!s.quiz,
        completed: !!s.quizResults,
        score: s.quizResults?.score || null,
        assessment_id: s.id, // Use session ID as assessment ID
        expired: false,
        generating: false
      }
    }));

    return {
      completion_percentage: completionPercentage,
      total_sessions: totalSessions,
      completed_tests: completedTests,
      pending_tests: pendingTests,
      weekly_sessions: weeklySessions,
      session_limit: {
        can_create: canCreate,
        sessions_today: sessionsToday,
        max_sessions: 3,
        blocked_reason: canCreate ? null : 'You have reached the maximum of 3 sessions per day'
      },
      weak_points_count: 0,
      stats: {
        total_study_time: stats.totalStudyTime,
        sessions_this_week: stats.sessionsThisWeek
      }
    };
  }
}

// Export singleton instance
export default new SessionService();
