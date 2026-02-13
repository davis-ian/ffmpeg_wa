# FFmpeg Service Architecture

## Overview

The FFmpeg functionality has been centralized into a singleton service pattern for easy reuse across components and future tools.

## Architecture

```
src/
├── services/
│   └── ffmpegService.js    # Centralized FFmpeg service
└── components/
    ├── FfmpegDemo.vue      # Thumbnail tool (uses service)
    └── MetadataViewer.vue  # Metadata tool (uses service)
```

## Using the FFmpeg Service

### Basic Setup

```javascript
import { ffmpegService } from '../services/ffmpegService.js';

export default {
  async mounted() {
    // Initialize FFmpeg (loads WASM once)
    await ffmpegService.load();
  }
}
```

### Extract Metadata

```javascript
// Extract metadata from video file
const metadata = await ffmpegService.extractMetadata(videoFile);

// Returns:
{
  format: {
    filename: "video.mp4",
    size: 1024000,
    duration: 120.5,
    bit_rate: 2400000
  },
  streams: [
    {
      codec_type: "video",
      codec_name: "h264",
      width: 1920,
      height: 1080,
      r_frame_rate: "30",
      pix_fmt: "yuv420p",
      bit_rate: 2200000
    },
    {
      codec_type: "audio",
      codec_name: "aac",
      sample_rate: 48000,
      channels: 2,
      bit_rate: 128000
    }
  ]
}
```

### Generate Thumbnail

```javascript
// Generate thumbnail at specific time
const thumbnailData = await ffmpegService.generateThumbnail(
  videoFile,
  10.5,  // time in seconds
  { 
    offsetSeconds: 2,  // seek offset for accuracy
    quality: 2         // JPEG quality (1-31, lower = better)
  }
);

// Use thumbnail data
const blob = new Blob([thumbnailData.buffer], { type: 'image/jpeg' });
const url = URL.createObjectURL(blob);
```

### Process Video

```javascript
// Process video with custom FFmpeg args
const outputData = await ffmpegService.processVideo(
  inputFile,
  'input.mp4',                          // virtual input name
  ['-i', 'input.mp4', '-c:v', 'libx264', 'output.mp4'],  // FFmpeg args
  'output.mp4'                          // virtual output name
);
```

### Low-Level Operations

```javascript
// Direct file operations
await ffmpegService.writeFile('input.mp4', fileData);
const data = await ffmpegService.readFile('output.mp4');
await ffmpegService.deleteFile('temp.mp4');

// Execute custom command
await ffmpegService.exec(['-i', 'input.mp4', 'output.mp4']);
```

## Event Handling

### Subscribe to Logs

```javascript
const unsubscribe = ffmpegService.onLog(({ type, message }) => {
  console.log(`[${type}] ${message}`);
});

// Later: unsubscribe();
```

### Subscribe to Progress

```javascript
ffmpegService.onProgress(({ progress, time }) => {
  const percent = Math.round(progress * 100);
  console.log(`Progress: ${percent}%`);
});
```

## Utility Functions

```javascript
import { formatUtils } from '../services/ffmpegService.js';

// Format file size
formatUtils.formatFileSize(1024000);     // "1000.00 KB"

// Format duration
formatUtils.formatDuration(125.5);       // "0:02:05"

// Format bitrate
formatUtils.formatBitrate(2400000);      // "2.40 Mbps"

// Evaluate fraction
formatUtils.evalFraction("24000/1001");  // "23.98"
```

## Creating a New Tool

Here's a complete example of creating a new video tool:

```vue
<template>
  <div class="my-tool">
    <h1>Video Converter</h1>
    <input type="file" @change="handleFile" accept="video/*" />
    <button @click="convert" :disabled="!file || isLoading">
      Convert to MP4
    </button>
    <div v-if="isLoading">Converting...</div>
    <a v-if="downloadUrl" :href="downloadUrl" download="converted.mp4">
      Download
    </a>
  </div>
</template>

<script>
import { ffmpegService } from '../services/ffmpegService.js';

export default {
  data() {
    return {
      file: null,
      isLoading: false,
      downloadUrl: null,
    };
  },
  async mounted() {
    await ffmpegService.load();
  },
  methods: {
    handleFile(event) {
      this.file = event.target.files[0];
      this.downloadUrl = null;
    },
    async convert() {
      if (!this.file) return;
      
      this.isLoading = true;
      try {
        const output = await ffmpegService.processVideo(
          this.file,
          'input.avi',
          ['-i', 'input.avi', '-c:v', 'libx264', '-preset', 'fast', 'output.mp4'],
          'output.mp4'
        );
        
        const blob = new Blob([output.buffer], { type: 'video/mp4' });
        this.downloadUrl = URL.createObjectURL(blob);
      } catch (err) {
        alert('Conversion failed: ' + err.message);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
```

## Best Practices

1. **Initialize Once**: Call `ffmpegService.load()` in `mounted()` - it handles singleton pattern automatically

2. **Error Handling**: Always wrap FFmpeg calls in try-catch blocks

3. **Cleanup**: Use `URL.revokeObjectURL()` for created blob URLs

4. **File Naming**: Use unique virtual filenames when processing multiple files concurrently

5. **Progress Tracking**: Subscribe to progress events for long-running operations

6. **Format Detection**: Use `extractMetadata()` to detect input format before processing

## Service API Reference

### Methods

- `load()` - Initialize FFmpeg WASM
- `isReady()` - Check if initialized
- `writeFile(name, data)` - Write to virtual filesystem
- `readFile(name)` - Read from virtual filesystem  
- `deleteFile(name)` - Delete from virtual filesystem
- `exec(args)` - Execute FFmpeg command
- `processVideo(file, inputName, args, outputName)` - High-level processing
- `extractMetadata(file)` - Extract video metadata
- `generateThumbnail(file, time, options)` - Generate thumbnail
- `terminate()` - Shutdown FFmpeg instance
- `getRuntimeStatus()` - Read runtime core/thread/isolation state
- `onRuntimeStatus(callback)` - Subscribe to runtime status updates
- `setLastOperationStrategy(strategy)` - Publish last operation strategy to global status

### Events

- `onLog(callback)` - Subscribe to log output
- `onProgress(callback)` - Subscribe to progress updates

### Utilities

- `formatUtils` - Formatting helpers for display
