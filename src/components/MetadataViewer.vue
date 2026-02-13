<template>
  <div class="metadata-viewer">
    <h1>Video Metadata</h1>
    
    <FileInput
      v-if="!metadata && !isLoading"
      ref="fileInput"
      accept="video/*"
      @change="handleFileChange"
    />

    <div class="progress-container" v-if="isLoading">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <p class="loading-text">Analyzing video...</p>
    </div>

    <div v-if="error" class="error-message">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
    </div>

    <div v-if="metadata" class="metadata-container">
      <div class="video-preview" v-if="fileBlobUrl">
        <video :src="fileBlobUrl" controls></video>
      </div>
      
      <!-- General Info Card -->
      <div class="info-card">
        <div class="card-header">
          <span class="header-label">General</span>
        </div>
        <div class="card-grid">
          <div class="data-cell">
            <span class="cell-label">Filename</span>
            <span class="cell-value">{{ metadata.format?.filename || selectedFile?.name }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Size</span>
            <span class="cell-value accent">{{ formatFileSize(metadata.format?.size) }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Duration</span>
            <span class="cell-value accent">{{ formatDuration(metadata.format?.duration) }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Bitrate</span>
            <span class="cell-value accent">{{ formatBitrate(metadata.format?.bit_rate) }}</span>
          </div>
        </div>
      </div>

      <!-- Video Stream Card -->
      <div class="info-card" v-if="videoStream">
        <div class="card-header">
          <span class="header-label">Video Stream</span>
        </div>
        <div class="card-grid two-col">
          <div class="data-cell">
            <span class="cell-label">Codec</span>
            <span class="cell-value mono">{{ videoStream.codec_name }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Resolution</span>
            <span class="cell-value accent">{{ videoStream.width }}x{{ videoStream.height }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Frame Rate</span>
            <span class="cell-value accent">{{ evalFraction(videoStream.r_frame_rate) }} fps</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Pixel Format</span>
            <span class="cell-value mono">{{ videoStream.pix_fmt }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Bitrate</span>
            <span class="cell-value accent">{{ formatBitrate(videoStream.bit_rate) }}</span>
          </div>
        </div>
      </div>

      <!-- Audio Stream Card -->
      <div class="info-card" v-if="audioStream">
        <div class="card-header">
          <span class="header-label">Audio Stream</span>
        </div>
        <div class="card-grid two-col">
          <div class="data-cell">
            <span class="cell-label">Codec</span>
            <span class="cell-value mono">{{ audioStream.codec_name }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Sample Rate</span>
            <span class="cell-value accent">{{ audioStream.sample_rate }} Hz</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Channels</span>
            <span class="cell-value accent">{{ audioStream.channels }}</span>
          </div>
          <div class="data-cell">
            <span class="cell-label">Bitrate</span>
            <span class="cell-value accent">{{ formatBitrate(audioStream.bit_rate) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar" v-if="metadata">
      <button class="btn btn-outline" @click="clearFile">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
        Analyze Another
      </button>
    </div>
  </div>
</template>

<script>
import { ffmpegService, formatUtils } from '../services/ffmpegService.js';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'MetadataViewer',
  components: {
    FileInput,
  },
  data() {
    return {
      isLoading: false,
      selectedFile: null,
      fileBlobUrl: null,
      metadata: null,
      error: null,
    };
  },
  computed: {
    videoStream() {
      if (!this.metadata || !this.metadata.streams) return null;
      return this.metadata.streams.find(s => s.codec_type === 'video');
    },
    audioStream() {
      if (!this.metadata || !this.metadata.streams) return null;
      return this.metadata.streams.find(s => s.codec_type === 'audio');
    },
  },
  async mounted() {
    // Initialize FFmpeg service
    await ffmpegService.load();
  },
  methods: {
    async handleFileChange(event) {
      const files = event.target.files;
      if (files.length === 0) return;

      this.selectedFile = files[0];
      this.fileBlobUrl = URL.createObjectURL(files[0]);
      this.isLoading = true;
      this.error = null;
      this.metadata = null;

      try {
        // Use centralized service to extract metadata
        this.metadata = await ffmpegService.extractMetadata(files[0]);
      } catch (err) {
        this.error = 'Failed to analyze video: ' + err.message;
        console.error(err);
      } finally {
        this.isLoading = false;
      }
    },
    // Use utility functions from service
    formatFileSize: formatUtils.formatFileSize,
    formatDuration: formatUtils.formatDuration,
    formatBitrate: formatUtils.formatBitrate,
    evalFraction: formatUtils.evalFraction,
    clearFile() {
      if (this.fileBlobUrl) {
        URL.revokeObjectURL(this.fileBlobUrl);
      }
      this.metadata = null;
      this.selectedFile = null;
      this.fileBlobUrl = null;
      this.error = null;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.clear?.();
      }
    },
  },
};
</script>

<style scoped>
.metadata-viewer {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  background-color: var(--bg-primary);
  min-height: 100vh;
}

.metadata-viewer h1 {
  font-family: var(--font-family);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-pop);
  text-align: left;
  margin-bottom: var(--space-lg);
  letter-spacing: 2px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--grid-line);
  padding-bottom: var(--space-sm);
}

.progress-container {
  margin: var(--space-lg) 0;
}

.progress-bar {
  height: 2px;
  background-color: var(--bg-surface);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  animation: indeterminate 1s linear infinite;
  width: 30%;
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

.loading-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--error);
  color: var(--error);
  margin: var(--space-lg) 0;
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.metadata-container {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.video-preview {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-md);
  border: 1px solid var(--grid-line);
  padding: var(--space-sm);
}

.video-preview video {
  max-width: 100%;
  width: 100%;
  border-radius: 0;
  background-color: var(--bg-surface);
}

/* Card Grid Layout */
.info-card {
  border: 1px solid var(--grid-line);
  background-color: var(--bg-surface);
}

.card-header {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--grid-line);
  background-color: var(--bg-secondary);
}

.header-label {
  font-size: 0.7rem;
  color: var(--text-pop);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.card-grid.two-col {
  grid-template-columns: repeat(2, 1fr);
}

.data-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  border-right: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
}

.data-cell:last-child {
  border-right: none;
}

.card-grid > .data-cell:nth-last-child(-n+2):nth-child(odd),
.card-grid > .data-cell:nth-last-child(-n+1):nth-child(even) {
  border-bottom: none;
}

.cell-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.cell-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
  word-break: break-word;
  font-family: var(--font-family);
}

.cell-value.accent {
  color: var(--accent);
}

.cell-value.mono {
  font-family: 'Courier New', monospace;
  color: var(--text-pop);
}

.action-bar {
  display: flex;
  justify-content: flex-start;
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--grid-line);
}

.btn {
  font-family: var(--font-family);
  padding: var(--space-sm) var(--space-md);
  border-radius: 0;
  border: 1px solid var(--border);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
}

.btn:hover {
  background-color: var(--text-pop);
  color: var(--bg-primary);
  border-color: var(--text-pop);
}

.btn-outline {
  background-color: transparent;
  border-color: var(--text-pop);
  color: var(--text-pop);
}

.btn-outline:hover {
  background-color: var(--text-pop);
  color: var(--bg-primary);
}

.btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .metadata-viewer {
    padding: var(--space-sm);
  }
  
  .metadata-viewer h1 {
    font-size: 1.2rem;
  }
  
  .card-grid,
  .card-grid.two-col {
    grid-template-columns: 1fr;
  }
  
  .data-cell {
    border-right: none;
  }
  
  .data-cell:not(:last-child) {
    border-bottom: 1px solid var(--grid-line);
  }
}
</style>
