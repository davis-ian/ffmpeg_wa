<template>
  <div class="tool-shell">
    <h1>Frame Sequence Export</h1>

    <div class="panel">
      <label for="frameInput">Input Video</label>
      <FileInput id="frameInput" accept="video/*" :disabled="isProcessing" @change="handleFile" />
      <p class="meta" v-if="selectedFile">{{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})</p>
    </div>

    <div class="panel" v-if="selectedFile">
      <div class="grid">
        <div>
          <label for="interval">Interval (seconds)</label>
          <input id="interval" v-model.number="intervalSeconds" type="number" min="0.2" step="0.2" :disabled="isProcessing" />
        </div>
        <div>
          <label for="quality">JPEG Quality (1 best, 31 low)</label>
          <input id="quality" v-model.number="quality" type="number" min="1" max="31" step="1" :disabled="isProcessing" />
        </div>
        <div>
          <label for="maxWidth">Max Width</label>
          <input id="maxWidth" v-model.number="maxWidth" type="number" min="320" step="10" :disabled="isProcessing" />
        </div>
      </div>

      <p class="meta">Frame guardrail: max {{ frameLimit }} frames</p>

      <div class="actions">
        <button class="btn btn-primary" :disabled="isProcessing" @click="exportFrames">
          {{ isProcessing ? 'Exporting...' : 'Export Frames (.zip)' }}
        </button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="downloadName">Save {{ downloadName }}</a>
      </div>
      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
      <p class="meta" v-if="frameCount">Frames exported: {{ frameCount }}</p>
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { frameExportService } from '../services/frameExportService.js';
import { formatMediaError } from '../services/mediaErrors.js';
import ProcessingProgress from './ProcessingProgress.vue';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'FrameSequenceExport',
  components: { ProcessingProgress, FileInput },
  data() {
    return {
      selectedFile: null,
      intervalSeconds: 2,
      quality: 3,
      maxWidth: 1280,
      frameLimit: frameExportService.maxFrameCount,
      frameCount: 0,
      isProcessing: false,
      progressPercent: 0,
      downloadUrl: null,
      downloadName: '',
      errorMessage: '',
    };
  },
  methods: {
    handleFile(event) {
      this.selectedFile = event.target.files?.[0] || null;
      this.errorMessage = '';
      this.frameCount = 0;
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
    },
    async exportFrames() {
      if (!this.selectedFile) return;
      this.errorMessage = '';
      this.isProcessing = true;
      this.progressPercent = 5;

      const unsub = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await frameExportService.exportFrames(this.selectedFile, {
          intervalSeconds: this.intervalSeconds,
          quality: this.quality,
          maxWidth: this.maxWidth,
          frameLimit: this.frameLimit,
        });

        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(result.zipBlob);
        this.downloadName = `${this.selectedFile.name.replace(/\.[^/.]+$/, '')}_frames.zip`;
        this.frameCount = result.count;
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Frame export failed.');
      } finally {
        unsub();
        this.isProcessing = false;
      }
    },
    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
    },
  },
  beforeUnmount() {
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
  },
};
</script>

<style scoped>
.tool-shell { max-width: 900px; margin: 0 auto; padding: var(--space-md); min-height: 100vh; color: var(--text-primary); }
.tool-shell h1 { font-size: 1.5rem; margin-bottom: var(--space-md); text-transform: uppercase; letter-spacing: 1px; }
.panel { border: 1px solid var(--border); background: var(--bg-surface); padding: var(--space-md); margin-bottom: var(--space-md); }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-sm); }
label { display: block; margin-bottom: var(--space-xs); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
input { width: 100%; padding: var(--space-sm); border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); }
.actions { margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.btn { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border); background: transparent; color: var(--text-primary); text-decoration: none; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
.btn-primary { border-color: var(--accent); color: var(--accent); }
.btn-success { border-color: #2ea44f; color: #2ea44f; }
.meta { margin-top: var(--space-xs); color: var(--text-secondary); font-size: 0.85rem; }
.error { color: #e5534b; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
