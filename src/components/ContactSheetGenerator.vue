<template>
  <div class="tool-shell">
    <h1>Contact Sheet Generator <span class="beta">Beta</span></h1>

    <div class="panel">
      <label for="sheetInput">Input Video</label>
      <FileInput id="sheetInput" accept="video/*" :disabled="isProcessing" @change="handleFile" />
      <p class="meta" v-if="selectedFile">{{ selectedFile.name }}</p>
    </div>

    <div class="panel" v-if="selectedFile">
      <div class="grid">
        <div>
          <label for="columns">Columns</label>
          <input id="columns" v-model.number="columns" type="number" min="2" max="8" :disabled="isProcessing" />
        </div>
        <div>
          <label for="rows">Rows</label>
          <input id="rows" v-model.number="rows" type="number" min="2" max="8" :disabled="isProcessing" />
        </div>
        <div>
          <label for="interval">Interval (sec)</label>
          <input id="interval" v-model.number="intervalSeconds" type="number" min="1" max="60" :disabled="isProcessing" />
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" :disabled="isProcessing" @click="generate">{{ isProcessing ? 'Generating...' : 'Generate Contact Sheet' }}</button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputName">Save {{ outputName }}</a>
      </div>
      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
      <img v-if="downloadUrl" :src="downloadUrl" alt="Contact sheet preview" class="preview" />
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { contactSheetService } from '../services/contactSheetService.js';
import { formatMediaError } from '../services/mediaErrors.js';
import ProcessingProgress from './ProcessingProgress.vue';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'ContactSheetGenerator',
  components: { ProcessingProgress, FileInput },
  data() {
    return {
      selectedFile: null,
      columns: 4,
      rows: 4,
      intervalSeconds: 10,
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
    async generate() {
      if (!this.selectedFile) return;
      this.errorMessage = '';
      this.isProcessing = true;
      this.progressPercent = 5;

      const unsub = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await contactSheetService.generate(this.selectedFile, {
          columns: this.columns,
          rows: this.rows,
          intervalSeconds: this.intervalSeconds,
          cellWidth: 320,
        });

        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(new Blob([result.data.buffer], { type: result.mimeType }));
        this.outputName = `${this.selectedFile.name.replace(/\.[^/.]+$/, '')}_sheet.${result.extension}`;
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Contact sheet generation failed.');
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
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-sm); }
label { display: block; margin-bottom: var(--space-xs); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
input { width: 100%; padding: var(--space-sm); border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); }
.actions { margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.btn { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border); background: transparent; color: var(--text-primary); text-decoration: none; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
.btn-primary { border-color: var(--accent); color: var(--accent); }
.btn-success { border-color: #2ea44f; color: #2ea44f; }
.meta { margin-top: var(--space-xs); color: var(--text-secondary); font-size: 0.85rem; }
.preview { width: 100%; margin-top: var(--space-sm); border: 1px solid var(--border); background: var(--bg-primary); }
.error { color: #e5534b; }
@media (max-width: 768px){ .grid { grid-template-columns: 1fr; } }
</style>
