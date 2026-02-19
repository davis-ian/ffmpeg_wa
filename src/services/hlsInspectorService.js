const M3U_HEADER = "#EXTM3U";

function assertManifestText(text, sourceUrl) {
  if (!text || !text.includes(M3U_HEADER)) {
    throw new Error(
      `Response from ${sourceUrl} does not look like an HLS (.m3u8) playlist`,
    );
  }
}

function resolveUrl(path, baseUrl) {
  try {
    return new URL(path, baseUrl).href;
  } catch {
    return path;
  }
}

export async function fetchManifestText(manifestUrl) {
  const absoluteUrl = resolveUrl(manifestUrl, window.location.href);
  const response = await fetch(absoluteUrl, { mode: "cors" });
  if (!response.ok) {
    throw new Error(
      `Manifest request failed (${response.status}) for ${absoluteUrl}`,
    );
  }
  const text = await response.text();
  assertManifestText(text, absoluteUrl);
  return { text, sourceUrl: absoluteUrl };
}

export function detectPlaylistType(manifestText) {
  if (/EXT-X-STREAM-INF/.test(manifestText)) {
    return "master";
  }
  return "media";
}

export function parseMasterPlaylist(manifestText, baseUrl) {
  const lines = manifestText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const variants = [];

  console.log(lines, "lines");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("#EXT-X-STREAM-INF")) {
      continue;
    }

    const nextLine = lines[i + 1];
    if (!nextLine || nextLine.startsWith("#")) {
      continue;
    }

    const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
    const codecsMatch = line.match(/CODECS="([^"]+)"/);
    const frameRateMatch = line.match(/FRAME-RATE=([0-9.]+)/);
    const labelParts = [];

    if (resolutionMatch) {
      labelParts.push(resolutionMatch[1]);
    }
    if (bandwidthMatch) {
      labelParts.push(`${Math.round(Number(bandwidthMatch[1]) / 1000)} kbps`);
    }
    if (frameRateMatch) {
      labelParts.push(`${frameRateMatch[1]} fps`);
    }

    const resolvedUrl = resolveUrl(nextLine, baseUrl);
    variants.push({
      url: resolvedUrl,
      label: labelParts.length ? labelParts.join(" · ") : resolvedUrl,
      bandwidth: bandwidthMatch ? Number(bandwidthMatch[1]) : null,
      resolution: resolutionMatch ? resolutionMatch[1] : null,
      frameRate: frameRateMatch ? Number(frameRateMatch[1]) : null,
      codecs: codecsMatch ? codecsMatch[1] : null,
    });
  }

  return variants;
}

export function parseMediaPlaylist(manifestText, baseUrl) {
  const lines = manifestText.split(/\r?\n/);
  const segments = [];
  const metadata = {
    version: null,
    targetDuration: null,
    mediaSequence: 0,
    playlistType: null,
    hasEndList: /EXT-X-ENDLIST/.test(manifestText),
    hasEncryption: /EXT-X-KEY/.test(manifestText),
  };

  let currentDuration = null;
  let currentTitle = "";
  let currentProgramDateTime = null;
  let currentByteRange = null;
  let currentDiscontinuity = false;
  let startTime = 0;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    if (line.startsWith("#")) {
      if (line.startsWith("#EXTINF")) {
        const [, durationPart = "0"] = line.split(":");
        const [durationValue, title = ""] = durationPart.split(",");
        currentDuration = Number(durationValue);
        currentTitle = title.trim();
      } else if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME")) {
        currentProgramDateTime = line
          .replace("#EXT-X-PROGRAM-DATE-TIME:", "")
          .trim();
      } else if (line.startsWith("#EXT-X-TARGETDURATION")) {
        metadata.targetDuration = Number(
          line.replace("#EXT-X-TARGETDURATION:", "").trim(),
        );
      } else if (line.startsWith("#EXT-X-VERSION")) {
        metadata.version = Number(line.replace("#EXT-X-VERSION:", "").trim());
      } else if (line.startsWith("#EXT-X-MEDIA-SEQUENCE")) {
        metadata.mediaSequence = Number(
          line.replace("#EXT-X-MEDIA-SEQUENCE:", "").trim(),
        );
      } else if (line.startsWith("#EXT-X-PLAYLIST-TYPE")) {
        metadata.playlistType = line
          .replace("#EXT-X-PLAYLIST-TYPE:", "")
          .trim();
      } else if (line.startsWith("#EXT-X-BYTERANGE")) {
        currentByteRange = line.replace("#EXT-X-BYTERANGE:", "").trim();
      } else if (line.startsWith("#EXT-X-DISCONTINUITY")) {
        currentDiscontinuity = true;
      }
      return;
    }

    const absoluteUrl = resolveUrl(line, baseUrl);
    const duration = Number.isFinite(currentDuration) ? currentDuration : null;
    segments.push({
      index: metadata.mediaSequence + segments.length,
      uri: line,
      absoluteUrl,
      duration,
      title: currentTitle,
      programDateTime: currentProgramDateTime,
      byteRange: currentByteRange,
      discontinuity: currentDiscontinuity,
      startTime,
    });

    if (duration) {
      startTime += duration;
    }

    currentDuration = null;
    currentTitle = "";
    currentProgramDateTime = null;
    currentByteRange = null;
    currentDiscontinuity = false;
  });

  return { segments, metadata };
}

export function buildSingleSegmentPlaylist(segment) {
  const safeDuration =
    segment?.duration && Number.isFinite(segment.duration)
      ? segment.duration
      : 2;
  const targetDuration = Math.max(1, Math.ceil(safeDuration));
  const mediaSequence = Number.isFinite(segment?.index) ? segment.index : 0;

  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    "#EXT-X-PLAYLIST-TYPE:VOD",
    `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    `#EXTINF:${safeDuration.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")},`,
    segment.absoluteUrl,
    "#EXT-X-ENDLIST",
  ];

  return lines.join("\n");
}

export function summarizeManifest(manifestText) {
  const hasIFrames = /#EXT-X-I-FRAME-STREAM-INF/.test(manifestText);
  return {
    isLowLatency: /#EXT-X-SERVER-CONTROL/.test(manifestText),
    hasIFrames,
    rawLineCount: manifestText.split(/\r?\n/).length,
  };
}

export function formatTimestampDisplay(programDateTime) {
  if (!programDateTime) return null;
  try {
    const date = new Date(programDateTime);
    if (Number.isNaN(date.getTime())) {
      return programDateTime;
    }
    return date.toLocaleString();
  } catch {
    return programDateTime;
  }
}
