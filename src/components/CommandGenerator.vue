<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-text-field v-model="inputPath" label="Input Path"></v-text-field>
      </v-col>
      <!-- <v-col>
        <v-switch
          color="primary"
          label="Output Same Folder"
          v-model="outputSameDirectory"
        ></v-switch>
      </v-col> -->
      <v-col>
        <v-select
          v-model="selectedEncoder"
          :items="encoders"
          item-title="title"
          label="Encoder"
          persistent-hint
          return-object
          single-line
        ></v-select>
      </v-col>
      <v-col cols="12">
        <v-row>
          <v-col>
            <v-text-field
              :disabled="outputSameDirectory"
              v-model="outputDir"
              label="Output Folder"
            ></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              v-model="outputFileName"
              label="Output File Name"
            ></v-text-field>
          </v-col>

          <v-col>
            <v-select
              v-model="selectedOutputType"
              :items="outputTypes"
              item-title="title"
              label="Encoder"
              persistent-hint
              return-object
              single-line
            ></v-select>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-btn @click="generateCommand" color="primary">Generate Command</v-btn>
    <div class="ma-8" style="border: 2px solid red">
      {{ command }}
    </div>

    <v-btn v-if="command" @click="copyToClipboard(command)" color="success"
      >Copy</v-btn
    >
    <v-btn @click="test"> test </v-btn>

    <!-- <div class="ma-8" style="border: 2px solid blue">
      <v-textarea label="Command Editor"></v-textarea>
    </div> -->
  </div>
</template>
<script>
import fcommand from "../utils/fcommand.js";

export default {
  data() {
    return {
      command: null,
      inputPath: "",
      outputDir: "",
      outputFileName: "",
      filters: [{ title: "scale", value: "" }],
      selectedFilters: [],
      selectedEncoder: { title: "libx264" },
      selectedOutputType: { title: "HLS" },
      outputSameDirectory: false,
      outputTypes: [
        { title: "HLS", value: 0 },
        { title: "MP4", value: 1 },
      ],
      encoders: [
        { title: "libx264", value: 0 },
        { title: "h264_amf", value: 1 },
        { title: "libx265", value: 2 },
      ],
    };
  },
  watch: {
    outputSameDirectory() {
      this.generateOutputDir();
    },
    inputPath(newVal) {
      var valid = this.hasValidFileExtension(newVal);

      console.log(valid, "is valid");
      if (valid) {
        this.outputDir = "test";
      }
    },
  },
  methods: {
    hasValidFileExtension(path) {
      // Define a list of valid file extensions
      const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".mp4"];

      // Extract the file extension from the fileName, ensuring to trim any whitespace or quotes
      const fileExtension = path
        .slice(((path.lastIndexOf(".") - 1) >>> 0) + 2)
        .trim()
        .replace(/^"|"$/g, "");

      console.log(fileExtension, "ext");

      // Check if the file extension is in the list of valid extensions
      return validExtensions.includes("." + fileExtension.toLowerCase());
    },
    test() {
      //   var command = fcommand.generateTrimCommand("input2.mp4", 5, "output.mp4");
      var command = fcommand.generateHlsConvertCommand(
        "input.mp4",
        "libx264",
        "output.mp4"
      );

      console.log(command, "command");

      this.command = command;
    },
    generateOutputDir() {
      if (this.inputPath) {
        this.outputDir = this.inputPath.substring(
          0,
          this.inputPath.lastIndexOf("\\") + 1
        );

        this.outputPath = this.outputDir + this.outputFileName;
      }
    },
    generateCommand() {
      if (!this.inputPath) {
        this.$toast("Input path required", { type: "error" });
        return;
      }

      const encoder = this.selectedEncoder.title ?? "libx264";

      const outputType = this.selectedOutputType.title;

      if (outputType == "HLS") {
        const output = fcommand.convertToHlsPath(this.inputPath);
        console.log(output, "output");
        this.outputPath = output.path;

        this.command = fcommand.generateHlsConvertCommand(
          this.inputPath,
          encoder,
          output
        );
      }
    },
    copyToClipboard(val) {
      navigator.clipboard.writeText(val);

      this.$toast("Copied to clipboard", { type: "success" });
    },
  },
};
</script>
<style lang=""></style>
