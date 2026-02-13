<template>
  <div class="video-converter">
    <h1>Video Converter</h1>

    <div class="panel">
      <label for="videoInput">Input Video (MP4)</label>
      <input
        id="videoInput"
        type="file"
        accept="video/mp4,video/*"
        :disabled="isConverting"
        @change="handleFileChange"
      />
      <p class="meta" v-if="selectedFile">
        {{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})
      </p>
    </div>

    <div class="panel" v-if="selectedFile">
      <label for="outputFormat">Output Format</label>
      <div class="format-grid" id="outputFormat" role="radiogroup" aria-label="Output format">
        <button
          v-for="option in outputOptions"
          :key="option.value"
          type="button"
          class="format-chip"
          :class="{ active: outputFormat === option.value }"
          :disabled="isConverting"
          @click="outputFormat = option.value"
        >
          <span class="format-name">{{ option.label }}</span>
          <span class="format-sub">{{ option.hint }}</span>
        </button>
      </div>
      <p class="meta">Output: {{ outputFileName }}</p>
      <div class="actions">
        <button class="btn btn-primary" :disabled="isConverting" @click="convert">
          {{ isConverting ? 'Converting...' : actionLabel }}
        </button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputFileName">
          Save {{ outputFileName }}
        </a>
      </div>

      <ProcessingProgress :show="isConverting" :value="progressPercent" />
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import ProcessingProgress from './ProcessingProgress.vue';
import { formatMediaError } from '../services/mediaErrors.js';

export default {
  name: 'VideoConverter',
  components: {
    ProcessingProgress,
  },
  data() {
    return {
      selectedFile: null,
      isConverting: false,
      progressPercent: 0,
      downloadUrl: null,
      outputFileName: '',
      outputFormat: 'ts-remux',
      errorMessage: '',
    };
  },
  computed: {
    outputOptions() {
      return [
        { value: 'ts-remux', label: 'TS', hint: 'Copy Streams (Fast)' },
        { value: 'mkv-remux', label: 'MKV', hint: 'Copy Streams' },
        { value: 'mov-remux', label: 'MOV', hint: 'Copy Streams' },
        { value: 'm4a-extract', label: 'M4A', hint: 'Audio Extract' },
        { value: 'mp3-extract', label: 'MP3', hint: 'Audio Transcode' },
        { value: 'gif-short', label: 'GIF', hint: 'First 3 Seconds' },
        { value: 'webm', label: 'WebM', hint: 'VP8 + Opus' },
        { value: 'mp4-transcode', label: 'MP4', hint: 'H.264 + AAC' },
        { value: 'mp4-remux', label: 'MP4', hint: 'Copy Streams' },
      ];
    },
    actionLabel() {
      if (this.outputFormat === 'ts-remux') return 'Convert MP4 -> TS (Copy)';
      if (this.outputFormat === 'mkv-remux') return 'Convert MP4 -> MKV (Copy)';
      if (this.outputFormat === 'mov-remux') return 'Convert MP4 -> MOV (Copy)';
      if (this.outputFormat === 'm4a-extract') return 'Extract Audio -> M4A';
      if (this.outputFormat === 'mp3-extract') return 'Extract Audio -> MP3';
      if (this.outputFormat === 'gif-short') return 'Convert MP4 -> GIF (3s)';
      if (this.outputFormat === 'mp4-transcode') return 'Convert MP4 -> MP4 (Transcode)';
      if (this.outputFormat === 'mp4-remux') return 'Convert MP4 -> MP4 (Copy)';
      return 'Convert MP4 -> WebM';
    },
  },
  watch: {
    outputFormat() {
      this.updateOutputFileName();
    },
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files?.[0] || null;
      this.selectedFile = file;
      this.progressPercent = 0;
      this.errorMessage = '';
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
      if (!file) {
        this.outputFileName = '';
        return;
      }
      this.updateOutputFileName();
    },

    updateOutputFileName() {
      if (!this.selectedFile) {
        this.outputFileName = '';
        return;
      }
      const baseName = this.selectedFile.name.replace(/\.[^/.]+$/, '') || 'converted';
      const extension = this.getOutputExtension();
      this.outputFileName = `${baseName}.${extension}`;
    },

    getOutputExtension() {
      if (this.outputFormat === 'mkv-remux') return 'mkv';
      if (this.outputFormat === 'mov-remux') return 'mov';
      if (this.outputFormat === 'm4a-extract') return 'm4a';
      if (this.outputFormat === 'mp3-extract') return 'mp3';
      if (this.outputFormat === 'gif-short') return 'gif';
      if (this.outputFormat === 'ts-remux') return 'ts';
      if (this.outputFormat.startsWith('mp4')) return 'mp4';
      return 'webm';
    },

    async convert() {
      if (!this.selectedFile) {
        this.errorMessage = 'Select a video file first.';
        return;
      }

      this.errorMessage = '';
      this.progressPercent = 0;
      this.isConverting = true;

      const inputName = `input_${Date.now()}.mp4`;
      const extension = this.getOutputExtension();
      const outputName = `output_${Date.now()}.${extension}`;

      const unsubscribe = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));
      });

      try {
        ffmpegService.setWorkerThreads(1);
        await ffmpegService.terminate();
        await ffmpegService.load();
        let ffmpegArgs = this.buildArgs(inputName, outputName);
        let outputData;

        try {
          outputData = await ffmpegService.processVideo(
            this.selectedFile,
            inputName,
            ffmpegArgs,
            outputName,
          );
        } catch (primaryError) {
          const shouldRetryWebm =
            this.outputFormat === 'webm' &&
            String(primaryError?.message || '').toLowerCase().includes('memory access out of bounds');

          if (!shouldRetryWebm) {
            throw primaryError;
          }

          console.warn('[VideoConverter] retrying webm with low-memory profile');
          ffmpegArgs = this.buildWebmFallbackArgs(inputName, outputName);
          outputData = await ffmpegService.processVideo(
            this.selectedFile,
            inputName,
            ffmpegArgs,
            outputName,
          );
        }

        if (this.downloadUrl) {
          URL.revokeObjectURL(this.downloadUrl);
        }
        const mimeType =
          extension === 'mp4'
            ? 'video/mp4'
            : extension === 'mkv'
              ? 'video/x-matroska'
              : extension === 'mov'
                ? 'video/quicktime'
                : extension === 'm4a'
                  ? 'audio/mp4'
                  : extension === 'mp3'
                    ? 'audio/mpeg'
                    : extension === 'gif'
                      ? 'image/gif'
            : extension === 'ts'
              ? 'video/mp2t'
              : 'video/webm';
        this.downloadUrl = URL.createObjectURL(new Blob([outputData.buffer], { type: mimeType }));
        this.progressPercent = 100;
      } catch (error) {
        console.error('[VideoConverter] conversion failed', error);
        this.errorMessage = formatMediaError(error, 'Conversion failed.');
      } finally {
        unsubscribe();
        this.isConverting = false;
      }
    },

    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
    },

    buildArgs(inputName, outputName) {
      if (this.outputFormat === 'mkv-remux') {
        return ['-threads', '1', '-i', inputName, '-c', 'copy', outputName];
      }

      if (this.outputFormat === 'mov-remux') {
        return ['-threads', '1', '-i', inputName, '-c', 'copy', outputName];
      }

      if (this.outputFormat === 'm4a-extract') {
        return ['-threads', '1', '-i', inputName, '-vn', '-c:a', 'copy', outputName];
      }

      if (this.outputFormat === 'mp3-extract') {
        return [
          '-threads',
          '1',
          '-i',
          inputName,
          '-vn',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '192k',
          outputName,
        ];
      }

      if (this.outputFormat === 'gif-short') {
        return [
          '-threads',
          '1',
          '-ss',
          '0',
          '-t',
          '3',
          '-i',
          inputName,
          '-vf',
          'fps=10,scale=480:-1:flags=lanczos',
          outputName,
        ];
      }

      if (this.outputFormat === 'ts-remux') {
        return [
          '-threads',
          '1',
          '-i',
          inputName,
          '-c',
          'copy',
          '-f',
          'mpegts',
          outputName,
        ];
      }

      if (this.outputFormat === 'mp4-remux') {
        return [
          '-threads',
          '1',
          '-i',
          inputName,
          '-c',
          'copy',
          '-movflags',
          'faststart',
          outputName,
        ];
      }

      if (this.outputFormat === 'mp4-transcode') {
        return [
          '-threads',
          '1',
          '-i',
          inputName,
          '-vf',
          'scale=min(1280,iw):-2',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '28',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          'faststart',
          outputName,
        ];
      }

      return [
        '-threads',
        '1',
        '-i',
        inputName,
        '-vf',
        'scale=min(1280,iw):-2',
        '-c:v',
        'libvpx',
        '-crf',
        '32',
        '-b:v',
        '0',
        '-deadline',
        'good',
        '-cpu-used',
        '4',
        '-c:a',
        'libopus',
        '-b:a',
        '96k',
        outputName,
      ];
    },

    buildWebmFallbackArgs(inputName, outputName) {
      return [
        '-threads',
        '1',
        '-i',
        inputName,
        '-vf',
        'scale=min(854,iw):-2,fps=24',
        '-an',
        '-c:v',
        'libvpx',
        '-deadline',
        'realtime',
        '-cpu-used',
        '8',
        '-b:v',
        '700k',
        '-maxrate',
        '900k',
        '-bufsize',
        '1800k',
        outputName,
      ];
    },
  },
  beforeUnmount() {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
  },
};
</script>

<style scoped>
.video-converter {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  min-height: 100vh;
  color: var(--text-primary);
}

.video-converter h1 {
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

input[type='file'] {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--space-xs);
}

.format-chip {
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-sm);
  text-align: left;
  cursor: pointer;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.format-chip:hover {
  border-color: var(--accent);
}

.format-chip.active {
  border-color: var(--accent);
  background: var(--bg-surface-active);
}

.format-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.format-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.format-sub {
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
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
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.error {
  color: #e5534b;
}
</style>
