/**
 * @typedef {Object} ToolDefinition
 * @property {string} id
 * @property {string} label
 * @property {'video'|'audio'|'image'} category
 * @property {string} component
 * @property {'stable'|'beta'} [status]
 * @property {'ffmpeg'|'browser-native'} [runtime]
 * @property {'stable'|'beta'} [stability]
 * @property {'light'|'medium'|'heavy'} [cost]
 * @property {string[]} [capabilities]
 */

/** @type {ToolDefinition[]} */
export const TOOL_DEFINITIONS = [
  {
    id: "hls-download",
    label: "HLS Download",
    category: "video",
    component: "HlsDownloader",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "medium",
    capabilities: ["download", "remux"],
  },
  {
    id: "metadata",
    label: "Video Metadata",
    category: "video",
    component: "MetadataViewer",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "light",
    capabilities: ["probe"],
  },
  {
    id: "thumbnail",
    label: "Thumbnail Clipper",
    category: "video",
    component: "FfmpegDemo",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "medium",
    capabilities: ["transcode"],
  },
  {
    id: "converter",
    label: "Convert Video",
    category: "video",
    component: "VideoConverter",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "medium",
    capabilities: ["remux", "transcode"],
  },
  {
    id: "audio-trimmer",
    label: "Audio Trimmer",
    category: "audio",
    component: "AudioTrimmer",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "medium",
    capabilities: ["trim", "extract", "fallback"],
  },
  {
    id: "image-converter",
    label: "Image Converter",
    category: "image",
    component: "ImageConverter",
    status: "stable",
    runtime: "browser-native",
    stability: "stable",
    cost: "light",
    capabilities: ["convert", "resize"],
  },
  {
    id: "audio-extractor",
    label: "Audio Extractor",
    category: "audio",
    component: "AudioExtractor",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "light",
    capabilities: ["extract", "copy", "fallback"],
  },
  {
    id: "frame-sequence-export",
    label: "Frame Sequence",
    category: "video",
    component: "FrameSequenceExport",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "light",
    capabilities: ["extract", "sequence"],
  },
  {
    id: "media-join",
    label: "Media Join",
    category: "video",
    component: "MediaJoin",
    status: "stable",
    runtime: "ffmpeg",
    stability: "stable",
    cost: "medium",
    capabilities: ["merge", "copy", "compat-check"],
  },
  // {
  //   id: 'silence-cutter',
  //   label: 'Silence Cutter',
  //   category: 'audio',
  //   component: 'SilenceCutter',
  //   status: 'beta',
  //   runtime: 'ffmpeg',
  //   stability: 'beta',
  //   cost: 'medium',
  //   capabilities: ['trim', 'transcode'],
  // },
  // {
  //   id: "contact-sheet",
  //   label: "Contact Sheet",
  //   category: "video",
  //   component: "ContactSheetGenerator",
  //   status: "beta",
  //   runtime: "ffmpeg",
  //   stability: "beta",
  //   cost: "medium",
  //   capabilities: ["extract", "image"],
  // },
  // {
  //   id: "container-rewrap",
  //   label: "Container Rewrap",
  //   category: "video",
  //   component: "ContainerRewrap",
  //   status: "beta",
  //   runtime: "ffmpeg",
  //   stability: "beta",
  //   cost: "light",
  //   capabilities: ["remux", "copy"],
  // },
];

export const TOOL_CATEGORY_ORDER = ["video", "audio", "image"];

export const TOOL_CATEGORY_LABELS = {
  video: "Video",
  audio: "Audio",
  image: "Image",
};
