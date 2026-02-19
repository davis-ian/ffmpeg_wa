<template>
  <div class="hls-inspector">
    <header class="page-header">
      <div>
        <p class="eyebrow">Video · Insight</p>
        <h1>HLS Inspector</h1>
        <p class="lede">
          Fetch any HLS manifest, explore its playlists, and spin up mini
          preview players for individual chunks before you commit to a download.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-heading">
        <h2>Manifest Source</h2>
        <span class="status-pill" v-if="rootManifestFetchedAt"
          >Loaded {{ formatRelativeTime(rootManifestFetchedAt) }}</span
        >
      </div>
      <label for="manifestUrl">Manifest URL (.m3u8)</label>
      <div class="manifest-input-row">
        <input
          id="manifestUrl"
          v-model.trim="manifestUrl"
          type="url"
          placeholder="https://example.com/master.m3u8"
          :disabled="isLoadingManifest || isLoadingSegments"
        />
        <button
          class="btn btn-primary"
          type="button"
          @click="inspectManifest"
          :disabled="!manifestUrl || isLoadingManifest"
        >
          {{ isLoadingManifest ? "Loading..." : "Inspect" }}
        </button>
        <button
          v-if="rootManifestText"
          class="btn"
          type="button"
          @click="refreshActivePlaylist"
          :disabled="isLoadingManifest || isLoadingSegments"
        >
          Refresh Active
        </button>
      </div>
      <p class="hint">
        CORS access is required. DRM-encrypted streams will not render in
        preview tiles.
      </p>
    </section>

    <section class="panel" v-if="segments.length">
      <div class="panel-heading">
        <h2>Chunk Timeline</h2>
        <div class="panel-actions">
          <span class="status-pill" v-if="activePlaylistFetchedAt"
            >Refreshed
            {{ formatRelativeTime(activePlaylistFetchedAt) || "—" }}</span
          >
          <input
            v-model.trim="segmentFilter"
            class="filter-input"
            type="search"
            placeholder="Filter by URI or EXTINF title"
          />
        </div>
      </div>
      <div class="chunk-view">
        <div class="chunk-list">
          <div class="chunk-list-header">
            <span>#</span>
            <span>Start</span>
            <span>Duration</span>
            <span>Program Time</span>
            <span>URI</span>
          </div>
          <div class="chunk-list-scroll" ref="chunkListScroller">
            <button
              v-for="segment in filteredSegments"
              :key="segment.index"
              type="button"
              class="chunk-row"
              :class="{ selected: selectedSegmentIndex === segment.index }"
              @click="handleSegmentClick(segment)"
            >
              <span class="chunk-index">#{{ segment.index }}</span>
              <span>{{ formatStart(segment.startTime) }}</span>
              <span>{{ formatDuration(segment.duration) }}</span>
              <span>{{
                displayTimestamp(segment.programDateTime) || "—"
              }}</span>
              <span class="uri">{{ segment.uri }}</span>
            </button>
          </div>
        </div>
        <div class="chunk-preview">
          <header class="chunk-preview-header">
            <div>
              <h3>Preview Player</h3>
              <p class="hint">Click a chunk to load it below.</p>
            </div>
            <a
              v-if="previewSegment"
              :href="previewSegment.absoluteUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
            </a>
          </header>
          <div class="preview-video">
            <video
              ref="previewVideo"
              muted
              playsinline
              preload="auto"
              controls
            ></video>
          </div>
          <div class="chunk-preview-meta" v-if="previewSegment">
            <p><strong>Index</strong> #{{ previewSegment.index }}</p>
            <p>
              <strong>Duration</strong>
              {{ formatDuration(previewSegment.duration) }}
            </p>
            <p>
              <strong>Program Time</strong>
              {{ displayTimestamp(previewSegment.programDateTime) || "—" }}
            </p>
            <p class="mono">{{ previewSegment.absoluteUrl }}</p>
          </div>
          <p class="hint" v-else>Waiting for a chunk selection.</p>
          <p class="error" v-if="previewError">{{ previewError }}</p>
        </div>
      </div>
    </section>

    <section class="panel" v-if="rootManifestText">
      <div class="panel-heading">
        <h2>Root Manifest</h2>
        <div class="detail-tags">
          <span class="tag">{{ manifestTypeLabel }}</span>
          <span class="tag" v-if="manifestSummary?.isLowLatency"
            >Low-Latency</span
          >
          <span class="tag" v-if="manifestSummary?.hasIFrames"
            >I-Frame Tracks</span
          >
        </div>
      </div>
      <dl class="data-grid">
        <div>
          <dt>Origin URL</dt>
          <dd class="mono">{{ manifestUrl }}</dd>
        </div>
        <div>
          <dt>Variant Count</dt>
          <dd>{{ variants.length || (manifestType === "media" ? "—" : 0) }}</dd>
        </div>
        <div>
          <dt>Lines</dt>
          <dd>{{ manifestSummary?.rawLineCount || "—" }}</dd>
        </div>
        <div>
          <dt>Fetched</dt>
          <dd>{{ formatAbsoluteTime(rootManifestFetchedAt) }}</dd>
        </div>
      </dl>
      <div class="manifest-raw" v-if="rootManifestText">
        <div class="manifest-raw__heading">
          <h3>Raw manifest</h3>
          <span class="mono small-label"
            >Last updated
            {{ formatRelativeTime(rootManifestFetchedAt) || "—" }}</span
          >
        </div>
        <pre
          class="manifest-pre manifest-pre--full"
        ><code>{{ rootManifestText }}</code></pre>
      </div>
    </section>

    <section class="panel" v-if="manifestType === 'master' && variants.length">
      <div class="panel-heading">
        <h2>Variant Streams</h2>
        <span class="status-pill" v-if="selectedVariantUrl"
          >Active variant</span
        >
      </div>
      <select v-model="selectedVariantUrl" :disabled="isLoadingSegments">
        <option
          v-for="variant in variants"
          :key="variant.url"
          :value="variant.url"
        >
          {{ variant.label }}
        </option>
      </select>
      <ul class="variant-list">
        <li
          v-for="variant in variants"
          :key="`${variant.url}-meta`"
          :class="{ active: variant.url === selectedVariantUrl }"
        >
          <span>{{ variant.label }}</span>
          <small>
            <span v-if="variant.codecs">{{ variant.codecs }}</span>
            <span v-if="variant.frameRate"> · {{ variant.frameRate }} fps</span>
          </small>
        </li>
      </ul>
    </section>

    <section class="panel" v-if="activePlaylistText">
      <div class="panel-heading">
        <h2>Active Media Playlist</h2>
        <span class="status-pill">{{ segments.length }} segments</span>
      </div>
      <dl class="data-grid">
        <div>
          <dt>Target Duration</dt>
          <dd>
            <span v-if="manifestMetadata?.targetDuration"
              >{{ manifestMetadata.targetDuration }}s</span
            >
            <span v-else>—</span>
          </dd>
        </div>
        <div>
          <dt>Media Sequence</dt>
          <dd>{{ manifestMetadata?.mediaSequence ?? "—" }}</dd>
        </div>
        <div>
          <dt>Playlist Type</dt>
          <dd>
            {{
              manifestMetadata?.playlistType ||
              (manifestMetadata?.hasEndList ? "VOD" : "Live")
            }}
          </dd>
        </div>
        <div>
          <dt>Encryption</dt>
          <dd>{{ manifestMetadata?.hasEncryption ? "Detected" : "None" }}</dd>
        </div>
      </dl>
      <div class="manifest-raw" v-if="activePlaylistText">
        <div class="manifest-raw__heading">
          <h3>Playlist source</h3>
          <span class="mono small-label"
            >Fetched
            {{ formatRelativeTime(activePlaylistFetchedAt) || "—" }}</span
          >
        </div>
        <pre
          class="manifest-pre manifest-pre--full"
        ><code>{{ activePlaylistText }}</code></pre>
      </div>
      <p class="warning" v-if="manifestMetadata?.hasEncryption">
        ⚠️ Encryption tags detected. Chunk previews may fail unless the keys are
        publicly accessible.
      </p>
    </section>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { nextTick } from "vue";
import Hls from "hls.js";
import {
  fetchManifestText,
  detectPlaylistType,
  parseMasterPlaylist,
  parseMediaPlaylist,
  buildSingleSegmentPlaylist,
  summarizeManifest,
  formatTimestampDisplay,
} from "../services/hlsInspectorService.js";

export default {
  name: "HlsInspector",
  data() {
    return {
      manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      rootManifestText: "",
      rootManifestFetchedAt: null,
      manifestType: "",
      manifestSummary: null,
      variants: [],
      selectedVariantUrl: "",
      activePlaylistText: "",
      manifestMetadata: null,
      activePlaylistFetchedAt: null,
      segments: [],
      segmentFilter: "",
      selectedSegmentIndex: null,
      errorMessage: "",
      isLoadingManifest: false,
      isLoadingSegments: false,
      previewSegment: null,
      previewPlaylistUrl: "",
      previewError: "",
      previewPlayer: null,
      previewRequestToken: 0,
      isPreviewLoading: false,
      liveRefreshTimer: null,
      isAutoRefreshing: false,
      pendingAutoAdvanceIndex: null,
    };
  },
  computed: {
    manifestTypeLabel() {
      if (this.manifestType === "master") return "Master";
      if (this.manifestType === "media") return "Media";
      return "";
    },
    filteredSegments() {
      if (!this.segmentFilter) {
        return this.segments;
      }
      const query = this.segmentFilter.toLowerCase();
      return this.segments.filter((segment) => {
        const uriMatch = segment.uri?.toLowerCase().includes(query);
        const titleMatch = segment.title?.toLowerCase().includes(query);
        return uriMatch || titleMatch;
      });
    },
  },
  watch: {
    async selectedVariantUrl(nextUrl) {
      if (!nextUrl || this.manifestType !== "master") {
        return;
      }
      await this.loadVariantSegments(nextUrl);
    },
    async segments() {
      await nextTick();
      this.scrollChunksToBottom();
    },
  },
  methods: {
    async inspectManifest() {
      if (!this.manifestUrl) {
        this.errorMessage = "Enter a manifest URL";
        return;
      }
      this.errorMessage = "";
      this.isLoadingManifest = true;
      this.resetInspectorState();

      try {
        const { text, sourceUrl } = await fetchManifestText(this.manifestUrl);
        this.rootManifestText = text;
        this.manifestSummary = summarizeManifest(text);
        this.manifestType = detectPlaylistType(text);
        this.rootManifestFetchedAt = new Date();

        if (this.manifestType === "master") {
          this.variants = parseMasterPlaylist(text, sourceUrl);
          if (!this.variants.length) {
            this.errorMessage = "No variant streams found in master manifest.";
            return;
          }
          this.selectedVariantUrl = this.variants[0].url;
        } else {
          await this.loadMediaPlaylist(text, sourceUrl);
        }
      } catch (error) {
        console.error("[HlsInspector] inspectManifest error", error);
        this.errorMessage = error?.message || "Failed to inspect manifest.";
      } finally {
        this.isLoadingManifest = false;
      }
    },

    async loadVariantSegments(variantUrl) {
      this.isLoadingSegments = true;
      this.errorMessage = "";
      try {
        const { text, sourceUrl } = await fetchManifestText(variantUrl);
        await this.loadMediaPlaylist(text, sourceUrl);
      } catch (error) {
        console.error("[HlsInspector] loadVariantSegments error", error);
        this.errorMessage =
          error?.message || "Failed to load variant playlist.";
      } finally {
        this.isLoadingSegments = false;
      }
    },

    async refreshActivePlaylist(options = {}) {
      const { auto = false } = options;
      const targetUrl =
        this.manifestType === "master" && this.selectedVariantUrl
          ? this.selectedVariantUrl
          : this.manifestUrl;
      if (!targetUrl) {
        return;
      }
      if (!auto) {
        this.errorMessage = "";
        this.isLoadingSegments = true;
      }
      try {
        const { text, sourceUrl } = await fetchManifestText(targetUrl);
        if (targetUrl === this.manifestUrl) {
          this.rootManifestText = text;
          this.manifestSummary = summarizeManifest(text);
          this.rootManifestFetchedAt = new Date();
        }
        await this.loadMediaPlaylist(text, sourceUrl);
      } catch (error) {
        console.error("[HlsInspector] refreshActivePlaylist error", error);
        if (!auto) {
          this.errorMessage = error?.message || "Failed to refresh playlist.";
        }
      } finally {
        if (!auto) {
          this.isLoadingSegments = false;
        }
      }
    },

    async loadMediaPlaylist(text, baseUrl) {
      const previousIndex = this.selectedSegmentIndex;
      const hadSegments = this.segments.length > 0;
      const { segments, metadata } = parseMediaPlaylist(text, baseUrl);
      this.activePlaylistText = text;
      this.manifestMetadata = metadata;
      this.segments = segments;
      this.activePlaylistFetchedAt = new Date();
      this.configureLiveRefreshLoop();

      if (!segments.length) {
        this.errorMessage = "Playlist contains no media segments.";
        this.clearPreviewState();
        this.selectedSegmentIndex = null;
      } else if (Number.isFinite(previousIndex)) {
        const matchingSegment = segments.find(
          (item) => item.index === previousIndex,
        );
        if (matchingSegment) {
          this.selectedSegmentIndex = matchingSegment.index;
          this.previewSegment = matchingSegment;
          if (
            Number.isFinite(this.pendingAutoAdvanceIndex) &&
            matchingSegment.index >= this.pendingAutoAdvanceIndex
          ) {
            this.pendingAutoAdvanceIndex = null;
          }
        } else {
          this.selectedSegmentIndex = null;
          const preservePending = Number.isFinite(this.pendingAutoAdvanceIndex);
          this.clearPreviewState({ preservePending });
        }
      } else if (!hadSegments) {
        this.selectedSegmentIndex = null;
        this.clearPreviewState();
      }

      if (Number.isFinite(this.pendingAutoAdvanceIndex)) {
        const pendingSegment = segments.find(
          (item) => item.index === this.pendingAutoAdvanceIndex,
        );
        if (pendingSegment) {
          this.pendingAutoAdvanceIndex = null;
          this.handleSegmentClick(pendingSegment);
        }
      }

      const shouldAutoSelectSegment =
        segments.length > 0 &&
        !Number.isFinite(this.selectedSegmentIndex) &&
        !Number.isFinite(this.pendingAutoAdvanceIndex) &&
        !this.isAutoRefreshing;
      if (shouldAutoSelectSegment) {
        const defaultSegment = this.isLivePlaylist()
          ? segments[segments.length - 1]
          : segments[0];
        this.handleSegmentClick(defaultSegment);
      }

      await nextTick();
      this.scrollChunksToBottom();
    },

    startPreviewPlayback(videoEl) {
      if (!videoEl) return;
      videoEl.currentTime = 0;
      const playPromise = videoEl.play?.();
      if (playPromise?.catch) {
        playPromise.catch((error) => {
          console.warn("[HlsInspector] preview autoplay failed", error);
        });
      }
    },

    handleSegmentClick(segment) {
      if (!segment) {
        return;
      }
      const isSameSelection = this.selectedSegmentIndex === segment.index;
      const alreadyPreviewing =
        this.previewSegment?.index === segment.index &&
        !this.previewError &&
        !this.isPreviewLoading;
      this.selectedSegmentIndex = segment.index;
      if (isSameSelection && alreadyPreviewing) {
        return;
      }
      this.loadSegmentPreview(segment);
    },

    async loadSegmentPreview(segment) {
      if (!segment) {
        return;
      }
      const requestToken = this.previewRequestToken + 1;
      this.previewRequestToken = requestToken;
      this.isPreviewLoading = true;
      this.previewSegment = segment;
      this.selectedSegmentIndex = segment.index;
      this.pendingAutoAdvanceIndex = null;
      this.previewError = "";
      this.destroyPreviewPlayer();
      this.revokePreviewPlaylistUrl();
      const playlistText = buildSingleSegmentPlaylist(segment);
      const blob = new Blob([playlistText], {
        type: "application/vnd.apple.mpegurl",
      });
      const playlistUrl = URL.createObjectURL(blob);
      this.previewPlaylistUrl = playlistUrl;

      try {
        await nextTick();
        if (requestToken !== this.previewRequestToken) {
          URL.revokeObjectURL(playlistUrl);
          if (this.previewPlaylistUrl === playlistUrl) {
            this.previewPlaylistUrl = "";
          }
          return;
        }
        this.initializePreviewPlayback();
      } finally {
        if (requestToken === this.previewRequestToken) {
          this.isPreviewLoading = false;
        }
      }
    },

    initializePreviewPlayback() {
      const videoEl = this.$refs?.previewVideo || null;
      if (!videoEl || !this.previewPlaylistUrl) {
        return;
      }
      this.destroyPreviewPlayer();
      videoEl.muted = true;
      videoEl.playsInline = true;
      this.setupVideoListeners(videoEl);

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, autoStartLoad: false });
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(this.previewPlaylistUrl);
          hls.startLoad(0);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.startPreviewPlayback(videoEl);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal) {
            this.previewError = `Preview error: ${data.type}`;
          }
        });
        this.previewPlayer = { hls, video: videoEl };
        return;
      }

      if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = this.previewPlaylistUrl;
        videoEl.onloadeddata = () => this.startPreviewPlayback(videoEl);
        this.previewPlayer = { video: videoEl };
        return;
      }

      this.previewError = "HLS preview unsupported in this browser";
    },

    destroyPreviewPlayer() {
      const prevPlayer = this.previewPlayer;
      if (prevPlayer?.hls) {
        prevPlayer.hls.destroy();
      }
      const videoEl = prevPlayer?.video || this.$refs?.previewVideo;
      this.teardownVideoListeners(videoEl);
      if (videoEl) {
        videoEl.removeAttribute("src");
        try {
          videoEl.load();
        } catch {
          // ignored
        }
      }
      this.previewPlayer = null;
    },

    setupVideoListeners(videoEl) {
      if (!videoEl) {
        return;
      }
      videoEl.addEventListener("ended", this.handlePreviewEnded);
    },

    teardownVideoListeners(videoEl) {
      if (!videoEl) {
        return;
      }
      videoEl.removeEventListener("ended", this.handlePreviewEnded);
    },

    handlePreviewEnded() {
      if (!Number.isFinite(this.selectedSegmentIndex)) {
        return;
      }
      const currentIndex = this.selectedSegmentIndex;
      const segments = this.segments;
      const currentPosition = segments.findIndex(
        (segment) => segment.index === currentIndex,
      );
      if (currentPosition < 0) {
        return;
      }
      const nextSegment = segments[currentPosition + 1];
      if (nextSegment) {
        this.handleSegmentClick(nextSegment);
        return;
      }
      this.pendingAutoAdvanceIndex = currentIndex + 1;
    },

    revokePreviewPlaylistUrl() {
      if (this.previewPlaylistUrl) {
        URL.revokeObjectURL(this.previewPlaylistUrl);
        this.previewPlaylistUrl = "";
      }
    },

    scrollChunksToBottom() {
      const scroller = this.$refs?.chunkListScroller;
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    },

    clearPreviewState(options = {}) {
      const { preservePending = false } = options;
      this.previewRequestToken += 1;
      this.isPreviewLoading = false;
      this.previewSegment = null;
      this.previewError = "";
      if (!preservePending) {
        this.pendingAutoAdvanceIndex = null;
      }
      this.selectedSegmentIndex = null;
      this.destroyPreviewPlayer();
      this.revokePreviewPlaylistUrl();
    },

    configureLiveRefreshLoop() {
      this.stopLiveRefreshLoop();
      if (!this.isLivePlaylist()) {
        return;
      }
      const intervalMs = this.getLiveRefreshIntervalMs();
      this.liveRefreshTimer = window.setInterval(() => {
        if (!this.isLivePlaylist()) {
          this.stopLiveRefreshLoop();
          return;
        }
        if (typeof document !== "undefined" && document.hidden) {
          return;
        }
        if (this.isLoadingSegments || this.isAutoRefreshing) {
          return;
        }
        this.isAutoRefreshing = true;
        Promise.resolve(this.refreshActivePlaylist({ auto: true }))
          .catch((error) => {
            console.warn("[HlsInspector] auto refresh failed", error);
          })
          .finally(() => {
            this.isAutoRefreshing = false;
          });
      }, intervalMs);
    },

    stopLiveRefreshLoop() {
      if (this.liveRefreshTimer) {
        clearInterval(this.liveRefreshTimer);
        this.liveRefreshTimer = null;
      }
      this.isAutoRefreshing = false;
    },

    isLivePlaylist() {
      const metadata = this.manifestMetadata;
      if (!metadata) {
        return false;
      }
      if (metadata.hasEndList) {
        return false;
      }
      const playlistType = metadata.playlistType?.toUpperCase();
      if (playlistType === "VOD") {
        return false;
      }
      return true;
    },

    getLiveRefreshIntervalMs() {
      const targetDuration = this.manifestMetadata?.targetDuration;
      if (Number.isFinite(targetDuration) && targetDuration > 0) {
        const ms = targetDuration * 750;
        return Math.min(10000, Math.max(1500, Math.round(ms)));
      }
      return 2500;
    },

    formatDuration(seconds) {
      if (!Number.isFinite(seconds)) return "—";
      if (seconds < 1) {
        return `${seconds.toFixed(3)}s`;
      }
      if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
      }
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
    },

    formatStart(seconds) {
      if (!Number.isFinite(seconds)) return "—";
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      return `${mins}:${secs}`;
    },

    displayTimestamp(value) {
      return formatTimestampDisplay(value);
    },

    formatRelativeTime(date) {
      if (!date) return "";
      const diffMs = Date.now() - date.getTime();
      if (diffMs < 1000) return "just now";
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      if (minutes < 1) return `${seconds}s ago`;
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    },

    formatAbsoluteTime(date) {
      if (!date) return "—";
      return date.toLocaleString();
    },

    resetInspectorState() {
      this.stopLiveRefreshLoop();
      this.variants = [];
      this.selectedVariantUrl = "";
      this.activePlaylistText = "";
      this.segments = [];
      this.manifestMetadata = null;
      this.segmentFilter = "";
      this.selectedSegmentIndex = null;
      this.pendingAutoAdvanceIndex = null;
      this.clearPreviewState();
    },
  },
  beforeUnmount() {
    this.clearPreviewState();
    this.stopLiveRefreshLoop();
  },
};
</script>

<style scoped>
.hls-inspector {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-md);
  color: var(--text-primary);
}

.page-header {
  margin-bottom: var(--space-lg);
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 var(--space-xs);
}

.page-header h1 {
  font-size: 2rem;
  letter-spacing: 0.04em;
  margin: 0 0 var(--space-xs);
}

.lede {
  color: var(--text-secondary);
  max-width: 60ch;
}

.panel {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}

.panel-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.panel-heading h2 {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.status-pill {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--bg-surface-active);
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

label {
  display: block;
  text-transform: uppercase;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

input,
select,
textarea {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: inherit;
  font-family: var(--font-family);
}

.manifest-input-row {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.manifest-input-row input {
  flex: 1 1 auto;
  min-width: 240px;
}

.hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.btn {
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--border);
  background: transparent;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-size: 0.75rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-ghost {
  margin-top: var(--space-sm);
  border-style: dashed;
  font-size: 0.75rem;
}

.btn-chip {
  font-size: 0.68rem;
  padding: 0.35rem 0.6rem;
}

.detail-tags {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-sm);
  margin: 0 0 var(--space-sm);
}

dt {
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

dd {
  margin: 0;
  font-size: 0.9rem;
}

.mono {
  font-family: "IBM Plex Mono", monospace;
}

.manifest-pre {
  margin-top: var(--space-sm);
  max-height: 320px;
  overflow: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  padding: var(--space-sm);
  font-size: 0.78rem;
  line-height: 1.4;
}

.manifest-pre--full {
  max-height: 420px;
}

.manifest-raw {
  margin-top: var(--space-md);
}

.manifest-raw__heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.manifest-raw__heading h3 {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
}

.small-label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.variant-list {
  list-style: none;
  margin: var(--space-sm) 0 0;
  padding: 0;
}

.variant-list li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) 0;
  font-size: 0.85rem;
}

.variant-list li.active {
  color: var(--accent);
}

.filter-input {
  min-width: 220px;
}

.chunk-view {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.chunk-list {
  flex: 1 1 52%;
  min-width: 280px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.chunk-list-header {
  display: grid;
  grid-template-columns: 0.4fr 0.7fr 0.8fr 1.3fr 2fr;
  gap: var(--space-xs);
  padding: 0.55rem;
  text-transform: uppercase;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  background: var(--bg-surface-hover);
}

.chunk-list-scroll {
  flex: 1;
  max-height: 460px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.chunk-row {
  display: grid;
  grid-template-columns: 0.4fr 0.7fr 0.8fr 1.3fr 2fr;
  gap: var(--space-xs);
  padding: 0.5rem;
  border-bottom: 1px solid var(--border);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.chunk-row:hover {
  background: var(--bg-surface-hover);
}

.chunk-row.selected {
  background: rgba(255, 153, 0, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 153, 0, 0.55);
}

.chunk-row.selected .chunk-index,
.chunk-row.selected .uri {
  color: var(--accent);
}

.chunk-index {
  font-weight: 600;
}

.chunk-row .uri {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.74rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-preview {
  flex: 1 1 320px;
  min-width: 260px;
  border: 1px solid var(--border);
  padding: var(--space-sm);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.chunk-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
}

.chunk-preview-header h3 {
  margin: 0 0 0.3rem;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
}

.chunk-preview-header a {
  font-size: 0.75rem;
  color: var(--accent);
}

.preview-video video {
  width: 100%;
  border: 1px solid var(--border);
  background: #000;
  min-height: 200px;
}

.chunk-preview-meta p {
  margin: 0;
  font-size: 0.82rem;
}

.chunk-preview-meta strong {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 0.35rem;
  color: var(--text-muted);
}

.warning {
  color: #e5b04b;
  font-size: 0.85rem;
  margin-top: var(--space-sm);
}

.error {
  color: #e5534b;
  font-weight: 600;
  margin-top: var(--space-md);
}

@media (max-width: 768px) {
  .chunk-list-header,
  .chunk-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: auto;
  }

  .chunk-row .uri {
    grid-column: 1 / -1;
  }
}
</style>
