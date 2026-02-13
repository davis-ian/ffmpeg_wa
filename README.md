# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (previously Volar) and disable Vetur

## Cross-Origin Isolation

- Chrome/Edge/Firefox require `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for the worker-heavy FFmpeg core to use `SharedArrayBuffer`. The dev server and Vite preview already emit those headers (`vite.config.js`), but be sure to configure your production host (Netlify, Vercel, etc.) to send them as well so the multi-threaded runtime runs on Chromium-based browsers.

## Debugging FFmpeg MT Workers

- **Inspect the worker in DevTools**: open `Sources → Workers` and locate `ffmpeg.worker.js`. Pause inside the worker (`debugger` or breakpoints on `onmessage`) while a thumbnail is processing to see whether FFmpeg is stuck on `exec()`, waiting for I/O, or hitting an abort. You can inspect the worker’s `ffmpeg` object, FS state, and current arguments directly from the paused context.
- **Track worker activity via Performance**: start a Performance recording, trigger thumbnail generation, then stop and examine the flame chart. Look for long-running tasks in the worker thread to verify FFmpeg is still making progress even if the UI shows "Processing video…".
- **Monitor log & progress events**: our `ffmpegService` already logs `ffmpeg` stderr entries, progress callbacks, and execution duration. If you need less console noise, temporarily forward `this.progressCallbacks` to the UI or use DevTools to inspect the worker without additional console output.
- **Confirm cross-origin isolation**: Chrome needs COOP/COEP headers for SharedArrayBuffer. Use the Network tab to confirm the HTML response contains `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, and verify `window.crossOriginIsolated === true` in the console before loading FFmpeg.
- **Adjust worker threads manually**: when debugging, call `ffmpegService.setWorkerThreads(2)` (or another positive integer) from the console before running `generateThumbnail()` to force a specific thread count. This helps isolate whether Chrome's behavior improves once the threaded worker count is capped for large files.
