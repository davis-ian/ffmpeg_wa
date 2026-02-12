// FFmpeg Service - Singleton Pattern for centralized video processing
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CORE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

/**
 * FFmpegService - Centralized video processing service
 * Uses singleton pattern to share one FFmpeg instance across the app
 */
class FFmpegService {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadError = null;
    this.logCallbacks = new Set();
    this.progressCallbacks = new Set();
    this.capturedLogs = [];
  }

  /**
   * Subscribe to log events
   * @param {Function} callback - Receives { type, message }
   * @returns {Function} Unsubscribe function
   */
  onLog(callback) {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  /**
   * Subscribe to progress events
   * @param {Function} callback - Receives { progress, time }
   * @returns {Function} Unsubscribe function
   */
  onProgress(callback) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Get captured logs (useful for parsing metadata)
   * @returns {Array} Array of log entries
   */
  getCapturedLogs() {
    return [...this.capturedLogs];
  }

  /**
   * Clear captured logs
   */
  clearLogs() {
    this.capturedLogs = [];
  }

  /**
   * Internal log handler
   */
  _handleLog({ type, message }) {
    // Store logs for later parsing
    this.capturedLogs.push({ type, message, timestamp: Date.now() });
    
    // Forward to subscribers
    this.logCallbacks.forEach(cb => {
      try {
        cb({ type, message });
      } catch (err) {
        console.error('Log callback error:', err);
      }
    });
  }

  /**
   * Internal progress handler
   */
  _handleProgress({ progress, time }) {
    this.progressCallbacks.forEach(cb => {
      try {
        cb({ progress, time });
      } catch (err) {
        console.error('Progress callback error:', err);
      }
    });
  }

  /**
   * Load FFmpeg WASM
   * @returns {Promise<boolean>} Success status
   */
  async load() {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.loadError = null;
    this.clearLogs();

    try {
      const ffmpeg = new FFmpeg();

      // Set up event handlers
      ffmpeg.on('log', this._handleLog.bind(this));
      ffmpeg.on('progress', this._handleProgress.bind(this));

      // Load WASM modules
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${FFMPEG_CORE_URL}/ffmpeg-core.js`,
          'text/javascript'
        ),
        wasmURL: await toBlobURL(
          `${FFMPEG_CORE_URL}/ffmpeg-core.wasm`,
          'application/wasm'
        ),
      });

      this.ffmpeg = ffmpeg;
      this.isLoaded = true;
      this.isLoading = false;
      
      console.log('[FFmpegService] Loaded successfully');
      return true;

    } catch (error) {
      this.isLoading = false;
      this.loadError = error.message;
      console.error('[FFmpegService] Failed to load:', error);
      throw error;
    }
  }

  /**
   * Get FFmpeg instance (throws if not loaded)
   * @returns {FFmpeg} FFmpeg instance
   */
  getInstance() {
    if (!this.isLoaded || !this.ffmpeg) {
      throw new Error('FFmpeg not loaded. Call load() first.');
    }
    return this.ffmpeg;
  }

  /**
   * Check if FFmpeg is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isLoaded;
  }

  /**
   * Write file to FFmpeg virtual filesystem
   * @param {string} name - Filename
   * @param {Uint8Array|File} data - File data
   */
  async writeFile(name, data) {
    const ffmpeg = this.getInstance();
    const fileData = data instanceof File ? await fetchFile(data) : data;
    await ffmpeg.writeFile(name, fileData);
  }

  /**
   * Read file from FFmpeg virtual filesystem
   * @param {string} name - Filename
   * @returns {Uint8Array} File data
   */
  async readFile(name) {
    const ffmpeg = this.getInstance();
    return await ffmpeg.readFile(name);
  }

  /**
   * Delete file from FFmpeg virtual filesystem
   * @param {string} name - Filename
   */
  async deleteFile(name) {
    const ffmpeg = this.getInstance();
    await ffmpeg.deleteFile(name);
  }

  /**
   * Execute FFmpeg command
   * @param {string[]} args - Command arguments
   * @returns {Promise<number>} Exit code
   */
  async exec(args) {
    const ffmpeg = this.getInstance();
    return await ffmpeg.exec(args);
  }

  /**
   * Terminate FFmpeg instance
   */
  async terminate() {
    if (this.ffmpeg) {
      await this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
      this.isLoading = false;
      this.clearLogs();
      this.logCallbacks.clear();
      this.progressCallbacks.clear();
    }
  }

  /**
   * Process a video file with given FFmpeg arguments
   * @param {File} inputFile - Input video file
   * @param {string} inputName - Virtual filename for input
   * @param {string[]} ffmpegArgs - FFmpeg command arguments
   * @param {string} outputName - Virtual filename for output
   * @returns {Promise<Uint8Array>} Output file data
   */
  async processVideo(inputFile, inputName, ffmpegArgs, outputName) {
    // Write input file
    await this.writeFile(inputName, inputFile);
    
    // Execute command
    const exitCode = await this.exec(ffmpegArgs);
    
    if (exitCode !== 0) {
      throw new Error(`FFmpeg process failed with exit code ${exitCode}`);
    }
    
    // Read output file
    const outputData = await this.readFile(outputName);
    
    // Cleanup
    await this.deleteFile(inputName);
    await this.deleteFile(outputName);
    
    return outputData;
  }

  /**
   * Extract metadata from video file
   * @param {File} file - Video file
   * @returns {Promise<Object>} Parsed metadata
   */
  async extractMetadata(file) {
    const inputName = `input_${Date.now()}_${file.name}`;
    
    // Clear previous logs
    this.clearLogs();
    
    // Write file
    await this.writeFile(inputName, file);
    
    // Run FFmpeg to capture metadata (goes to stderr)
    await this.exec(['-i', inputName, '-c', 'copy', '-f', 'null', '-']);
    
    // Cleanup
    await this.deleteFile(inputName);
    
    // Parse captured logs
    return this._parseMetadata(this.getCapturedLogs(), file);
  }

  /**
   * Parse FFmpeg log output into structured metadata
   * @param {Array} logs - Array of log entries
   * @param {File} file - Original file
   * @returns {Object} Parsed metadata
   * @private
   */
  _parseMetadata(logs, file) {
    const output = logs
      .filter(log => log.type === 'stderr')
      .map(log => log.message)
      .join('\n');

    const metadata = {
      format: {
        filename: file.name,
        size: file.size,
        duration: null,
        bit_rate: null,
      },
      streams: [],
    };

    // Extract duration
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      metadata.format.duration = hours * 3600 + minutes * 60 + seconds;
    }

    // Extract bitrate
    const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
    if (bitrateMatch) {
      metadata.format.bit_rate = parseInt(bitrateMatch[1]) * 1000;
    }

    // Extract stream information
    const streamLineMatches = output.matchAll(/Stream #\d+:\d+[^:]*: (Video|Audio): (.+)$/gm);
    for (const match of streamLineMatches) {
      const type = match[1].toLowerCase();
      const fullLine = match[2].trim();
      
      const stream = {
        codec_type: type,
        codec_name: fullLine.split(' ')[0],
      };

      // Extract stream-specific bitrate
      const streamBitrateMatch = fullLine.match(/(\d+) kb\/s/);
      if (streamBitrateMatch) {
        stream.bit_rate = parseInt(streamBitrateMatch[1]) * 1000;
      }

      if (type === 'video') {
        // Resolution
        const resMatch = fullLine.match(/(\d{3,4})x(\d{3,4})/);
        if (resMatch) {
          stream.width = parseInt(resMatch[1]);
          stream.height = parseInt(resMatch[2]);
        }
        
        // FPS
        const fpsMatch = fullLine.match(/(\d+(?:\.\d+)?) fps/);
        if (fpsMatch) {
          stream.r_frame_rate = fpsMatch[1];
        }

        // Pixel format
        const pixFmtMatch = fullLine.match(/yuv[a-z]*[0-9]+[a-z]*/);
        if (pixFmtMatch) {
          stream.pix_fmt = pixFmtMatch[0];
        }
      } else if (type === 'audio') {
        // Sample rate
        const sampleRateMatch = fullLine.match(/(\d+) Hz/);
        if (sampleRateMatch) {
          stream.sample_rate = parseInt(sampleRateMatch[1]);
        }
        
        // Channels
        if (fullLine.includes('stereo')) {
          stream.channels = 2;
        } else if (fullLine.includes('mono')) {
          stream.channels = 1;
        }
      }

      metadata.streams.push(stream);
    }

    return metadata;
  }

  /**
   * Generate thumbnail from video at specific time
   * @param {File} videoFile - Input video file
   * @param {number} timeSeconds - Time in seconds
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Uint8Array>} Thumbnail image data
   */
  async generateThumbnail(videoFile, timeSeconds, options = {}) {
    const {
      offsetSeconds = 2,
      quality = 2, // Lower = better quality but slower
    } = options;

    const timestamp = Date.now();
    const inputName = `input_${timestamp}.mp4`;
    const outputName = `thumb_${timestamp}.jpg`;

    // Calculate seek time
    const roughTime = Math.max(0, timeSeconds - offsetSeconds);

    // Write input file
    await this.writeFile(inputName, videoFile);

    // Generate thumbnail
    await this.exec([
      '-ss', `${roughTime}`,
      '-i', inputName,
      '-ss', `${offsetSeconds}`,
      '-frames:v', '1',
      '-q:v', `${quality}`,
      '-f', 'image2',
      outputName,
    ]);

    // Read output
    const thumbnailData = await this.readFile(outputName);

    // Cleanup
    await this.deleteFile(inputName);
    await this.deleteFile(outputName);

    return thumbnailData;
  }
}

// Export singleton instance
export const ffmpegService = new FFmpegService();

// Export class for testing or custom instances
export { FFmpegService };

// Export utility functions for common formatting tasks
export const formatUtils = {
  /**
   * Format bytes to human readable
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  },

  /**
   * Format seconds to HH:MM:SS
   */
  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Format bitrate
   */
  formatBitrate(bps) {
    if (!bps) return 'Unknown';
    if (bps > 1000000) {
      return (bps / 1000000).toFixed(2) + ' Mbps';
    } else if (bps > 1000) {
      return (bps / 1000).toFixed(2) + ' kbps';
    }
    return bps + ' bps';
  },

  /**
   * Evaluate fraction string (e.g., "24000/1001")
   */
  evalFraction(fraction) {
    if (!fraction) return 'Unknown';
    if (fraction.includes('/')) {
      const [num, den] = fraction.split('/').map(Number);
      return (num / den).toFixed(2);
    }
    return parseFloat(fraction).toFixed(2);
  },
};
