<template>
  <div class="app-layout">
    <Sidebar :current-tool="currentTool" @change-tool="currentTool = $event" />
    <main class="main-content">
      <FfmpegDemo v-if="currentTool === 'thumbnail'" />
      <MetadataViewer v-else-if="currentTool === 'metadata'" />
      <HlsDownloader v-else-if="currentTool === 'hls-download'" />
    </main>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import FfmpegDemo from './components/FfmpegDemo.vue';
import MetadataViewer from './components/MetadataViewer.vue';
import HlsDownloader from './components/HlsDownloader.vue';

export default {
  name: 'App',
  components: {
    Sidebar,
    FfmpegDemo,
    MetadataViewer,
    HlsDownloader,
  },
  data() {
    return {
      currentTool: 'thumbnail',
    };
  },
};
</script>

<style>
#app {
  background-color: var(--bg-primary);
  margin: 0;
  padding: 0;
  min-width: 320px;
  min-height: 100vh;
  width: 100%;
  font-family: var(--font-family);
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 180px;
  background-color: var(--bg-primary);
  min-height: 100vh;
}

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  
  .main-content {
    margin-left: 0;
  }
}
</style>
