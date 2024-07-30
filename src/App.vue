<script setup>
import HelloWorld from './components/HelloWorld.vue';
import FfmpegDemo from './components/FfmpegDemo.vue';
import CommandGenerator from './components/CommandGenerator.vue';
</script>

<template>
  <div>
    <!-- <HelloWorld msg="Vite + Vue" /> -->

    <FfmpegDemo class="text-center pa-8"></FfmpegDemo>
    <!-- <CommandGenerator></CommandGenerator> -->
  </div>
</template>

<script>
// Import necessary components
import HelloWorld from './components/HelloWorld.vue';
import FfmpegDemo from './components/FfmpegDemo.vue';
import CommandGenerator from './components/CommandGenerator.vue';
import WebcodecDemo from './components/WebcodecDemo.vue';

export default {
  // Register components for use in this template
  components: {
    HelloWorld,
    FfmpegDemo,
    CommandGenerator,
    WebcodecDemo,
  },
  data() {
    return {
      // Define your component data here
      tab1: 1, // Example if you need to keep track of tabs
    };
  },
  // Include methods, computed properties, and watchers here
  methods: {},
  computed: {},
  watch: {},
};
</script>

<style>
#app {
  background-color: #091a28;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  width: 100%;
}

.layout {
  display: grid;
  /* grid-template-columns: 300px 1fr; */
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  justify-items: stretch;
  align-items: stretch;
}

.sidebar {
  border-right: 1px solid #0f293e;
  background-color: #091a28;
}

.body {
}
</style>
