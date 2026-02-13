# Tool Registry Guide

## Location
`src/tools/toolRegistry.js`

## Purpose
Centralize tool metadata to keep navigation, routing, and categorization consistent.

## ToolDefinition
Each tool entry supports:
- `id: string`
- `label: string`
- `category: 'video' | 'audio' | 'image'`
- `component: string`
- `status?: 'stable' | 'beta'`
- `runtime?: 'ffmpeg' | 'browser-native'`
- `stability?: 'stable' | 'beta'`
- `cost?: 'light' | 'medium' | 'heavy'`
- `capabilities?: string[]`

## Add a New Tool
1. Create component in `src/components`.
2. Add service module in `src/services` if needed.
3. Register tool in `TOOL_DEFINITIONS`.
4. Add component mapping in `src/App.vue` `COMPONENT_MAP`.
5. Add icon condition in `src/components/Sidebar.vue`.
6. Confirm category ordering via `TOOL_CATEGORY_ORDER`.

## Conventions
- Keep IDs stable; avoid renaming existing IDs.
- Prefer lightweight operations by default.
- Mark risky/experimental tools with `status: 'beta'`.
- Populate `runtime` and `cost` to aid future filtering.
