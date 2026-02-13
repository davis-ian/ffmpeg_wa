<template>
  <div class="audio-trimmer">
    <h1>Audio Trimmer</h1>

    <div class="panel">
      <label for="audioInput">Input Audio/Video</label>
      <FileInput
        id="audioInput"
        accept="audio/*,video/*"
        :disabled="isProcessing"
        @change="handleFileChange"
      />
      <p class="meta" v-if="selectedFile">
        {{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})
      </p>
    </div>

    <div class="panel" v-if="sourceUrl">
      <label>Preview</label>
      <audio
        ref="previewAudio"
        :src="sourceUrl"
        preload="metadata"
        @loadedmetadata="onMetadata"
        @timeupdate="onTimeUpdate"
        @pause="isPreviewing = false"
      ></audio>
      <p class="meta" v-if="duration">Duration: {{ formatTime(duration) }}</p>

      <div class="range-grid" v-if="duration">
        <div>
          <label for="startRange">Start (seconds)</label>
          <input
            id="startRange"
            v-model.number="startSeconds"
            type="number"
            min="0"
            :max="duration"
            step="0.1"
            :disabled="isProcessing"
            @input="normalizeRange('start')"
          />
        </div>
        <div>
          <label for="endRange">End (seconds)</label>
          <input
            id="endRange"
            v-model.number="endSeconds"
            type="number"
            min="0"
            :max="duration"
            step="0.1"
            :disabled="isProcessing"
            @input="normalizeRange('end')"
          />
        </div>
      </div>
      <div class="slider-wrap" v-if="duration">
        <label>Trim Range</label>
        <div class="dual-range">
          <div class="dual-range-track" :style="trimTrackStyle"></div>
          <div class="dual-range-playhead" :style="playheadStyle"></div>
          <input
            class="range-handle range-start"
            type="range"
            min="0"
            :max="duration"
            step="0.1"
            :value="startSeconds"
            :disabled="isProcessing"
            @input="onRangeHandleInput('start', $event)"
          />
          <input
            class="range-handle range-end"
            type="range"
            min="0"
            :max="duration"
            step="0.1"
            :value="endSeconds"
            :disabled="isProcessing"
            @input="onRangeHandleInput('end', $event)"
          />
        </div>
        <div class="range-values">
          <span>Start: {{ formatTime(startSeconds) }}</span>
          <span>End: {{ formatTime(endSeconds) }}</span>
        </div>
      </div>

      <p class="meta">Trim window: {{ formatTime(startSeconds) }} to {{ formatTime(endSeconds) }}</p>
      <p class="meta" v-if="trimStrategy">Export strategy: {{ trimStrategy }}</p>

      <div class="actions">
        <button class="btn icon-btn" :disabled="!canTrim || isProcessing" @click="togglePreview" title="Play/Pause">
          <svg v-if="!isPreviewing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>
        <button class="btn icon-btn" :disabled="isProcessing || !duration" @click="stopPreview" title="Stop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
        </button>
        <button class="btn btn-primary" :disabled="!canTrim || isProcessing" @click="trimAudio">
          {{ isProcessing ? 'Processing...' : 'Trim Audio' }}
        </button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputFileName">
          Save {{ outputFileName }}
        </a>
      </div>

      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
    <p class="note" v-if="showFallbackNote">
      Heavy audio operations may fail in-browser for some codecs. This tool uses copy-first mode and auto-falls back to MP3 transcode.
    </p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { audioService } from '../services/audioService.js';
import ProcessingProgress from './ProcessingProgress.vue';
import { formatMediaError } from '../services/mediaErrors.js';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'AudioTrimmer',
  components: {
    ProcessingProgress,
    FileInput,
  },
  data() {
    return {
      selectedFile: null,
      sourceUrl: null,
      duration: 0,
      startSeconds: 0,
      endSeconds: 0,
      isProcessing: false,
      progressPercent: 0,
      downloadUrl: null,
      outputFileName: '',
      isPreviewing: false,
      previewCurrentTime: 0,
      trimStrategy: '',
      errorMessage: '',
    };
  },
  computed: {
    canTrim() {
      return this.selectedFile && this.endSeconds > this.startSeconds;
    },
    showFallbackNote() {
      return Boolean(this.selectedFile);
    },
    trimTrackStyle() {
      const total = Number(this.duration || 0);
      if (!total) {
        return {};
      }
      const start = (this.startSeconds / total) * 100;
      const end = (this.endSeconds / total) * 100;
      return {
        background: `linear-gradient(to right, var(--bg-primary) 0% ${start}%, var(--accent) ${start}% ${end}%, var(--bg-primary) ${end}% 100%)`,
      };
    },
    playheadStyle() {
      const total = Number(this.duration || 0);
      if (!total) {
        return { display: 'none' };
      }
      const clamped = Math.max(0, Math.min(this.previewCurrentTime || 0, total));
      const left = (clamped / total) * 100;
      return {
        left: `${left}%`,
      };
    },
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files?.[0] || null;
      this.selectedFile = file;
      this.errorMessage = '';
      this.trimStrategy = '';
      this.progressPercent = 0;
      this.duration = 0;
      this.startSeconds = 0;
      this.endSeconds = 0;
      this.isPreviewing = false;
      this.previewCurrentTime = 0;

      if (this.sourceUrl) {
        URL.revokeObjectURL(this.sourceUrl);
        this.sourceUrl = null;
      }
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }

      if (!file) return;
      this.sourceUrl = URL.createObjectURL(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'audio_trim';
      this.outputFileName = `${baseName}_trim.m4a`;
    },

    onMetadata(event) {
      const mediaDuration = Number(event?.target?.duration || 0);
      if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) return;
      this.duration = mediaDuration;
      this.startSeconds = 0;
      this.endSeconds = Number(mediaDuration.toFixed(2));
      this.previewCurrentTime = 0;
    },

    onRangeHandleInput(which, event) {
      if (this.isProcessing) return;
      const value = Number(event.target.value);
      if (which === 'start') {
        this.startSeconds = value;
        this.normalizeRange('start');
      } else {
        this.endSeconds = value;
        this.normalizeRange('end');
      }
    },

    normalizeRange(changedField) {
      if (this.isProcessing) return;
      const max = Number(this.duration || 0);
      const minGap = 0.1;
      this.startSeconds = Math.max(0, Math.min(this.startSeconds || 0, max));
      this.endSeconds = Math.max(0, Math.min(this.endSeconds || 0, max));

      if (this.endSeconds <= this.startSeconds + minGap) {
        if (changedField === 'start') {
          this.endSeconds = Math.min(max, this.startSeconds + minGap);
        } else {
          this.startSeconds = Math.max(0, this.endSeconds - minGap);
        }
      }

      this.syncPreviewToRange(changedField);
    },

    syncPreviewToRange() {
      const audio = this.$refs.previewAudio;
      if (!audio) return;

      const outOfRange =
        audio.currentTime < this.startSeconds || audio.currentTime > this.endSeconds;

      if (outOfRange) {
        audio.currentTime = this.startSeconds;
      }

      this.previewCurrentTime = audio.currentTime;
    },

    previewSelection() {
      if (!this.canTrim || !this.$refs.previewAudio) return;
      const audio = this.$refs.previewAudio;
      if (audio.currentTime < this.startSeconds || audio.currentTime >= this.endSeconds) {
        audio.currentTime = this.startSeconds;
      }
      this.previewCurrentTime = audio.currentTime;
      this.isPreviewing = true;
      audio.play().catch((error) => {
        this.isPreviewing = false;
        console.error('[AudioTrimmer] preview play failed', error);
      });
    },

    togglePreview() {
      const audio = this.$refs.previewAudio;
      if (!audio || !this.canTrim) return;
      if (this.isPreviewing) {
        audio.pause();
        this.isPreviewing = false;
        return;
      }
      if (audio.currentTime < this.startSeconds || audio.currentTime >= this.endSeconds) {
        audio.currentTime = this.startSeconds;
      }
      this.previewCurrentTime = audio.currentTime;
      this.isPreviewing = true;
      audio.play().catch((error) => {
        this.isPreviewing = false;
        console.error('[AudioTrimmer] preview play failed', error);
      });
    },

    stopPreview() {
      const audio = this.$refs.previewAudio;
      if (!audio) return;
      this.isPreviewing = false;
      audio.pause();
      audio.currentTime = this.startSeconds;
      this.previewCurrentTime = this.startSeconds;
    },

    onTimeUpdate(event) {
      const audio = event?.target;
      if (!audio) return;
      this.previewCurrentTime = audio.currentTime;
      if (!this.isPreviewing) return;
      if (audio.currentTime >= this.endSeconds) {
        audio.pause();
        audio.currentTime = this.startSeconds;
        this.previewCurrentTime = this.startSeconds;
        this.isPreviewing = false;
      }
    },

    async trimAudio() {
      if (!this.canTrim) {
        this.errorMessage = 'End time must be greater than start time.';
        return;
      }

      this.errorMessage = '';
      this.stopPreview();
      this.isProcessing = true;
      this.progressPercent = 5;

      const unsubscribe = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await audioService.trim(this.selectedFile, {
          startSeconds: this.startSeconds,
          endSeconds: this.endSeconds,
        });

        if (this.downloadUrl) {
          URL.revokeObjectURL(this.downloadUrl);
        }

        const blob = new Blob([result.data.buffer], { type: result.mimeType });
        this.downloadUrl = URL.createObjectURL(blob);
        this.trimStrategy = result.strategy === 'copy' ? 'Copy (fast)' : 'Transcode fallback (MP3)';

        const baseName = this.selectedFile.name.replace(/\.[^/.]+$/, '') || 'audio_trim';
        this.outputFileName = `${baseName}_trim.${result.extension}`;
        this.progressPercent = 100;
      } catch (error) {
        console.error('[AudioTrimmer] trim failed', error);
        this.errorMessage = formatMediaError(error, 'Audio trim failed.');
      } finally {
        unsubscribe();
        this.isProcessing = false;
      }
    },

    formatTime(seconds) {
      const val = Number(seconds || 0);
      const mins = Math.floor(val / 60);
      const secs = Math.floor(val % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
    },
  },
  beforeUnmount() {
    if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
  },
};
</script>

<style scoped>
.audio-trimmer {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  min-height: 100vh;
  color: var(--text-primary);
}

.audio-trimmer h1 {
  font-family: var(--font-family);
  font-size: 1.5rem;
  margin-bottom: var(--space-md);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.panel {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

label {
  display: block;
  margin-bottom: var(--space-xs);
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

input[type='file'],
input[type='number'] {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
}

audio {
  display: none;
}

.range-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.slider-wrap {
  margin-top: var(--space-sm);
}

.dual-range {
  position: relative;
  height: 28px;
}

.dual-range-track {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  outline: none;
}

.dual-range-playhead {
  position: absolute;
  top: 6px;
  transform: translateX(-1px);
  width: 2px;
  height: 16px;
  background: var(--text-pop);
  pointer-events: none;
  z-index: 2;
}

.range-handle {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 28px;
  background: transparent;
  pointer-events: none;
  margin: 0;
}

.range-handle::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent);
  pointer-events: all;
  cursor: pointer;
  margin-top: 7px;
}

.range-handle::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent);
  pointer-events: all;
  cursor: pointer;
}

.range-handle::-webkit-slider-runnable-track {
  height: 28px;
  background: transparent;
  border: none;
}

.range-handle::-moz-range-track {
  height: 28px;
  background: transparent;
  border: none;
}

.range-values {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-xs);
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.actions {
  margin-top: var(--space-sm);
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.btn {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-decoration: none;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  padding: 0;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-success {
  border-color: #2ea44f;
  color: #2ea44f;
}

.meta {
  margin: var(--space-xs) 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.note {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.error {
  color: #e5534b;
}

@media (max-width: 768px) {
  .range-grid {
    grid-template-columns: 1fr;
  }
}
</style>
