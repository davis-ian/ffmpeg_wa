# FFmpeg Runtime Status

## Purpose
ClipForge exposes FFmpeg runtime mode globally so users and maintainers can understand execution context quickly.

## UI Location
`src/components/RuntimeStatusBar.vue`

## Status Fields
- `Core`
: `MT` or `ST` (or `Not loaded`)
- `Threads`
: active thread count currently used
- `Isolation`
: `crossOriginIsolated` status
- `Last Strategy`
: last operation strategy (`copy`, `remux`, `transcode fallback`, etc.)

## Service API
`src/services/ffmpegService.js`
- `getRuntimeStatus()`
- `onRuntimeStatus(callback)`
- `setLastOperationStrategy(strategy)`

## ST/MT Behavior
- Preferred mode is MT when browser isolation + worker support are available.
- If MT core load fails, runtime retries with ST core.
- Status updates are emitted on `load`, fallback events, thread override, and `terminate`.

## Troubleshooting Matrix
- `Core: Not loaded`
: No FFmpeg-backed operation has run yet.
- `Core: ST` + `Isolation: Off`
: expected fallback; check COOP/COEP headers.
- `Core: ST` + `Isolation: On`
: MT likely failed and fallback was triggered.
- Frequent `transcode fallback`
: input formats/codecs may not support copy path; expected in mixed media sources.
