<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="app-title">VideoTools</h2>
    </div>
    
    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: currentTool === item.id }"
        @click="$emit('change-tool', item.id)"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="item.id === 'thumbnail'" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle v-if="item.id === 'thumbnail'" cx="12" cy="13" r="4"/>
          <path v-if="item.id === 'metadata'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline v-if="item.id === 'metadata'" points="14 2 14 8 20 8"/>
          <line v-if="item.id === 'metadata'" x1="16" y1="13" x2="8" y2="13"/>
          <line v-if="item.id === 'metadata'" x1="16" y1="17" x2="8" y2="17"/>
          <polyline v-if="item.id === 'metadata'" points="10 9 9 9 8 9"/>
          <rect v-if="item.id === 'hls-download'" x="3" y="4" width="18" height="16" rx="2"/>
          <polyline v-if="item.id === 'hls-download'" points="8 11 12 15 16 11"/>
          <line v-if="item.id === 'hls-download'" x1="12" y1="8" x2="12" y2="15"/>
        </svg>
        <span class="nav-label">{{ item.name }}</span>
      </button>
    </nav>
    
    <div class="sidebar-footer">
      <p class="version">v1.0</p>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    currentTool: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      navItems: [
        { id: 'thumbnail', name: 'Thumbnail Clipper' },
        { id: 'metadata', name: 'Video Metadata' },
        { id: 'hls-download', name: 'HLS Download' },
      ],
    };
  },
};
</script>

<style scoped>
.sidebar {
  width: 180px;
  height: 100vh;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.sidebar-header {
  padding: var(--space-md);
  border-bottom: 1px solid var(--border);
}

.app-title {
  font-family: var(--font-family);
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent);
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-sm) 0;
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-bottom: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-family);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 0;
}

.nav-item:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-pop);
}

.nav-item.active {
  background-color: var(--bg-surface-active);
  color: var(--text-pop);
  border-bottom: 1px solid var(--accent);
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.nav-label {
  font-weight: 500;
}

.sidebar-footer {
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--border);
}

.version {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin: 0;
  text-align: center;
  font-family: monospace;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  
  .sidebar-nav {
    flex-direction: row;
    padding: var(--space-xs);
    gap: var(--space-xs);
  }
  
  .nav-item {
    white-space: nowrap;
    padding: var(--space-sm);
    border-bottom: none;
    border-right: 1px solid transparent;
  }
  
  .nav-item.active {
    border-bottom: none;
    border-right: 2px solid var(--accent);
  }
}
</style>
