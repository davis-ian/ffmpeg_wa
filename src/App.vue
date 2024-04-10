<template>
  <div class="app-container">
    <section class="layout">
      <!-- <div class="sidebar">
        <v-list bg-color="transparent">
          <v-list-item @click="tab1 = 1">Thumbnail Generator</v-list-item>
          <v-list-item @click="tab1 = 2">Command Helper</v-list-item>

        </v-list>
      </div> -->

      <div class="body d-flex flex-grow-1 align-center justify-center">
        <FfmpegDemo
          style="max-width: 800px"
          class="flex-grow-1"
          v-if="tab1 == 1"
        ></FfmpegDemo>

        <CommandGenerator
          style="max-width: 800px"
          class="flex-grow-1"
          v-if="tab1 == 2"
        ></CommandGenerator>

        <!-- <WebcodecDemo
          style="max-width: 800px; border: 2px solid red"
          class="flex-grow-1"
          v-if="tab1 == 3"
        ></WebcodecDemo> -->
      </div>
    </section>
    <!-- <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a> -->
    <!-- Uncomment if you want to use HelloWorld component -->
    <!-- <HelloWorld msg="Vite + Vue" /> -->

    <!-- <div class="d-flex flex-grow-1">
      <v-tabs
        bg-color="black"
        style="height: 100vh"
        v-model="tab1"
        direction="vertical"
      >
        <v-tab :value="1">Thumbnail Generator</v-tab>
        <v-tab :value="2">Command Helper</v-tab>
        <v-tab :value="3">Web Codec Demo</v-tab>
      </v-tabs>

      <div class="d-flex flex-grow-1 align-center justify-center">
        <FfmpegDemo
          style="max-width: 800px"
          class="flex-grow-1"
          v-if="tab1 == 1"
        ></FfmpegDemo>

        <CommandGenerator
          style="max-width: 800px"
          class="flex-grow-1"
          v-if="tab1 == 2"
        ></CommandGenerator>

        <WebcodecDemo
          style="max-width: 800px"
          class="flex-grow-1"
          v-if="tab1 == 3"
        ></WebcodecDemo>
      </div>
    </div> -->
  </div>
</template>

<script>
// Import necessary components
import HelloWorld from "./components/HelloWorld.vue";
import FfmpegDemo from "./components/FfmpegDemo.vue";
import CommandGenerator from "./components/CommandGenerator.vue";
import WebcodecDemo from "./components/WebcodecDemo.vue";

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
  padding: 0;
  margin: 0;
}

.layout {
  display: grid;
  /* grid-template-columns: 300px 1fr; */
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  justify-items: stretch;
  align-items: stretch;
  min-height: 100vh;
  width: 100vw;
  background-color: #091a28;
}

.sidebar {
  border-right: 1px solid #0f293e;
  background-color: #091a28;
}

.body {
}
</style>
