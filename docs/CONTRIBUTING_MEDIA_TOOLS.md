# Contributing Media Tools

## Design Checklist (Safe-First)
Before shipping a tool:
1. Start with copy/remux/extract defaults.
2. Add transcode only when necessary.
3. Add clear fallback messages.
4. Surface strategy outcome in UI.
5. Wire progress updates for long-running ops.

## Implementation Playbook
1. Define tool in `src/tools/toolRegistry.js`.
2. Create UI component in `src/components`.
3. Add service wrapper in `src/services`.
4. Use `ffmpegService` for FFmpeg operations.
5. Route errors through `formatMediaError`.
6. Update `src/App.vue` component map.
7. Add sidebar icon conditions.

## Command Preset Guidance
- Prefer:
  - `-c copy`
  - lightweight extraction filters
  - single-thread defaults for fragile browser paths
- Avoid defaulting to heavy multi-pass transcodes.

## Testing Expectations
Run at minimum:
- `npm run build`
- Existing tool smoke checks:
  - thumbnail
  - metadata
  - hls downloader
  - converter
  - image converter
  - audio trimmer
- New tool happy path + one fallback/error path.

## Docs Requirements for New Tools
Update:
- `README.md` tool catalog
- `docs/TOOL_REGISTRY.md` if schema/category conventions change
- runtime docs if tool introduces new FFmpeg status semantics
