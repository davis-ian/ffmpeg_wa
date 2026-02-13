<template>
  <div class="tool-shell">
    <h1>Audio Extractor</h1>

    <div class="panel">
      <label for="extractInput">Input Media</label>
      <FileInput id="extractInput" accept="audio/*,video/*" :disabled="isProcessing" @change="handleFile" />
      <p class="meta" v-if="selectedFile">{{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})</p>
    </div>

    <div class="panel" v-if="selectedFile">
      <div class="actions">
        <button class="btn btn-primary" :disabled="isProcessing" @click="extractAudio">
          {{ isProcessing ? 'Extracting...' : 'Extract Audio' }}
        </button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputName">Save {{ outputName }}</a>
      </div>
      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
      <p class="meta" v-if="strategy">Strategy: {{ strategy }}</p>
      <p class="note" v-if="warningMessage">{{ warningMessage }}</p>
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { audioExtractService } from '../services/audioExtractService.js';
import { formatMediaError } from '../services/mediaErrors.js';
import ProcessingProgress from './ProcessingProgress.vue';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'AudioExtractor',
  components: { ProcessingProgress, FileInput },
  data() {
    return {
      selectedFile: null,
      isProcessing: false,
      progressPercent: 0,
      downloadUrl: null,
      outputName: '',
      strategy: '',
      warningMessage: '',
      errorMessage: '',
    };
  },
  methods: {
    handleFile(event) {
      this.selectedFile = event.target.files?.[0] || null;
      this.errorMessage = '';
      this.warningMessage = '';
      this.strategy = '';
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
    },
    async extractAudio() {
      if (!this.selectedFile) return;
      this.isProcessing = true;
      this.progressPercent = 5;
      this.errorMessage = '';

      const unsub = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await audioExtractService.extract(this.selectedFile);
        const base = this.selectedFile.name.replace(/\.[^/.]+$/, '') || 'audio';
        this.outputName = `${base}.${result.extension}`;
        this.strategy = result.strategy;
        this.warningMessage = result.warnings?.[0] || '';

        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(new Blob([result.data.buffer], { type: result.mimeType }));
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Audio extraction failed.');
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
label { display: block; margin-bottom: var(--space-xs); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
.actions { margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.btn { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border); background: transparent; color: var(--text-primary); text-decoration: none; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
.btn-primary { border-color: var(--accent); color: var(--accent); }
.btn-success { border-color: #2ea44f; color: #2ea44f; }
.meta { margin-top: var(--space-xs); color: var(--text-secondary); font-size: 0.85rem; }
.note { color: var(--text-muted); font-size: 0.8rem; }
.error { color: #e5534b; }
</style>
