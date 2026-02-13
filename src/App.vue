<template>
  <div class="app-layout">
    <Sidebar
      :current-tool="currentTool"
      :tools="toolDefinitions"
      @change-tool="currentTool = $event"
    />
    <main class="main-content">
      <RuntimeStatusBar />
      <component :is="activeToolComponent" v-if="activeToolComponent" />
    </main>
  </div>
</template>

<script>
import Sidebar from "./components/Sidebar.vue";
import RuntimeStatusBar from "./components/RuntimeStatusBar.vue";
import FfmpegDemo from "./components/FfmpegDemo.vue";
import MetadataViewer from "./components/MetadataViewer.vue";
import HlsDownloader from "./components/HlsDownloader.vue";
import VideoConverter from "./components/VideoConverter.vue";
import ImageConverter from "./components/ImageConverter.vue";
import AudioTrimmer from "./components/AudioTrimmer.vue";
import AudioExtractor from "./components/AudioExtractor.vue";
import FrameSequenceExport from "./components/FrameSequenceExport.vue";
import MediaJoin from "./components/MediaJoin.vue";
import VideoTrimmer from "./components/VideoTrimmer.vue";
// import SilenceCutter from './components/SilenceCutter.vue';
import ContactSheetGenerator from "./components/ContactSheetGenerator.vue";
import ContainerRewrap from "./components/ContainerRewrap.vue";
import { TOOL_DEFINITIONS } from "./tools/toolRegistry.js";

const COMPONENT_MAP = {
  FfmpegDemo,
  MetadataViewer,
  HlsDownloader,
  VideoConverter,
  ImageConverter,
  AudioTrimmer,
  AudioExtractor,
  FrameSequenceExport,
  MediaJoin,
  VideoTrimmer,
  // SilenceCutter,
  ContactSheetGenerator,
  ContainerRewrap,
};

export default {
  name: "App",
  components: {
    Sidebar,
    RuntimeStatusBar,
  },
  data() {
    return {
      toolDefinitions: TOOL_DEFINITIONS,
      currentTool: "hls-download",
    };
  },
  computed: {
    activeToolComponent() {
      const tool = this.toolDefinitions.find(
        (entry) => entry.id === this.currentTool,
      );
      if (!tool) return null;
      return COMPONENT_MAP[tool.component] || null;
    },
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
  margin-left: 200px;
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
