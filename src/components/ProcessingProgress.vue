<template>
  <div class="progress-wrap" v-if="show">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${value}%` }"></div>
    </div>
    <span class="progress-text">{{ value }}%</span>
  </div>
</template>

<script>
export default {
  name: 'ProcessingProgress',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
};
</script>

<style scoped>
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
</style>
