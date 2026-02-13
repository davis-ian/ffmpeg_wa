// FFmpeg Service - Singleton Pattern for centralized video processing
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const FFMPEG_CORE_VERSION = "0.12.6";
const FFMPEG_CORE_MT_URL = `https://unpkg.com/@ffmpeg/core-mt@${FFMPEG_CORE_VERSION}/dist/esm`;
const FFMPEG_CORE_ST_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
const MAX_FFMPEG_THREADS = 16;
// const MAX_FFMPEG_THREADS = 4;

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
    this.runtimeStatusCallbacks = new Set();
    this.capturedLogs = [];
    this.workerThreadsOverride = null;
    this.workerThreads = this._resolveWorkerThreads();
    this.coreVariant = null;
    this.lastOperationStrategy = null;
  }

  _isCrossOriginIsolated() {
    if (typeof window === "undefined") return false;
    return Boolean(
      window.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined",
    );
  }

  _detectWorkerThreads() {
    if (typeof navigator === "undefined") {
      return 1;
    }
    const concurrency = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(MAX_FFMPEG_THREADS, concurrency));
  }

  _resolveWorkerThreads() {
    if (this.workerThreadsOverride !== null) {
      return this.workerThreadsOverride;
    }
    return this._detectWorkerThreads();
  }

  _resolveCoreVariant() {
    if (!this._isCrossOriginIsolated()) {
      return "st";
    }
    return this.workerThreads > 1 ? "mt" : "st";
  }

  _resolveActiveThreadCount() {
    return this.coreVariant === "mt" ? this.workerThreads : 1;
  }

  _emitRuntimeStatus() {
    const status = this.getRuntimeStatus();
    this.runtimeStatusCallbacks.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error("Runtime status callback error:", err);
      }
    });
  }

  _replaceInputArg(args, inputName, replacementPath) {
    let replaced = 0;
    const mapped = args.map((arg) => {
      if (arg === inputName) {
        replaced += 1;
        return replacementPath;
      }
      return arg;
    });
    return { args: mapped, replaced };
  }

  async _mountInputFile(file) {
    const ffmpeg = this.getInstance();
    if (
      typeof ffmpeg.createDir !== "function" ||
      typeof ffmpeg.mount !== "function" ||
      typeof ffmpeg.unmount !== "function"
    ) {
      return null;
    }

    const safeFileName = file.name || `input_${Date.now()}.mp4`;
    const mountPoint = `/in_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await ffmpeg.createDir(mountPoint);
    await ffmpeg.mount("WORKERFS", { files: [file] }, mountPoint);
    return {
      mountPoint,
      inputPath: `${mountPoint}/${safeFileName}`,
    };
  }

  async _cleanupMountedInput(mountPoint) {
    const ffmpeg = this.getInstance();
    try {
      await ffmpeg.unmount(mountPoint);
    } catch {
      // no-op
    }
    try {
      await ffmpeg.deleteDir(mountPoint);
    } catch {
      // no-op
    }
  }

  setWorkerThreads(count) {
    const requested = Number(count);
    if (!Number.isInteger(requested) || requested < 1) {
      throw new Error("worker threads must be a positive integer");
    }
    this.workerThreadsOverride = Math.min(MAX_FFMPEG_THREADS, requested);
    this.workerThreads = this.workerThreadsOverride;
    console.log(
      "[FFmpegService] worker thread override set to",
      this.workerThreads,
    );
    this._emitRuntimeStatus();
  }

  resetWorkerThreads() {
    this.workerThreadsOverride = null;
    this.workerThreads = this._detectWorkerThreads();
    this._emitRuntimeStatus();
  }

  async withTemporaryWorkerThreads(threadCount, task) {
    const previousOverride = this.workerThreadsOverride;
    const previousWasLoaded = this.isLoaded;
    const restoreOverride = async () => {
      if (previousOverride === null) {
        this.resetWorkerThreads();
      } else {
        this.setWorkerThreads(previousOverride);
      }
    };

    this.setWorkerThreads(threadCount);
    try {
      await this.terminate();
      await this.load();
      return await task();
    } finally {
      await restoreOverride();
      await this.terminate();
      try {
        if (previousWasLoaded) {
          await this.load();
        }
      } catch (restoreLoadError) {
        console.error(
          "[FFmpegService] Failed to restore previous runtime after temporary thread override",
          restoreLoadError,
        );
      }
    }
  }

  setLastOperationStrategy(strategy) {
    this.lastOperationStrategy = strategy || null;
    this._emitRuntimeStatus();
  }

  getRuntimeStatus() {
    return {
      coreVariant: this.coreVariant,
      configuredThreads: this.workerThreads,
      activeThreads: this._resolveActiveThreadCount(),
      crossOriginIsolated: this._isCrossOriginIsolated(),
      isLoaded: this.isLoaded,
      lastOperationStrategy: this.lastOperationStrategy,
    };
  }

  onRuntimeStatus(callback) {
    this.runtimeStatusCallbacks.add(callback);
    callback(this.getRuntimeStatus());
    return () => this.runtimeStatusCallbacks.delete(callback);
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
    console.log("[FFmpegService] ffmpeg log", { type, message });

    // Forward to subscribers
    this.logCallbacks.forEach((cb) => {
      try {
        cb({ type, message });
      } catch (err) {
        console.error("Log callback error:", err);
      }
    });
  }

  /**
   * Internal progress handler
   */
  _handleProgress({ progress, time }) {
    console.log("[FFmpegService] progress", { progress, time });
    this.progressCallbacks.forEach((cb) => {
      try {
        cb({ progress, time });
      } catch (err) {
        console.error("Progress callback error:", err);
      }
    });
  }

  /**
   * Load FFmpeg WASM
   * @returns {Promise<boolean>} Success status
   */
  async load() {
    console.log("[FFmpegService] load requested", {
      crossOriginIsolated: this._isCrossOriginIsolated(),
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      workerThreads: this.workerThreads,
      coreVariant: this._resolveCoreVariant(),
      timestamp: new Date().toISOString(),
    });

    if (this.isLoaded) return true;
    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.loadError = null;
    this.clearLogs();

    try {
      const ffmpeg = new FFmpeg();
      const preferredVariant = this._resolveCoreVariant();

      // Set up event handlers
      ffmpeg.on("log", this._handleLog.bind(this));
      ffmpeg.on("progress", this._handleProgress.bind(this));

      const loadVariant = async (variant) => {
        const coreBaseURL =
          variant === "mt" ? FFMPEG_CORE_MT_URL : FFMPEG_CORE_ST_URL;
        const coreURLPromise = toBlobURL(
          `${coreBaseURL}/ffmpeg-core.js`,
          "text/javascript",
        );
        const wasmURLPromise = toBlobURL(
          `${coreBaseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        );

        if (variant === "mt") {
          const [coreURL, wasmURL, workerURL] = await Promise.all([
            coreURLPromise,
            wasmURLPromise,
            toBlobURL(
              `${coreBaseURL}/ffmpeg-core.worker.js`,
              "text/javascript",
            ),
          ]);
          return { coreURL, wasmURL, workerURL, variant };
        }

        const [coreURL, wasmURL] = await Promise.all([
          coreURLPromise,
          wasmURLPromise,
        ]);
        return { coreURL, wasmURL, workerURL: undefined, variant };
      };

      let bundle = await loadVariant(preferredVariant);

      console.log("[FFmpegService] submitting load", {
        coreURL: bundle.coreURL,
        wasmURL: bundle.wasmURL,
        workerURL: bundle.workerURL,
        workerThreads: this.workerThreads,
        activeThreads: bundle.variant === "mt" ? this.workerThreads : 1,
        coreVariant: bundle.variant,
        crossOriginIsolated: this._isCrossOriginIsolated(),
      });

      try {
        await ffmpeg.load({
          coreURL: bundle.coreURL,
          wasmURL: bundle.wasmURL,
          workerURL: bundle.workerURL,
        });
      } catch (initialLoadError) {
        if (bundle.variant !== "mt") {
          throw initialLoadError;
        }
        console.warn(
          "[FFmpegService] MT core load failed, retrying with single-thread core",
          initialLoadError,
        );
        bundle = await loadVariant("st");
        await ffmpeg.load({
          coreURL: bundle.coreURL,
          wasmURL: bundle.wasmURL,
        });
      }

      console.log("[FFmpegService] load resolved", {
        workerThreads: this.workerThreads,
        activeThreads: bundle.variant === "mt" ? this.workerThreads : 1,
        coreVariant: bundle.variant,
        crossOriginIsolated: this._isCrossOriginIsolated(),
      });

      this.ffmpeg = ffmpeg;
      this.coreVariant = bundle.variant;
      this.isLoaded = true;
      this.isLoading = false;
      this._emitRuntimeStatus();

      console.log("[FFmpegService] Loaded successfully");
      return true;
    } catch (error) {
      this.isLoading = false;
      this.loadError = error.message;
      this.coreVariant = null;
      this._emitRuntimeStatus();
      console.error("[FFmpegService] Failed to load:", error, {
        crossOriginIsolated: this._isCrossOriginIsolated(),
        workerThreads: this.workerThreads,
      });
      throw error;
    }
  }

  /**
   * Get FFmpeg instance (throws if not loaded)
   * @returns {FFmpeg} FFmpeg instance
   */
  getInstance() {
    if (!this.isLoaded || !this.ffmpeg) {
      throw new Error("FFmpeg not loaded. Call load() first.");
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

  async listDir(path) {
    const ffmpeg = this.getInstance();
    return await ffmpeg.listDir(path);
  }

  async createDir(path) {
    const ffmpeg = this.getInstance();
    await ffmpeg.createDir(path);
  }

  async deleteDir(path) {
    const ffmpeg = this.getInstance();
    await ffmpeg.deleteDir(path);
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
      this.coreVariant = null;
      this.lastOperationStrategy = null;
      this.clearLogs();
      this.logCallbacks.clear();
      this.progressCallbacks.clear();
      this._emitRuntimeStatus();
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
    let outputData = null;
    let mountedInput = null;
    let argsToExec = ffmpegArgs;
    let wroteInput = false;

    try {
      if (inputFile instanceof File) {
        try {
          mountedInput = await this._mountInputFile(inputFile);
          if (mountedInput) {
            const { args, replaced } = this._replaceInputArg(
              ffmpegArgs,
              inputName,
              mountedInput.inputPath,
            );
            if (replaced > 0) {
              argsToExec = args;
            } else {
              mountedInput = null;
              await this.writeFile(inputName, inputFile);
              wroteInput = true;
            }
          } else {
            await this.writeFile(inputName, inputFile);
            wroteInput = true;
          }
        } catch (mountError) {
          console.warn(
            "[FFmpegService] WORKERFS mount failed, falling back to writeFile",
            mountError,
          );
          mountedInput = null;
          await this.writeFile(inputName, inputFile);
          wroteInput = true;
        }
      } else {
        await this.writeFile(inputName, inputFile);
        wroteInput = true;
      }

      // Execute command
      const exitCode = await this.exec(argsToExec);

      if (exitCode !== 0) {
        throw new Error(`FFmpeg process failed with exit code ${exitCode}`);
      }

      // Read output file
      outputData = await this.readFile(outputName);
      return outputData;
    } finally {
      // Best-effort cleanup to avoid stale files and memory growth after failed runs.
      if (wroteInput) {
        try {
          await this.deleteFile(inputName);
        } catch {
          // no-op
        }
      }
      if (mountedInput?.mountPoint) {
        await this._cleanupMountedInput(mountedInput.mountPoint);
      }
      try {
        await this.deleteFile(outputName);
      } catch {
        // no-op
      }
    }
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
    await this.exec(["-i", inputName, "-c", "copy", "-f", "null", "-"]);

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
      .filter((log) => log.type === "stderr")
      .map((log) => log.message)
      .join("\n");

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
    const durationMatch = output.match(
      /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/,
    );
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
    const streamLineMatches = output.matchAll(
      /Stream #\d+:\d+[^:]*: (Video|Audio): (.+)$/gm,
    );
    for (const match of streamLineMatches) {
      const type = match[1].toLowerCase();
      const fullLine = match[2].trim();

      const stream = {
        codec_type: type,
        codec_name: fullLine.split(" ")[0],
      };

      // Extract stream-specific bitrate
      const streamBitrateMatch = fullLine.match(/(\d+) kb\/s/);
      if (streamBitrateMatch) {
        stream.bit_rate = parseInt(streamBitrateMatch[1]) * 1000;
      }

      if (type === "video") {
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
      } else if (type === "audio") {
        // Sample rate
        const sampleRateMatch = fullLine.match(/(\d+) Hz/);
        if (sampleRateMatch) {
          stream.sample_rate = parseInt(sampleRateMatch[1]);
        }

        // Channels
        if (fullLine.includes("stereo")) {
          stream.channels = 2;
        } else if (fullLine.includes("mono")) {
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
      quality = 2, // Lower = better quality but slower
    } = options;

    const timestamp = Date.now();
    const inputName = `input_${timestamp}.mp4`;
    const outputName = `thumb_${timestamp}.jpg`;

    const seekTime = Math.max(0, timeSeconds || 0);

    console.log("[FFmpegService] generateThumbnail", {
      inputName,
      fileName: videoFile?.name,
      fileSize: videoFile?.size,
      seekTime,
      workerThreads: this.workerThreads,
      activeThreads: this._resolveActiveThreadCount(),
      coreVariant: this.coreVariant,
      crossOriginIsolated: this._isCrossOriginIsolated(),
    });

    await this.writeFile(inputName, videoFile);

    const execArgs = [
      "-threads",
      `${this._resolveActiveThreadCount()}`,
      "-ss",
      `${seekTime}`,
      "-i",
      inputName,
      "-an",
      "-frames:v",
      "1",
      "-q:v",
      `${quality}`,
      outputName,
    ];

    console.log("[FFmpegService] executing ffmpeg", { execArgs });

    const start = performance.now ? performance.now() : Date.now();
    try {
      const exitCode = await this.exec(execArgs);
      const duration =
        (performance.now ? performance.now() : Date.now()) - start;
      console.log("[FFmpegService] exec finished", { exitCode, duration });
    } catch (error) {
      const duration =
        (performance.now ? performance.now() : Date.now()) - start;
      console.error("[FFmpegService] exec failed", { error, duration });
      throw error;
    }

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
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  },

  /**
   * Format seconds to HH:MM:SS
   */
  formatDuration(seconds) {
    if (!seconds) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  },

  /**
   * Format bitrate
   */
  formatBitrate(bps) {
    if (!bps) return "Unknown";
    if (bps > 1000000) {
      return (bps / 1000000).toFixed(2) + " Mbps";
    } else if (bps > 1000) {
      return (bps / 1000).toFixed(2) + " kbps";
    }
    return bps + " bps";
  },

  /**
   * Evaluate fraction string (e.g., "24000/1001")
   */
  evalFraction(fraction) {
    if (!fraction) return "Unknown";
    if (fraction.includes("/")) {
      const [num, den] = fraction.split("/").map(Number);
      return (num / den).toFixed(2);
    }
    return parseFloat(fraction).toFixed(2);
  },
};
