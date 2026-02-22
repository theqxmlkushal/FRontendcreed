/**
 * YouTube Service - Handle YouTube URL processing
 */

class YouTubeService {
  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID or null if invalid
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate YouTube URL
   * @param {string} url - YouTube URL
   * @returns {boolean} True if valid
   */
  isValidYouTubeUrl(url) {
    return this.extractVideoId(url) !== null;
  }

  /**
   * Get embed URL for video player
   * @param {string} urlOrVideoId - YouTube URL or video ID
   * @returns {string} Embed URL
   */
  getEmbedUrl(urlOrVideoId) {
    // If it's already a URL, extract the video ID first
    const videoId = this.extractVideoId(urlOrVideoId) || urlOrVideoId;
    return `https://www.youtube.com/embed/${videoId}?rel=0`;
  }
}

// Export singleton instance
export default new YouTubeService();
