<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="app-title">ClipForge</h2>
      <button
        class="mobile-menu-toggle"
        type="button"
        :aria-expanded="String(isMobileOpen)"
        aria-controls="sidebarNav"
        @click="toggleMobileMenu"
      >
        {{ isMobileOpen ? "Close" : "Menu" }}
      </button>
    </div>

    <div class="mobile-current-tool">
      <span class="mobile-current-label">Tool</span>
      <span class="mobile-current-name">{{ currentToolLabel }}</span>
    </div>

    <nav id="sidebarNav" class="sidebar-nav" :class="{ 'is-mobile-open': isMobileOpen }">
      <section v-for="group in groupedTools" :key="group.key" class="nav-group">
        <h3 class="group-title">{{ group.label }}</h3>

        <button
          v-for="item in group.items"
          :key="item.id"
          class="nav-item"
          :class="{ active: currentTool === item.id }"
          @click="selectTool(item.id)"
        >
          <svg
            class="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              v-if="item.id === 'thumbnail'"
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            />
            <circle v-if="item.id === 'thumbnail'" cx="12" cy="13" r="4" />

            <path
              v-if="item.id === 'metadata'"
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline v-if="item.id === 'metadata'" points="14 2 14 8 20 8" />
            <line
              v-if="item.id === 'metadata'"
              x1="16"
              y1="13"
              x2="8"
              y2="13"
            />
            <line
              v-if="item.id === 'metadata'"
              x1="16"
              y1="17"
              x2="8"
              y2="17"
            />

            <rect
              v-if="item.id === 'hls-download'"
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
            />
            <polyline
              v-if="item.id === 'hls-download'"
              points="8 11 12 15 16 11"
            />
            <line
              v-if="item.id === 'hls-download'"
              x1="12"
              y1="8"
              x2="12"
              y2="15"
            />

            <rect
              v-if="item.id === 'converter'"
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path v-if="item.id === 'converter'" d="M10 9l-3 3 3 3" />
            <path v-if="item.id === 'converter'" d="M14 9l3 3-3 3" />

            <rect
              v-if="item.id === 'video-trimmer'"
              x="3"
              y="4"
              width="18"
              height="14"
              rx="2"
            />
            <line
              v-if="item.id === 'video-trimmer'"
              x1="8"
              y1="8"
              x2="16"
              y2="16"
            />
            <line
              v-if="item.id === 'video-trimmer'"
              x1="16"
              y1="8"
              x2="8"
              y2="16"
            />
            <circle v-if="item.id === 'video-trimmer'" cx="8" cy="8" r="1.5" />
            <circle v-if="item.id === 'video-trimmer'" cx="16" cy="8" r="1.5" />

            <path v-if="item.id === 'audio-trimmer'" d="M9 18V5l12-2v13" />
            <circle v-if="item.id === 'audio-trimmer'" cx="6" cy="18" r="3" />
            <circle v-if="item.id === 'audio-trimmer'" cx="18" cy="16" r="3" />

            <rect
              v-if="item.id === 'image-converter'"
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <circle v-if="item.id === 'image-converter'" cx="9" cy="10" r="2" />
            <path v-if="item.id === 'image-converter'" d="M21 16l-5-5L5 22" />

            <path v-if="item.id === 'audio-extractor'" d="M12 3v12" />
            <polyline
              v-if="item.id === 'audio-extractor'"
              points="8 11 12 15 16 11"
            />
            <line
              v-if="item.id === 'audio-extractor'"
              x1="6"
              y1="20"
              x2="18"
              y2="20"
            />

            <rect
              v-if="item.id === 'frame-sequence-export'"
              x="3"
              y="3"
              width="7"
              height="7"
            />
            <rect
              v-if="item.id === 'frame-sequence-export'"
              x="14"
              y="3"
              width="7"
              height="7"
            />
            <rect
              v-if="item.id === 'frame-sequence-export'"
              x="3"
              y="14"
              width="7"
              height="7"
            />
            <rect
              v-if="item.id === 'frame-sequence-export'"
              x="14"
              y="14"
              width="7"
              height="7"
            />

            <polyline v-if="item.id === 'media-join'" points="7 7 3 7 3 3" />
            <polyline
              v-if="item.id === 'media-join'"
              points="17 17 21 17 21 21"
            />
            <line
              v-if="item.id === 'media-join'"
              x1="3"
              y1="7"
              x2="10"
              y2="14"
            />
            <line
              v-if="item.id === 'media-join'"
              x1="14"
              y1="10"
              x2="21"
              y2="17"
            />

            <path
              v-if="item.id === 'silence-cutter'"
              d="M3 12h4l2-3 4 6 2-3h6"
            />
            <line
              v-if="item.id === 'silence-cutter'"
              x1="3"
              y1="4"
              x2="3"
              y2="20"
            />

            <rect
              v-if="item.id === 'contact-sheet'"
              x="3"
              y="3"
              width="18"
              height="18"
              rx="1"
            />
            <line
              v-if="item.id === 'contact-sheet'"
              x1="9"
              y1="3"
              x2="9"
              y2="21"
            />
            <line
              v-if="item.id === 'contact-sheet'"
              x1="15"
              y1="3"
              x2="15"
              y2="21"
            />
            <line
              v-if="item.id === 'contact-sheet'"
              x1="3"
              y1="9"
              x2="21"
              y2="9"
            />
            <line
              v-if="item.id === 'contact-sheet'"
              x1="3"
              y1="15"
              x2="21"
              y2="15"
            />

            <rect
              v-if="item.id === 'container-rewrap'"
              x="4"
              y="5"
              width="16"
              height="14"
              rx="2"
            />
            <path v-if="item.id === 'container-rewrap'" d="M8 9h8M8 13h5" />
          </svg>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </section>
    </nav>

    <div class="sidebar-footer">
      <p class="version">v1.0</p>
    </div>
  </aside>
  <div
    v-if="isMobileOpen"
    class="mobile-backdrop"
    @click="closeMobileMenu"
  ></div>
</template>

<script>
import {
  TOOL_CATEGORY_LABELS,
  TOOL_CATEGORY_ORDER,
} from "../tools/toolRegistry.js";

export default {
  name: "Sidebar",
  props: {
    currentTool: {
      type: String,
      required: true,
    },
    tools: {
      type: Array,
      required: true,
    },
  },
  computed: {
    groupedTools() {
      return TOOL_CATEGORY_ORDER.map((categoryKey) => {
        const items = this.tools.filter(
          (item) => item.category === categoryKey,
        );
        return {
          key: categoryKey,
          label: TOOL_CATEGORY_LABELS[categoryKey] || categoryKey,
          items,
        };
      }).filter((group) => group.items.length > 0);
    },
    currentToolLabel() {
      const activeTool = this.tools.find((item) => item.id === this.currentTool);
      return activeTool ? activeTool.label : "Select Tool";
    },
  },
  data() {
    return {
      isMobileOpen: false,
    };
  },
  methods: {
    selectTool(toolId) {
      this.$emit("change-tool", toolId);
      this.closeMobileMenu();
    },
    toggleMobileMenu() {
      this.isMobileOpen = !this.isMobileOpen;
    },
    closeMobileMenu() {
      this.isMobileOpen = false;
    },
  },
};
</script>

<style scoped>
.sidebar {
  width: 200px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.mobile-menu-toggle {
  display: none;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 6px 10px;
  font-size: 0.72rem;
}

.mobile-current-tool {
  display: none;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-xs) 0 var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  overflow-y: auto;
}

.nav-group {
  border-top: 1px solid var(--border);
  padding-top: var(--space-xs);
}

.group-title {
  margin: 0;
  padding: 0 var(--space-md) var(--space-xs);
  color: var(--text-muted);
  font-size: 0.65rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.nav-item {
  width: 100%;
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
  font-size: 0.82rem;
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

.mobile-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    border-right: none;
    border-bottom: 1px solid var(--border);
    z-index: 120;
  }

  .sidebar-nav {
    display: none;
    overflow-y: auto;
    max-height: 68vh;
    padding: var(--space-xs) 0 var(--space-sm);
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .sidebar-nav.is-mobile-open {
    display: flex;
  }

  .mobile-menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-current-tool {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    padding: 0 var(--space-md) var(--space-sm);
    border-bottom: 1px solid var(--border);
  }

  .mobile-current-label {
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    font-size: 0.62rem;
  }

  .mobile-current-name {
    color: var(--text-pop);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.76rem;
  }

  .nav-group {
    min-width: 100%;
    border-top: 1px solid var(--border);
    border-left: none;
    padding-left: 0;
  }

  .group-title {
    padding-left: var(--space-md);
  }

  .nav-item {
    white-space: normal;
    border-bottom: 1px solid transparent;
    border-right: none;
    padding: var(--space-sm) var(--space-md);
  }

  .nav-item.active {
    border-bottom: 1px solid var(--accent);
  }

  .sidebar-footer {
    display: none;
  }

  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 110;
    background: rgba(0, 0, 0, 0.45);
  }
}
</style>
