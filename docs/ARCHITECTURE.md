# ClipForge Architecture

## System Overview
ClipForge is a client-side media toolbox built with Vue + Vite. It combines browser-native processing for lightweight image workflows and ffmpeg.wasm for audio/video operations.

## Core Building Blocks
- `src/App.vue`
: app shell and dynamic tool renderer.
- `src/tools/toolRegistry.js`
: single source of truth for tool metadata and categories.
- `src/components/Sidebar.vue`
: grouped category navigation derived from registry.
- `src/components/RuntimeStatusBar.vue`
: global FFmpeg runtime status (core mode, thread count, isolation, last strategy).
- `src/services/ffmpegService.js`
: singleton FFmpeg runtime manager, core fallback logic, FS helpers.

## Data Flow
1. User selects a tool from registry-driven sidebar.
2. Tool component invokes either:
- browser-native service (example: `imageService`), or
- ffmpeg-backed service (`audioService`, `mediaJoinService`, etc.).
3. ffmpeg-backed services call `ffmpegService` APIs.
4. Runtime status events are emitted globally and shown in `RuntimeStatusBar`.
5. Tool returns downloadable blob/object URL.

## Runtime Modes
- MT preferred when `crossOriginIsolated` and threads > 1.
- ST fallback when MT load fails or isolation unavailable.
- Runtime status is app-wide and always visible.

## Error Taxonomy
`src/services/mediaErrors.js` classifies failures:
- `runtime`
- `unsupported`
- `heavy-op`
- `io`

Tools should map thrown errors through `formatMediaError()` before displaying to users.

## Safe-First Strategy
Default behavior prefers:
- copy/remux/extract operations,
- explicit fallback when copy fails,
- clear warnings before heavy transcode paths.
