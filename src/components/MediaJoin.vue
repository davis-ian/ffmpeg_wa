<template>
  <div class="tool-shell">
    <h1>Media Join</h1>

    <div class="panel">
      <label for="joinInput">Input Clips (same codec/container)</label>
      <FileInput id="joinInput" accept="video/*,audio/*" multiple :disabled="isProcessing" @change="handleFiles" />
      <ul class="list" v-if="selectedFiles.length">
        <li v-for="file in selectedFiles" :key="file.name + file.size">{{ file.name }}</li>
      </ul>
    </div>

    <div class="panel" v-if="selectedFiles.length">
      <div class="actions">
        <button class="btn" :disabled="isProcessing || selectedFiles.length < 2" @click="validate">Check Compatibility</button>
        <button class="btn btn-primary" :disabled="isProcessing || !compatible" @click="join">Join (Copy)</button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputName">Save {{ outputName }}</a>
      </div>
      <ProcessingProgress :show="isProcessing" :value="progressPercent" />
      <p class="meta" v-if="compatibleMessage">{{ compatibleMessage }}</p>
      <ul class="issues" v-if="issues.length">
        <li v-for="issue in issues" :key="issue">{{ issue }}</li>
      </ul>
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';
import { mediaJoinService } from '../services/mediaJoinService.js';
import { formatMediaError } from '../services/mediaErrors.js';
import ProcessingProgress from './ProcessingProgress.vue';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'MediaJoin',
  components: { ProcessingProgress, FileInput },
  data() {
    return {
      selectedFiles: [],
      isProcessing: false,
      progressPercent: 0,
      compatible: false,
      compatibleMessage: '',
      issues: [],
      downloadUrl: null,
      outputName: '',
      errorMessage: '',
    };
  },
  methods: {
    handleFiles(event) {
      this.selectedFiles = Array.from(event.target.files || []);
      this.compatible = false;
      this.compatibleMessage = '';
      this.issues = [];
      this.errorMessage = '';
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
    },
    async validate() {
      this.isProcessing = true;
      this.progressPercent = 10;
      this.errorMessage = '';
      try {
        const result = await mediaJoinService.validateCompatibility(this.selectedFiles);
        this.compatible = result.compatible;
        this.issues = result.reasons || [];
        this.compatibleMessage = result.compatible ? 'Files are compatible for copy-join.' : 'Files are not compatible for copy-join.';
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Compatibility check failed.');
      } finally {
        this.isProcessing = false;
      }
    },
    async join() {
      if (!this.compatible) {
        this.errorMessage = 'Run compatibility check first.';
        return;
      }

      this.isProcessing = true;
      this.progressPercent = 5;
      this.errorMessage = '';

      const unsub = ffmpegService.onProgress(({ progress }) => {
        this.progressPercent = Math.min(99, Math.max(5, Math.round(progress * 100)));
      });

      try {
        const result = await mediaJoinService.join(this.selectedFiles);
        if (!result.compatible) {
          this.compatible = false;
          this.issues = result.reasons;
          throw new Error('Files failed compatibility during join.');
        }

        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(new Blob([result.data.buffer], { type: result.mimeType }));
        this.outputName = `joined.${result.extension}`;
        this.progressPercent = 100;
      } catch (error) {
        this.errorMessage = formatMediaError(error, 'Media join failed.');
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
.panel { border: 1px solid var(--border); background: var(--bg-surface); padding: var(--space-md); margin-bottom: var(--space-md); }
label { display: block; margin-bottom: var(--space-xs); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
.list { margin-top: var(--space-sm); padding-left: 16px; color: var(--text-secondary); font-size: 0.85rem; }
.actions { margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.btn { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border); background: transparent; color: var(--text-primary); text-decoration: none; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
.btn-primary { border-color: var(--accent); color: var(--accent); }
.btn-success { border-color: #2ea44f; color: #2ea44f; }
.meta { margin-top: var(--space-xs); color: var(--text-secondary); font-size: 0.85rem; }
.issues { margin-top: var(--space-xs); color: #e5534b; font-size: 0.82rem; padding-left: 16px; }
.error { color: #e5534b; }
</style>
