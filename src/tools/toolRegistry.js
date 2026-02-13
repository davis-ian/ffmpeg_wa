/**
 * @typedef {Object} ToolDefinition
 * @property {string} id
 * @property {string} label
 * @property {'video'|'audio'|'image'} category
 * @property {string} component
 * @property {'stable'|'beta'} [status]
 * @property {string[]} [capabilities]
 */

/** @type {ToolDefinition[]} */
export const TOOL_DEFINITIONS = [
  {
    id: 'thumbnail',
    label: 'Thumbnail Clipper',
    category: 'video',
    component: 'FfmpegDemo',
    status: 'stable',
    capabilities: ['transcode'],
  },
  {
    id: 'metadata',
    label: 'Video Metadata',
    category: 'video',
    component: 'MetadataViewer',
    status: 'stable',
    capabilities: ['probe'],
  },
  {
    id: 'hls-download',
    label: 'HLS Download',
    category: 'video',
    component: 'HlsDownloader',
    status: 'stable',
    capabilities: ['download', 'remux'],
  },
  {
    id: 'converter',
    label: 'Convert Video',
    category: 'video',
    component: 'VideoConverter',
    status: 'stable',
    capabilities: ['remux', 'transcode'],
  },
  {
    id: 'audio-trimmer',
    label: 'Audio Trimmer',
    category: 'audio',
    component: 'AudioTrimmer',
    status: 'stable',
    capabilities: ['trim', 'extract', 'fallback'],
  },
  {
    id: 'image-converter',
    label: 'Image Converter',
    category: 'image',
    component: 'ImageConverter',
    status: 'stable',
    capabilities: ['convert', 'resize'],
  },
];

export const TOOL_CATEGORY_ORDER = ['video', 'audio', 'image'];

export const TOOL_CATEGORY_LABELS = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
};
