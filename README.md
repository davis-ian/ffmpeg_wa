# ClipForge

ClipForge is a browser-first media toolkit for video, audio, and image workflows powered by Vue + FFmpeg.wasm.

## Tool Catalog

### Video
- Thumbnail Clipper
- Video Metadata
- HLS Download
- Convert Video
- Frame Sequence
- Media Join
- Contact Sheet (Beta)
- Container Rewrap (Beta)

### Audio
- Audio Trimmer
- Audio Extractor
- Silence Cutter (Beta)

### Image
- Image Converter

## Runtime Status Bar
A global status strip shows:
- `Core`: MT / ST / Not loaded
- `Threads`: active runtime threads
- `Isolation`: `crossOriginIsolated` state
- `Last Strategy`: copy/remux/transcode fallback status

## Cross-Origin Isolation
For multithreaded FFmpeg behavior in Chromium browsers, send:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These headers are already configured in dev/preview via `vite.config.js`.

## Development
```bash
npm install
npm run dev
npm run build
```

## Architecture Docs
- [Architecture](docs/ARCHITECTURE.md)
- [Tool Registry Guide](docs/TOOL_REGISTRY.md)
- [FFmpeg Runtime Status](docs/FFMPEG_RUNTIME_STATUS.md)
- [Contributing Media Tools](docs/CONTRIBUTING_MEDIA_TOOLS.md)
- [FFmpeg Service Architecture](docs/FFMPEG_SERVICE.md)

## Notes
ClipForge uses a safe-first strategy: lightweight copy/remux/extract operations are preferred by default, with transcode fallback when required.
