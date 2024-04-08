<template>
  <div>
    <div class="mb-4">ffmpeg demo</div>

    <div class="ma-8">
      <input style="border: 2px solid" type="file" @change="handleFileChange" />
    </div>

    <v-btn
      class="my-4"
      v-if="!showProgress"
      :loading="!loaded"
      :disabled="!loaded || !selectedFile"
      color="primary"
      @click="generateThumbnail"
      >Transcode</v-btn
    >

    <v-btn class="my-4" v-if="showProgress" color="error" @click="terminate"
      >Cancel</v-btn
    >

    <div>
      <v-progress-linear
        class="ma-3"
        color="primary"
        v-if="showProgress"
        height="20"
        rounded
        indeterminate
      >
        <!-- v-model="progress" -->
        <!-- <span>{{ progress }}%</span> -->
      </v-progress-linear>
      <video
        @timeupdate="handleTimeUpdate"
        style="max-width: 600px"
        id="video"
        :src="fileBlobUrl"
        v-if="fileBlobUrl"
        controls
      ></video>

      <div class="ma-4">
        <v-img
          v-if="thumbnailSrc"
          :src="thumbnailSrc"
          :lazy-src="thumbnailSrc"
        ></v-img>

        <v-btn
          color="success"
          v-if="thumbnailSrc"
          class="ma-4"
          @click="downloadThumbnail(thumbnailSrc, 'thumbnail.jpg')"
          >Download</v-btn
        >
      </div>

      <div>
        <!-- <v-btn color="primary" @click="playHls(hlsSample)">play Sample</v-btn> -->
      </div>
    </div>
  </div>
</template>
<script>
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Hls from "hls.js";

export default {
  data() {
    return {
      ffmpeg: null,
      message: "hi",
      loaded: false,
      src: "",
      progress: 0,
      showProgress: false,
      selectedFile: null,
      outputFile: null,
      fileBlobUrl: "",
      thumbnailTime: 0,
      hlsSample:
        "https://live-par-2-cdn-alt.livepush.io/live/bigbuckbunnyclip/index.m3u8",
    };
  },
  methods: {
    async loadFfmpeg() {
      this.showProgress = false;
      this.progress = 0;
      this.loaded = false;

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      const ffmpeg = new FFmpeg();

      ffmpeg.on("log", ({ type, message }) => {
        console.log(`FFmpeg: ${type}: ${message}`);
      });

      ffmpeg.on("progress", ({ progress, time }) => {
        console.log(`progress ${progress}: ${time}`);
        this.progress = Math.ceil(progress * 100);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        // workerURL: await toBlobURL(
        //   `${baseURL}/ffmpeg-core.worker.js`,
        //   "text/javascript"
        // ),
      });

      this.loaded = true;
      console.log(ffmpeg, "ffmpeg after load");

      this.ffmpeg = ffmpeg;
    },
    async transcode() {
      this.src = null;
      this.showProgress = true;
      console.log(this.ffmpeg, "ffmpeg transcode");
      await this.ffmpeg.writeFile(
        "input.mp4",
        await fetchFile(this.selectedFile)
      );

      await this.ffmpeg.exec([
        "-i",
        "input.mp4",
        "-s",

        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-vf",
        "format=gray",
        "-c:a",
        "copy",
        "output.mp4",
      ]);

      const data = await this.ffmpeg.readFile("output.mp4");

      this.outputFile = data;

      this.src = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );

      this.showProgress = false;
    },
    async transcodeToHLS() {
      this.showProgress = true;

      // Write the selected file to FFmpeg's virtual file system.
      await this.ffmpeg.writeFile(
        "input.mp4",
        await fetchFile(this.selectedFile)
      );

      // Execute FFmpeg command to transcode to HLS format.
      await this.ffmpeg.exec([
        "-i",
        "input.mp4",
        "-profile:v",
        "baseline", // For maximum compatibility
        "-level",
        "3.0",
        "-s",
        "640x360", // Example resolution, adjust as needed
        "-start_number",
        "0",
        "-hls_time",
        "10", // Segment length
        "-hls_list_size",
        "0", // Include all segments in playlist
        "-f",
        "hls",
        "output.m3u8",
      ]);

      this.showProgress = false;

      const playlistData = await this.ffmpeg.readFile("output.m3u8");
      const playlistBlob = new Blob([playlistData.buffer], {
        type: "application/vnd.apple.mpegurl",
      });
      const playlistUrl = URL.createObjectURL(playlistBlob);

      this.playHls(playlistUrl);
    },
    formatTimeForFFmpeg(time) {
      // Ensure currentTime is a number and handle fractional seconds by rounding down
      const totalSeconds = Math.floor(Number(time));

      console.log(totalSeconds, "total seconds");

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format the components to "HH:MM:SS" format
      const formattedTime = [hours, minutes, seconds]
        .map((val) => (val < 10 ? `0${val}` : val)) // Pad with leading zeros if necessary
        .join(":");

      return formattedTime;
    },
    async generateThumbnail() {
      this.showProgress = true;
      this.progress = 0;

      const offset = 2;
      const roughTime = this.thumbnailTime - offset;

      try {
        // Write the selected file to FFmpeg's virtual file system.
        await this.ffmpeg.writeFile(
          "input.mp4",
          await fetchFile(this.selectedFile)
        );

        // Execute FFmpeg command to generate a thumbnail.
        // This example takes a frame at the 1-second mark of the video.
        await this.ffmpeg.exec([
          "-ss",
          `${roughTime}`,
          "-i",
          "input.mp4",
          "-ss",
          `${offset}`,
          "-frames:v",
          "1", // Extract 1 video frame.
          "-f",
          "image2", // Output format for images.
          "thumbnail.jpg", // Output file name.
        ]);

        // Read the generated thumbnail file.
        const data = await this.ffmpeg.readFile("thumbnail.jpg");

        // Create a URL for the thumbnail for display or download.
        this.thumbnailSrc = URL.createObjectURL(
          new Blob([data.buffer], { type: "image/jpeg" })
        );
      } catch (error) {
        console.error("Error generating thumbnail:", error);
      } finally {
        // Hide progress indication.
        this.showProgress = false;
        this.progress = 0;
      }
    },
    handleTimeUpdate() {
      var video = document.getElementById("video");

      if (video) {
        this.thumbnailTime = video.currentTime;

        console.log(this.thumbnailTime);
      }
    },
    handleFileChange(event) {
      const files = event.target.files;

      if (files.length > 0) {
        this.selectedFile = files[0];
        this.fileBlobUrl = URL.createObjectURL(files[0]);
      }
    },
    async terminate() {
      if (this.ffmpeg) {
        await this.ffmpeg.terminate();

        await this.loadFfmpeg();
      }
    },
    downloadThumbnail(url, fileName) {
      const element = document.createElement("a");
      element.href = url;
      element.download = fileName;

      element.style.display = "none";

      document.body.appendChild(element);

      element.click();
      document.body.removeChild(element);
    },
    playHls(url) {
      console.log(Hls.isSupported(), "is supported");

      if (Hls.isSupported()) {
        var video = document.getElementById("video");
        var hls = new Hls();

        console.log(video, "video");

        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          video.play();
        });
      }
    },
  },
  mounted() {
    this.loadFfmpeg();
  },
};
</script>
<style lang=""></style>
