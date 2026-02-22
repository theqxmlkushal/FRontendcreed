/**
 * Storage Service - Abstraction layer over localStorage
 * Provides namespaced storage operations with error handling
 */

const STORAGE_PREFIX = 'velocity_';

class StorageService {
  constructor() {
    this.prefix = STORAGE_PREFIX;
  }

  /**
   * Store a value in localStorage with namespacing
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON stringified)
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const prefixedKey = `${this.prefix}${key}`;
      localStorage.setItem(prefixedKey, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear old data.');
      }
      throw error;
    }
  }

  /**
   * Retrieve a value from localStorage
   * @param {string} key - Storage key
   * @returns {any} Parsed value or null if not found
   */
  get(key) {
    try {
      const prefixedKey = `${this.prefix}${key}`;
      const item = localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a value from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    const prefixedKey = `${this.prefix}${key}`;
    localStorage.removeItem(prefixedKey);
  }

  /**
   * Clear all velocity-prefixed items from localStorage
   */
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }

  // ============ USER OPERATIONS ============

  /**
   * Save a new user to localStorage
   * @param {Object} user - User object
   */
  saveUser(user) {
    const users = this.get('users') || [];
    users.push(user);
    this.set('users', users);
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null
   */
  getUser(email) {
    const users = this.get('users') || [];
    return users.find(u => u.email === email);
  }

  // ============ SESSION OPERATIONS ============

  /**
   * Save all sessions for a user
   * @param {string} userId - User ID
   * @param {Array} sessions - Array of session objects
   */
  saveSessions(userId, sessions) {
    this.set(`sessions_${userId}`, sessions);
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of session objects
   */
  getSessions(userId) {
    return this.get(`sessions_${userId}`) || [];
  }

  /**
   * Add a new session for a user
   * @param {string} userId - User ID
   * @param {Object} session - Session object
   */
  addSession(userId, session) {
    const sessions = this.getSessions(userId);
    sessions.push(session);
    this.saveSessions(userId, sessions);
  }

  // ============ AUTH TOKEN OPERATIONS ============

  /**
   * Set authentication token
   * @param {string} token - Auth token
   */
  setAuthToken(token) {
    this.set('auth_token', token);
  }

  /**
   * Get authentication token
   * @returns {string|null} Auth token or null
   */
  getAuthToken() {
    return this.get('auth_token');
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.remove('auth_token');
  }
}

// Export singleton instance
export default new StorageService();
