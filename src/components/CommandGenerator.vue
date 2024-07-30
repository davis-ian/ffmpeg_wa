<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-textarea
          variant="outlined"
          v-model="command"
          label="Command Editor"
        ></v-textarea>
      </v-col>
      <!-- <v-col>
        <v-switch
          color="primary"
          label="Output Same Folder"
          v-model="outputSameDirectory"
        ></v-switch>
      </v-col> -->
      <v-col>
        <div class="my-8">
          <v-textarea v-model="command" label="Command Editor"></v-textarea>
        </div>
      </v-col>
      <v-col cols="12">
        <v-textarea
          variant="outlined"
          v-model="command"
          label="Command Editor"
        ></v-textarea>
      </v-col>
      <v-col>
        <v-row>
          <v-col>
            <v-text-field v-model="inputPath" label="Input Path"></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              v-model="outputPath"
              label="Output Path"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-col>

      <!-- <v-col>
        <v-btn color="primary" @click="addArg">Add Argument</v-btn>
      </v-col> -->
    </v-row>

    <div class="d-flex justify-center" style="gap: 12px">
      <v-btn color="black" @click="addFilter">Add filter</v-btn>
      <v-btn @click="generateCommand" color="primary">Generate Command</v-btn>

      <v-btn v-if="command" @click="copyToClipboard(command)" color="success"
        >Copy</v-btn
      >
    </div>
    <!-- <v-btn @click="test" color="primary"> test </v-btn> -->

    <div class="my-8">
      <!-- <v-textarea label="Command Editor"></v-textarea> -->

      <div v-for="filter in filters">
        <v-row>
          <v-col>
            <v-text-field v-model="filter.label"></v-text-field>
          </v-col>
          <v-col>
            <v-text-field v-model="filter.argument"></v-text-field>
          </v-col>
        </v-row>
      </div>
    </div>
  </div>
</template>
<script>
import fcommand from '../utils/fcommand.js';

export default {
  data() {
    return {
      command: null,
      inputPath: 'input.mp4',
      outputPath: 'output.mp4',
      filters: [{ title: 'scale', value: '' }],
      selectedFilters: [],
      selectedEncoder: { title: 'libx264' },
      selectedOutputType: { title: 'HLS' },
      outputSameDirectory: false,
      filters: [],
      outputTypes: [
        { title: 'HLS', value: 0 },
        { title: 'MP4', value: 1 },
      ],
      encoders: [
        { title: 'libx264', value: 0 },
        { title: 'h264_amf', value: 1 },
        { title: 'libx265', value: 2 },
      ],
      commandArgs: [],
      quickCommands: [
        { label: 'Hls Convert', callback: this.hlsQuickCommand },
        { label: 'Trim', callback: this.hlsQuickCommand },
        { label: 'Compress', callback: this.hlsQuickCommand },
        { label: 'Grayscale', callback: this.hlsQuickCommand },
      ],
    };
  },
  watch: {
    // commandArgs: {
    //   handler(newVal) {
    //     this.updateCommand();
    //   },
    //   deep: true,
    // },
  },

  methods: {
    updateCommand() {
      const argString = this.commandArgs
        .map((arg) => `${arg.key} ${arg.value}`)
        .join(' ');
      console.log(argString, 'argstring');

      this.command = `ffmpeg  ${argString}`;
    },
    addArg() {
      this.commandArgs.push({ key: '', value: '' });
    },
    hlsQuickCommand() {
      const input = this.inputPath ?? 'input.mp4';
      const output = this.outputPath ?? 'output.mp4';

      this.commandArgs = [
        { key: '-i', value: input, type: 'input' },
        { key: '-c:v', value: 'libx264', type: 'arg' },
        { key: '-start_number', value: 0, type: 'arg' },
        { key: '-hls_time', value: 10, type: 'arg' },
        { key: '-hls_list_size', value: 0, type: 'arg' },
        { key: '-f', value: 'hls', type: 'arg' },
        { key: '', value: output, type: 'output' },
      ];

      this.updateCommand();
    },
    grayscaleQuickCommand() {
      this.commandArgs = [
        { key: '-i', value: input, type: 'input' },
        { key: '-c:v', value: 'libx264', type: 'arg' },
        { key: '-f', value: 'hls', type: 'arg' },
        { key: '', value: output, type: 'output' },
      ];
    },
    addFilter() {
      this.filters.push({ label: '', argument: '' });
    },
    hasValidFileExtension(path) {
      // Define a list of valid file extensions
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4'];

      // Extract the file extension from the fileName, ensuring to trim any whitespace or quotes
      const fileExtension = path
        .slice(((path.lastIndexOf('.') - 1) >>> 0) + 2)
        .trim()
        .replace(/^"|"$/g, '');

      console.log(fileExtension, 'ext');

      // Check if the file extension is in the list of valid extensions
      return validExtensions.includes('.' + fileExtension.toLowerCase());
    },
    test() {
      //   var command = fcommand.generateTrimCommand("input2.mp4", 5, "output.mp4");
      var command = fcommand.generateHlsConvertCommand(
        'input.mp4',
        'libx264',
        'output.mp4'
      );

      console.log(command, 'command');

      this.command = command;
    },
    generateCommand() {
      if (!this.inputPath) {
        this.$toast('Input path required', { type: 'error' });
        return;
      }

      // const encoder = this.selectedEncoder.title ?? "libx264";

      // const outputType = this.selectedOutputType.title;

      // if (outputType == "HLS") {
      //   const output = fcommand.convertToHlsPath(this.inputPath);
      //   console.log(output, "output");
      //   this.outputPath = output.path;

      //   this.command = fcommand.generateHlsConvertCommand(
      //     this.inputPath,
      //     encoder,
      //     output
      //   );
      // }

      this.hlsQuickCOmmand();
    },
    copyToClipboard(val) {
      navigator.clipboard.writeText(val);

      this.$toast('Copied to clipboard', { type: 'success' });
    },
  },
};
</script>
<style lang=""></style>
