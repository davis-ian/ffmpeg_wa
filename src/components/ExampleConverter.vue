<template>
  <div class="example-tool">
    <h1>Video Converter Example</h1>
    
    <div class="file-section">
      <input 
        type="file" 
        @change="handleFile" 
        accept="video/*"
        :disabled="isConverting"
      />
    </div>

    <div class="options" v-if="file">
      <h3>Conversion Options</h3>
      <select v-model="outputFormat">
        <option value="mp4">MP4 (H.264)</option>
        <option value="webm">WebM (VP9)</option>
      </select>
    </div>

    <div class="actions" v-if="file">
      <button 
        @click="convert" 
        :disabled="isConverting"
        class="btn-primary"
      >
        {{ isConverting ? 'Converting...' : 'Convert Video' }}
      </button>
    </div>

    <div class="progress" v-if="isConverting">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span>{{ progress }}%</span>
    </div>

    <div class="result" v-if="downloadUrl">
      <h3>Conversion Complete</h3>
      <a :href="downloadUrl" :download="outputFilename" class="btn-success">
        Download {{ outputFilename }}
      </a>
    </div>
  </div>
</template>

<script>
/**
 * Example Tool - Shows how to build a new video tool using ffmpegService
 * 
 * This demonstrates:
 * - Loading FFmpeg service
 * - Processing video files
 * - Handling progress updates
 * - Downloading results
 */
import { ffmpegService } from '../services/ffmpegService.js';

export default {
  name: 'ExampleConverter',
  data() {
    return {
      file: null,
      outputFormat: 'mp4',
      isConverting: false,
      progress: 0,
      downloadUrl: null,
    };
  },
  computed: {
    outputFilename() {
      if (!this.file) return '';
      const name = this.file.name.replace(/\.[^/.]+$/, '');
      return `${name}_converted.${this.outputFormat}`;
    },
  },
  async mounted() {
    // Initialize FFmpeg service once
    try {
      await ffmpegService.load();
      console.log('FFmpeg ready');
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
      alert('Failed to initialize video processor');
    }
  },
  methods: {
    handleFile(event) {
      this.file = event.target.files[0];
      this.downloadUrl = null;
      this.progress = 0;
    },
    
    async convert() {
      if (!this.file) return;
      
      this.isConverting = true;
      this.progress = 0;
      
      // Subscribe to progress updates
      const unsubscribeProgress = ffmpegService.onProgress(({ progress }) => {
        this.progress = Math.round(progress * 100);
      });
      
      try {
        // Define conversion arguments based on format
        const ffmpegArgs = this.outputFormat === 'webm' 
          ? ['-i', 'input', '-c:v', 'libvpx-vp9', '-c:a', 'libopus', 'output.webm']
          : ['-i', 'input', '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', 'output.mp4'];
        
        // Process video using service
        const outputData = await ffmpegService.processVideo(
          this.file,
          'input',                                    // virtual input name
          ffmpegArgs,                                 // FFmpeg command
          `output.${this.outputFormat}`              // virtual output name
        );
        
        // Create download URL
        const mimeType = this.outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
        const blob = new Blob([outputData.buffer], { type: mimeType });
        this.downloadUrl = URL.createObjectURL(blob);
        
      } catch (err) {
        console.error('Conversion failed:', err);
        alert('Conversion failed: ' + err.message);
      } finally {
        this.isConverting = false;
        unsubscribeProgress(); // Clean up progress listener
      }
    },
  },
  beforeUnmount() {
    // Clean up object URL
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
  },
};
</script>

<style scoped>
.example-tool {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.file-section {
  margin: 20px 0;
}

.options {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #333;
}

.options h3 {
  margin-top: 0;
  text-transform: uppercase;
  font-size: 0.8rem;
  color: #666;
}

.options select {
  width: 100%;
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #fff;
}

.actions {
  margin: 20px 0;
}

button {
  padding: 10px 20px;
  background: #ff9900;
  color: #000;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  font-weight: bold;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress {
  margin: 20px 0;
}

.progress-bar {
  height: 4px;
  background: #333;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: #ff9900;
  transition: width 0.3s;
}

.result {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ff9900;
}

.btn-success {
  display: inline-block;
  padding: 10px 20px;
  background: transparent;
  border: 1px solid #4caf50;
  color: #4caf50;
  text-decoration: none;
}
</style>
