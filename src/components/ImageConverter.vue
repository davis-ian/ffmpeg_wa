<template>
  <div class="image-converter">
    <h1>Image Converter</h1>

    <div class="panel">
      <label for="imageInput">Input Image</label>
      <FileInput
        id="imageInput"
        accept="image/png,image/jpeg,image/webp"
        :disabled="isConverting"
        @change="handleFileChange"
      />
      <p class="meta" v-if="selectedFile">
        {{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})
      </p>
    </div>

    <div class="panel" v-if="selectedFile">
      <label>Output Format</label>
      <div class="chip-group">
        <button
          v-for="fmt in formatOptions"
          :key="fmt.value"
          type="button"
          class="chip"
          :class="{ active: outputFormat === fmt.value }"
          :disabled="isConverting"
          @click="outputFormat = fmt.value"
        >
          {{ fmt.label }}
        </button>
      </div>

      <label for="resizePreset">Resize</label>
      <select id="resizePreset" v-model="resizePreset" :disabled="isConverting">
        <option value="original">Original</option>
        <option value="medium">Medium (max width 1280)</option>
        <option value="small">Small (max width 800)</option>
      </select>

      <div v-if="showQuality" class="quality-wrap">
        <label for="quality">Quality ({{ Math.round(quality * 100) }}%)</label>
        <input id="quality" v-model.number="quality" type="range" min="0.1" max="1" step="0.05" :disabled="isConverting" />
      </div>

      <p class="meta">Output: {{ outputFileName }}</p>

      <div class="actions">
        <button class="btn btn-primary" :disabled="isConverting" @click="convert">
          {{ isConverting ? 'Converting...' : 'Convert Image' }}
        </button>
        <a v-if="downloadUrl" class="btn btn-success" :href="downloadUrl" :download="outputFileName">
          Save {{ outputFileName }}
        </a>
      </div>

      <ProcessingProgress :show="isConverting" :value="progressPercent" />

      <p class="meta" v-if="outputSize">Converted size: {{ formatBytes(outputSize) }}</p>
      <p class="meta" v-if="outputDimensions">Dimensions: {{ outputDimensions }}</p>
    </div>

    <div class="preview-grid" v-if="selectedPreviewUrl || convertedPreviewUrl">
      <div class="panel">
        <p class="meta">Original Preview</p>
        <img v-if="selectedPreviewUrl" :src="selectedPreviewUrl" alt="Original preview" class="preview-image" />
      </div>
      <div class="panel" v-if="convertedPreviewUrl">
        <p class="meta">Converted Preview</p>
        <img :src="convertedPreviewUrl" alt="Converted preview" class="preview-image" />
      </div>
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { imageService } from '../services/imageService.js';
import ProcessingProgress from './ProcessingProgress.vue';
import { formatMediaError } from '../services/mediaErrors.js';
import FileInput from './ui/FileInput.vue';

export default {
  name: 'ImageConverter',
  components: {
    ProcessingProgress,
    FileInput,
  },
  data() {
    return {
      selectedFile: null,
      outputFormat: 'png',
      resizePreset: 'original',
      quality: 0.85,
      isConverting: false,
      progressPercent: 0,
      downloadUrl: null,
      selectedPreviewUrl: null,
      convertedPreviewUrl: null,
      outputSize: 0,
      outputDimensions: '',
      errorMessage: '',
    };
  },
  computed: {
    formatOptions() {
      return [
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'webp', label: 'WebP' },
      ];
    },
    showQuality() {
      return this.outputFormat === 'jpeg' || this.outputFormat === 'webp';
    },
    outputFileName() {
      if (!this.selectedFile) return '';
      const baseName = this.selectedFile.name.replace(/\.[^/.]+$/, '') || 'converted';
      const ext = this.outputFormat === 'jpeg' ? 'jpg' : this.outputFormat;
      return `${baseName}.${ext}`;
    },
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files?.[0] || null;
      this.errorMessage = '';
      this.outputSize = 0;
      this.outputDimensions = '';

      if (this.selectedPreviewUrl) {
        URL.revokeObjectURL(this.selectedPreviewUrl);
        this.selectedPreviewUrl = null;
      }
      if (this.convertedPreviewUrl) {
        URL.revokeObjectURL(this.convertedPreviewUrl);
        this.convertedPreviewUrl = null;
      }
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }

      this.selectedFile = file;
      if (file) {
        this.selectedPreviewUrl = URL.createObjectURL(file);
      }
    },

    async convert() {
      if (!this.selectedFile) {
        this.errorMessage = 'Select an image file first.';
        return;
      }

      this.errorMessage = '';
      this.isConverting = true;
      this.progressPercent = 15;

      try {
        const result = await imageService.convert(this.selectedFile, {
          format: this.outputFormat,
          quality: this.quality,
          resizePreset: this.resizePreset,
        });

        this.progressPercent = 85;

        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        if (this.convertedPreviewUrl) URL.revokeObjectURL(this.convertedPreviewUrl);

        this.downloadUrl = URL.createObjectURL(result.blob);
        this.convertedPreviewUrl = this.downloadUrl;
        this.outputSize = result.blob.size;
        this.outputDimensions = `${result.width} x ${result.height}`;

        this.progressPercent = 100;
      } catch (error) {
        console.error('[ImageConverter] convert failed', error);
        this.errorMessage = formatMediaError(error, 'Image conversion failed.');
      } finally {
        this.isConverting = false;
      }
    },

    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${(bytes / 1024 ** idx).toFixed(2)} ${units[idx]}`;
    },
  },
  beforeUnmount() {
    if (this.selectedPreviewUrl) URL.revokeObjectURL(this.selectedPreviewUrl);
    if (this.convertedPreviewUrl && this.convertedPreviewUrl !== this.downloadUrl) {
      URL.revokeObjectURL(this.convertedPreviewUrl);
    }
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
  },
};
</script>

<style scoped>
.image-converter {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  min-height: 100vh;
  color: var(--text-primary);
}

.image-converter h1 {
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
select,
input[type='range'] {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.chip-group {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin-bottom: var(--space-sm);
}

.chip {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.chip.active {
  border-color: var(--accent);
  color: var(--accent);
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

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.preview-image {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  background: var(--bg-primary);
  border: 1px solid var(--border);
}

.error {
  color: #e5534b;
}

@media (max-width: 768px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
