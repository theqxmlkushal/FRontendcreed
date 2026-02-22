/**
 * Authentication Service - Mock authentication using localStorage
 * Accepts any email/password combination for demo purposes
 */

import storageService from './storageService';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  /**
   * Sign up a new user (accepts any credentials)
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User full name
   * @returns {Object} User object and auth token
   */
  signup(email, password, name) {
    // Validate inputs are non-empty
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }

    // Check if user already exists
    const existingUser = storageService.getUser(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user object
    const user = {
      id: uuidv4(),
      email,
      password, // In production, this would be hashed
      name,
      createdAt: new Date().toISOString()
    };

    // Save user
    storageService.saveUser(user);

    // Create auth token
    const token = this.createAuthToken(user);
    storageService.setAuthToken(token);

    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Sign in a user (accepts any credentials for demo)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User object and auth token
   */
  signin(email, password) {
    // Validate inputs are non-empty
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Check if user exists
    let user = storageService.getUser(email);

    // If user doesn't exist, create them automatically (mock behavior)
    if (!user) {
      user = {
        id: uuidv4(),
        email,
        password,
        name: email.split('@')[0], // Use email prefix as name
        createdAt: new Date().toISOString()
      };
      storageService.saveUser(user);
    }

    // Create auth token
    const token = this.createAuthToken(user);
    storageService.setAuthToken(token);

    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Sign out current user
   */
  signout() {
    storageService.clearAuthToken();
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    const token = storageService.getAuthToken();
    if (!token) return null;

    try {
      // Decode token (simple base64 for mock)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now()) {
        this.signout();
        return null;
      }

      const user = storageService.getUser(payload.email);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  /**
   * Create mock JWT-like token
   * @param {Object} user - User object
   * @returns {string} Mock JWT token
   */
  createAuthToken(user) {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      email: user.email,
      id: user.id,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    }));
    return `${header}.${payload}.mock`;
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

// Export singleton instance
export default new AuthService();
