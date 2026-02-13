<template>
  <div class="tool-shell">
    <h1>Container Rewrap <span class="beta">Beta</span></h1>

    <div class="panel">
      <label for="rewrapInput">Input Media</label>
      <FileInput id="rewrapInput" accept="video/*" :disabled="isProcessing" @change="handleFile" />
      <p class="meta" v-if="selectedFile">{{ selectedFile.name }}</p>
    </div>

    <div class="panel" v-if="selectedFile">
      <label>Output Container</label>
      <div class="chip-group">
        <button v-for="opt in outputOptions" :key="opt" type="button" class="chip" :class="{ active: outputFormat === opt }" :disabled="isProcessing" @click="outputFormat = opt">
          {{ opt.toUpperCase() }}
        </button>
      </div>

      <div class="actions">
        <button class="btn btn-primary" :disabled="isProcessing" @click="rewrap">{{ isProcessing ? 'Rewrapping...' : 'Rewrap (Copy)' }}</button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputName">Save {{ outputName }}</a>
      </div>
      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { containerRewrapService } from '../services/containerRewrapService.js';
import { formatMediaError } from '../services/mediaErrors.js';
import ProcessingProgress from './ProcessingProgress.vue';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'ContainerRewrap',
  components: { ProcessingProgress, FileInput },
  data() {
    return {
      selectedFile: null,
      outputFormat: 'mkv',
      outputOptions: ['mkv', 'mov', 'mp4', 'ts'],
      isProcessing: false,
      progressPercent: 0,
      downloadUrl: null,
      outputName: '',
      errorMessage: '',
    };
  },
  methods: {
    handleFile(event) {
      this.selectedFile = event.target.files?.[0] || null;
      this.errorMessage = '';
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
    },
    async rewrap() {
      if (!this.selectedFile) return;
      this.errorMessage = '';
      this.isProcessing = true;
      this.progressPercent = 5;

      const unsub = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await containerRewrapService.rewrap(this.selectedFile, this.outputFormat);
        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(new Blob([result.data.buffer], { type: result.mimeType }));
        this.outputName = `${this.selectedFile.name.replace(/\.[^/.]+$/, '')}.${result.extension}`;
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Container rewrap failed.');
      } finally {
        unsub();
        this.isProcessing = false;
      }
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
.beta { font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; }
.panel { border: 1px solid var(--border); background: var(--bg-surface); padding: var(--space-md); margin-bottom: var(--space-md); }
label { display: block; margin-bottom: var(--space-xs); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
.chip-group { display: flex; gap: var(--space-xs); flex-wrap: wrap; margin-bottom: var(--space-sm); }
.chip { padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; font-size: 0.8rem; text-transform: uppercase; }
.chip.active { border-color: var(--accent); color: var(--accent); }
.actions { margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.btn { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border); background: transparent; color: var(--text-primary); text-decoration: none; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
.btn-primary { border-color: var(--accent); color: var(--accent); }
.btn-success { border-color: #2ea44f; color: #2ea44f; }
.meta { margin-top: var(--space-xs); color: var(--text-secondary); font-size: 0.85rem; }
.error { color: #e5534b; }
</style>
