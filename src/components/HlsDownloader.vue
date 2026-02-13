<template>
  <div class="hls-downloader">
    <h1>HLS Downloader</h1>

    <div class="panel">
      <label for="manifestUrl">Manifest URL (.m3u8)</label>
      <input
        id="manifestUrl"
        v-model.trim="manifestUrl"
        type="url"
        placeholder="https://example.com/path/playlist.m3u8"
        :disabled="isLoading || isDownloading || isRemuxing"
      />

      <div class="actions">
        <button
          class="btn btn-primary"
          @click="loadManifest"
          :disabled="!manifestUrl || isLoading || isDownloading || isRemuxing"
        >
          {{ isLoading ? 'Loading...' : 'Load Playlist' }}
        </button>
      </div>
    </div>

    <div class="panel" v-if="manifestLoaded && variants.length">
      <label for="variant">Variant Stream</label>
      <select
        id="variant"
        v-model="selectedVariantUrl"
        :disabled="isLoading || isDownloading || isRemuxing"
      >
        <option v-for="variant in variants" :key="variant.url" :value="variant.url">
          {{ variant.label }}
        </option>
      </select>
    </div>

    <div class="panel" v-if="manifestLoaded">
      <p class="meta">Preview</p>
      <video ref="previewVideo" class="preview-player" controls playsinline muted></video>
    </div>

    <div class="panel" v-if="manifestLoaded">
      <p class="meta">Segments: {{ segmentCount }}</p>
      <p class="meta" v-if="isDownloading || isRemuxing">
        {{ statusLabel }}
      </p>
      <div class="progress-wrap" v-if="isDownloading || isRemuxing">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${downloadProgress}%` }"></div>
        </div>
        <span class="progress-text">{{ downloadProgress }}%</span>
      </div>
      <div class="actions">
        <button
          class="btn btn-primary"
          @click="downloadSegments"
          :disabled="!segmentCount || isLoading || isDownloading || isRemuxing"
        >
          {{ actionLabel }}
        </button>
        <a
          v-if="downloadUrl"
          class="btn btn-success"
          :href="downloadUrl"
          :download="outputFileName"
        >
          Save {{ outputFileName }}
        </a>
      </div>
    </div>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
    <p class="note">
      Notes: this downloader requires CORS access to the manifest and segments. Encrypted DRM streams are not supported.
    </p>
  </div>
</template>

<script>
import { nextTick } from 'vue';
import Hls from 'hls.js';
import { ffmpegService } from '../services/ffmpegService.js';

const M3U_HEADER = '#EXTM3U';

export default {
  name: 'HlsDownloader',
  data() {
    return {
      manifestUrl: '',
      isLoading: false,
      isDownloading: false,
      isRemuxing: false,
      manifestLoaded: false,
      variants: [],
      selectedVariantUrl: '',
      segmentUrls: [],
      segmentCount: 0,
      downloadedSegments: 0,
      downloadUrl: null,
      outputFileName: 'stream.mp4',
      previewSourceUrl: '',
      errorMessage: '',
      hlsInstance: null,
    };
  },
  computed: {
    downloadProgress() {
      if (this.isRemuxing) return 100;
      if (!this.segmentCount) return 0;
      return Math.min(100, Math.round((this.downloadedSegments / this.segmentCount) * 100));
    },
    actionLabel() {
      if (this.isRemuxing) return 'Muxing MP4...';
      if (this.isDownloading) return 'Downloading Segments...';
      return 'Download Stream (.mp4)';
    },
    statusLabel() {
      if (this.isRemuxing) {
        return 'Converting to MP4...';
      }
      return `Downloaded: ${this.downloadedSegments} / ${this.segmentCount}`;
    },
  },
  watch: {
    async selectedVariantUrl(nextUrl) {
      if (!this.manifestLoaded || !nextUrl) {
        return;
      }
      this.errorMessage = '';
      this.isLoading = true;
      try {
        await this.loadVariantSegments(nextUrl);
        this.segmentCount = this.segmentUrls.length;
        await this.setupPreview(nextUrl);
      } catch (error) {
        this.errorMessage = error?.message || 'Failed to switch variant stream.';
      } finally {
        this.isLoading = false;
      }
    },
  },
  methods: {
    async loadManifest() {
      this.resetDownloadState();
      this.errorMessage = '';
      this.manifestLoaded = false;

      if (!this.manifestUrl) {
        this.errorMessage = 'Enter an HLS manifest URL.';
        return;
      }

      this.isLoading = true;
      try {
        const baseUrl = new URL(this.manifestUrl, window.location.href);
        const text = await this.fetchText(baseUrl.href);
        this.assertM3U(text);

        const parsed = this.parseMasterPlaylist(text, baseUrl.href);
        if (parsed.length > 0) {
          this.variants = parsed;
          this.selectedVariantUrl = parsed[0].url;
          await this.loadVariantSegments(this.selectedVariantUrl);
        } else {
          this.variants = [];
          this.selectedVariantUrl = '';
          this.segmentUrls = this.parseMediaPlaylist(text, baseUrl.href);
        }

        this.segmentCount = this.segmentUrls.length;
        this.manifestLoaded = true;
        this.outputFileName = this.buildOutputFileName(this.manifestUrl);
        await nextTick();
        const previewUrl = this.selectedVariantUrl || baseUrl.href;
        await this.setupPreview(previewUrl);
      } catch (error) {
        this.errorMessage = error?.message || 'Failed to load manifest.';
      } finally {
        this.isLoading = false;
      }
    },

    async loadVariantSegments(variantUrl) {
      const text = await this.fetchText(variantUrl);
      this.assertM3U(text);
      this.segmentUrls = this.parseMediaPlaylist(text, variantUrl);
    },

    async downloadSegments() {
      this.errorMessage = '';
      this.downloadedSegments = 0;

      if (this.variants.length > 0 && this.selectedVariantUrl) {
        try {
          await this.loadVariantSegments(this.selectedVariantUrl);
          this.segmentCount = this.segmentUrls.length;
        } catch (error) {
          this.errorMessage = error?.message || 'Failed to load selected variant.';
          return;
        }
      }

      if (!this.segmentUrls.length) {
        this.errorMessage = 'No media segments found in playlist.';
        return;
      }

      this.isDownloading = true;
      try {
        const chunks = [];
        let totalLength = 0;

        for (const url of this.segmentUrls) {
          const data = await this.fetchBinary(url);
          chunks.push(data);
          totalLength += data.byteLength;
          this.downloadedSegments += 1;
        }

        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of chunks) {
          merged.set(part, offset);
          offset += part.byteLength;
        }

        this.isDownloading = false;
        this.isRemuxing = true;
        const mp4Data = await this.remuxToMp4(merged);

        if (this.downloadUrl) {
          URL.revokeObjectURL(this.downloadUrl);
        }

        const blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
        this.downloadUrl = URL.createObjectURL(blob);
      } catch (error) {
        this.errorMessage = error?.message || 'Failed while downloading segments.';
      } finally {
        this.isDownloading = false;
        this.isRemuxing = false;
      }
    },

    async remuxToMp4(tsData) {
      const stamp = Date.now();
      const inputName = `hls_${stamp}.ts`;
      const outputName = `hls_${stamp}.mp4`;

      try {
        await ffmpegService.load();
        await ffmpegService.writeFile(inputName, tsData);
        const exitCode = await ffmpegService.exec([
          '-i',
          inputName,
          '-c',
          'copy',
          '-movflags',
          'faststart',
          outputName,
        ]);
        if (exitCode !== 0) {
          throw new Error(`FFmpeg remux failed with exit code ${exitCode}`);
        }
        return await ffmpegService.readFile(outputName);
      } finally {
        try {
          await ffmpegService.deleteFile(inputName);
        } catch {
          // no-op
        }
        try {
          await ffmpegService.deleteFile(outputName);
        } catch {
          // no-op
        }
      }
    },

    async setupPreview(sourceUrl) {
      this.previewSourceUrl = sourceUrl;
      await nextTick();
      const video = this.$refs.previewVideo;
      if (!video) {
        console.warn('[HlsDownloader] preview video element not mounted yet');
        return;
      }

      this.destroyPreview();
      video.onloadedmetadata = () => {
        console.log('[HlsDownloader] preview metadata loaded', {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.onerror = () => {
        const mediaError = video.error;
        console.error('[HlsDownloader] preview media element error', mediaError);
        this.errorMessage = 'Preview failed to load in video element.';
      };

      if (Hls.isSupported()) {
        this.hlsInstance = new Hls({
          enableWorker: true,
        });
        this.hlsInstance.attachMedia(video);
        this.hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
          this.hlsInstance.loadSource(sourceUrl);
        });
        this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          // hls.js owns MediaSource attachment; calling video.load() here can invalidate blob URLs in Chromium.
          console.log('[HlsDownloader] hls.js manifest parsed');
        });
        this.hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal) {
            this.errorMessage = `Preview error: ${data.type}`;
            console.error('[HlsDownloader] fatal preview error', data);
          }
        });
        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.load();
        console.log('[HlsDownloader] using native HLS preview');
        return;
      }

      this.errorMessage = 'HLS preview is not supported in this browser.';
    },

    destroyPreview() {
      const video = this.$refs.previewVideo;
      if (this.hlsInstance) {
        this.hlsInstance.destroy();
        this.hlsInstance = null;
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    },

    parseMasterPlaylist(text, baseUrl) {
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const variants = [];

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.startsWith('#EXT-X-STREAM-INF')) {
          continue;
        }

        const nextLine = lines[i + 1];
        if (!nextLine || nextLine.startsWith('#')) {
          continue;
        }

        const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const labelParts = [];

        if (resolutionMatch) {
          labelParts.push(resolutionMatch[1]);
        }
        if (bandwidthMatch) {
          labelParts.push(`${Math.round(Number(bandwidthMatch[1]) / 1000)} kbps`);
        }

        const resolvedUrl = new URL(nextLine, baseUrl).href;
        variants.push({
          url: resolvedUrl,
          label: labelParts.length ? labelParts.join(' - ') : resolvedUrl,
        });
      }

      return variants;
    },

    parseMediaPlaylist(text, baseUrl) {
      const lines = text.split('\n').map((line) => line.trim());
      const media = [];

      for (const line of lines) {
        if (!line || line.startsWith('#')) {
          continue;
        }
        media.push(new URL(line, baseUrl).href);
      }

      return media;
    },

    async fetchText(url) {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }
      return await response.text();
    },

    async fetchBinary(url) {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Segment request failed (${response.status}) for ${url}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },

    assertM3U(text) {
      if (!text || !text.includes(M3U_HEADER)) {
        throw new Error('URL does not appear to be a valid .m3u8 playlist.');
      }
    },

    buildOutputFileName(sourceUrl) {
      try {
        const pathname = new URL(sourceUrl).pathname;
        const base = pathname.split('/').pop() || 'stream';
        const clean = base.replace(/\.m3u8$/i, '') || 'stream';
        return `${clean}.mp4`;
      } catch {
        return 'stream.mp4';
      }
    },

    resetDownloadState() {
      this.variants = [];
      this.selectedVariantUrl = '';
      this.segmentUrls = [];
      this.segmentCount = 0;
      this.downloadedSegments = 0;
      this.previewSourceUrl = '';
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = null;
      }
      this.destroyPreview();
    },
  },
  beforeUnmount() {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
    this.destroyPreview();
  },
};
</script>

<style scoped>
.hls-downloader {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
  min-height: 100vh;
  color: var(--text-primary);
}

.hls-downloader h1 {
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

input,
select {
  width: 100%;
  padding: var(--space-sm);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
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

.preview-player {
  width: 100%;
  max-height: 360px;
  background: #000;
  margin-top: var(--space-sm);
}

.progress-wrap {
  margin-top: var(--space-sm);
}

.progress-bar {
  width: 100%;
  height: 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s ease;
}

.progress-text {
  display: inline-block;
  margin-top: var(--space-xs);
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.error {
  color: #e5534b;
  margin-top: var(--space-sm);
}

.note {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
