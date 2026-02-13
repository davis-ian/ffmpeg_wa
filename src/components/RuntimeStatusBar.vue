<template>
  <div class="runtime-status" :class="{ loaded: status.isLoaded }">
    <div class="runtime-pill">
      <span class="label">Core</span>
      <span class="value">{{ coreLabel }}</span>
    </div>
    <div class="runtime-pill">
      <span class="label">Threads</span>
      <span class="value">{{ status.activeThreads }}</span>
    </div>
    <div class="runtime-pill">
      <span class="label">Isolation</span>
      <span class="value">{{ status.crossOriginIsolated ? 'On' : 'Off' }}</span>
    </div>
    <div class="runtime-pill" v-if="status.lastOperationStrategy">
      <span class="label">Last Strategy</span>
      <span class="value">{{ status.lastOperationStrategy }}</span>
    </div>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';

export default {
  name: 'RuntimeStatusBar',
  data() {
    return {
      status: ffmpegService.getRuntimeStatus(),
      unsubscribe: null,
    };
  },
  computed: {
    coreLabel() {
      if (!this.status.isLoaded) return 'Not loaded';
      return this.status.coreVariant === 'mt' ? 'MT' : 'ST';
    },
  },
  mounted() {
    this.unsubscribe = ffmpegService.onRuntimeStatus((nextStatus) => {
      this.status = nextStatus;
    });
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },
};
</script>

<style scoped>
.runtime-status {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  align-items: center;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) var(--space-md);
}

.runtime-pill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  padding: 4px 8px;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.runtime-pill .label {
  color: var(--text-muted);
}

.runtime-pill .value {
  color: var(--text-pop);
  font-weight: 700;
}

.runtime-status.loaded .runtime-pill .value {
  color: var(--accent);
}
</style>
