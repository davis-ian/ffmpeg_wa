<template>
  <div>
    <div class="ma-8">
      <input
        style="border: 2px solid"
        type="file"
        @change="handleFileChange"
        accept="video/*"
      />
      <canvas ref="outputCanvas"></canvas>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      selectedFile: null,
      fileBlobUrl: null,
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];

      if (!file) {
        this.$toast("No file selected", { type: "error" });
        return;
      }

      const fileBuffer = await file.arrayBuffer();
      const videoDecoder = new VideoDecoder({
        output: this.displayFrame,
        error: (e) => console.log(e),
      });

      videoDecoder.configure({
        codec: "avc1.64001f", //h.264
        description: new Uint8Array(),
        codedWidth: 1280,
        codedHeight: 720,
      });

      videoDecoder.decode(
        new EncodedVideoChunk({
          type: "key",
          timestamp: 0,
          data: new Uint8Array(fileBuffer),
        })
      );
    },
    displayFrame(videoFrame) {
      const canvas = this.$refs.outputCanvas;
      const context = canvas.getContext("2d");

      canvas.width = videoFrame.codecWidth;
      canvas.height = videoFrame.codecHeight;

      context.drawImage(videoFrame, 0, 0);
      videoFrame.close();
    },
  },
};
</script>
<style lang=""></style>
