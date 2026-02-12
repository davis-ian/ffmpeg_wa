<template>
  <div class="thumbnail-clipper">
    <h1>Thumbnail Clipper</h1>

    <div class="file-input-wrapper">
      <input
        v-show="!fileBlobUrl"
        type="file"
        @change="handleFileChange"
        ref="fileInput"
        accept="video/*"
      />
    </div>

    <div class="progress-container" v-if="showProgress">
      <v-progress-linear
        color="primary"
        height="20"
        rounded
        indeterminate
      >
      </v-progress-linear>
      <p class="loading-text">Processing video...</p>
    </div>

    <div class="video-container" v-if="fileBlobUrl && !thumbnailSrc">
      <video
        @timeupdate="handleTimeUpdate"
        id="video"
        :src="fileBlobUrl"
        controls
      ></video>
    </div>

    <div class="thumbnail-container" v-if="thumbnailSrc">
      <img
        :src="thumbnailSrc"
        alt="Generated thumbnail"
      />
    </div>

    <div class="button-container" v-if="thumbnailSrc">
      <button 
        class="btn btn-secondary" 
        @click="thumbnailSrc = null"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      <button 
        class="btn btn-primary" 
        @click="downloadThumbnail(thumbnailSrc, 'thumbnail.jpg')"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        Download
      </button>
    </div>

    <div class="button-container" v-if="!thumbnailSrc">
      <button
        class="btn btn-secondary"
        v-if="fileBlobUrl && !showProgress"
        :disabled="!loaded"
        @click="clearSelectedFile"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
        Select New File
      </button>

      <button
        class="btn btn-primary"
        v-if="!showProgress && fileBlobUrl"
        :disabled="!loaded || !selectedFile"
        @click="generateThumbnail"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Generate Thumbnail
      </button>

      <button 
        class="btn btn-danger" 
        v-if="showProgress" 
        @click="terminate"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Cancel
      </button>
    </div>
  </div>
</template>
<script>
import { ffmpegService } from '../services/ffmpegService.js';

export default {
  name: 'FfmpegDemo',
  data() {
    return {
      loaded: false,
      showProgress: false,
      selectedFile: null,
      fileBlobUrl: '',
      thumbnailTime: 0,
      thumbnailSrc: null,
    };
  },
  methods: {
    clearSelectedFile() {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
      this.selectedFile = null;
      this.fileBlobUrl = null;
      this.thumbnailSrc = null;
    },
    async generateThumbnail() {
      if (!this.selectedFile) return;

      this.showProgress = true;

      try {
        // Use centralized service for thumbnail generation
        const thumbnailData = await ffmpegService.generateThumbnail(
          this.selectedFile,
          this.thumbnailTime,
          { offsetSeconds: 2, quality: 2 }
        );

        // Create URL for display
        this.thumbnailSrc = URL.createObjectURL(
          new Blob([thumbnailData.buffer], { type: 'image/jpeg' })
        );
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        alert('Failed to generate thumbnail: ' + error.message);
      } finally {
        this.showProgress = false;
      }
    },
    handleTimeUpdate() {
      const video = document.getElementById('video');
      if (video) {
        this.thumbnailTime = video.currentTime;
        console.log('Current time:', this.thumbnailTime);
      }
    },
    handleFileChange(event) {
      this.thumbnailSrc = null;
      const files = event.target.files;

      if (files.length > 0) {
        this.selectedFile = files[0];
        this.fileBlobUrl = URL.createObjectURL(files[0]);
      }
    },
    async terminate() {
      await ffmpegService.terminate();
      await this.initializeFfmpeg();
    },
    downloadThumbnail(url, fileName) {
      const element = document.createElement('a');
      element.href = url;
      element.download = fileName;
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    async initializeFfmpeg() {
      try {
        await ffmpegService.load();
        this.loaded = true;
      } catch (error) {
        console.error('Failed to initialize FFmpeg:', error);
        alert('Failed to load video processor. Please refresh the page.');
      }
    },
  },
  async mounted() {
    await this.initializeFfmpeg();
  },
  beforeUnmount() {
    // Cleanup object URLs
    if (this.fileBlobUrl) {
      URL.revokeObjectURL(this.fileBlobUrl);
    }
    if (this.thumbnailSrc) {
      URL.revokeObjectURL(this.thumbnailSrc);
    }
  },
};
</script>
<style scoped>
.thumbnail-clipper {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  background-color: var(--bg-primary);
  min-height: 100vh;
}

.thumbnail-clipper h1 {
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

/* File Input Styling */
.file-input-wrapper {
  display: flex;
  justify-content: center;
  margin: var(--space-xl) 0;
}

.file-input-wrapper input[type="file"] {
  font-family: var(--font-family);
  padding: var(--space-xl);
  border: 1px dashed var(--text-pop);
  border-radius: 0;
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.file-input-wrapper input[type="file"]:hover {
  border-color: var(--accent);
  background-color: var(--bg-surface);
  color: var(--text-pop);
}

/* Video Player Styling */
.video-container {
  display: flex;
  justify-content: center;
  margin: var(--space-lg) 0;
  border: 1px solid var(--grid-line);
  padding: var(--space-sm);
}

.video-container video {
  max-width: 100%;
  width: 100%;
  border-radius: 0;
  background-color: var(--bg-surface);
}

/* Thumbnail Display */
.thumbnail-container {
  display: flex;
  justify-content: center;
  margin: var(--space-lg) 0;
  border: 1px solid var(--grid-line);
  padding: var(--space-sm);
}

.thumbnail-container img {
  max-width: 100%;
  width: 100%;
  border-radius: 0;
  display: block;
}

/* Button Container */
.button-container {
  display: flex;
  justify-content: flex-start;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--grid-line);
  flex-wrap: wrap;
}

/* Button Styling */
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
}

/* Icon Styling */
.btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.btn-primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--text-pop);
  border-color: var(--text-pop);
  color: var(--bg-primary);
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--text-pop);
  border-color: var(--text-pop);
  color: var(--bg-primary);
}

.btn-danger {
  background-color: transparent;
  color: var(--error);
  border-color: var(--error);
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--error);
  color: var(--text-pop);
  border-color: var(--error);
}

.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Progress Bar */
.progress-container {
  margin: var(--space-lg) 0;
}

:deep(.v-progress-linear) {
  border-radius: 0;
  background-color: var(--bg-surface) !important;
  height: 2px !important;
}

:deep(.v-progress-linear__determinate),
:deep(.v-progress-linear__indeterminate) {
  background-color: var(--accent) !important;
}

/* Loading State */
.loading-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Responsive */
@media (max-width: 768px) {
  .thumbnail-clipper {
    padding: var(--space-sm);
  }
  
  .thumbnail-clipper h1 {
    font-size: 1.2rem;
  }
  
  .button-container {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
