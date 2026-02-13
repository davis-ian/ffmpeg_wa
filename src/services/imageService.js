const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function resolveMaxWidth(resizePreset) {
  if (resizePreset === 'small') return 800;
  if (resizePreset === 'medium') return 1280;
  return null;
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file);
    }

    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function computeTargetDimensions(width, height, resizePreset) {
  const maxWidth = resolveMaxWidth(resizePreset);
  if (!maxWidth || width <= maxWidth) {
    return { width, height };
  }
  const scale = maxWidth / width;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export const imageService = {
  /**
   * Convert image formats client-side using canvas.
   * @param {File} file
   * @param {{ format: 'png'|'jpeg'|'webp', quality?: number, resizePreset?: 'original'|'medium'|'small' }} options
   * @returns {Promise<{ blob: Blob, mimeType: string, width: number, height: number }>}
   */
  async convert(file, options) {
    const {
      format = 'png',
      quality = 0.85,
      resizePreset = 'original',
    } = options || {};

    const mimeType = MIME_BY_FORMAT[format] || MIME_BY_FORMAT.png;
    const source = await loadImageFromFile(file);
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    const target = computeTargetDimensions(sourceWidth, sourceHeight, resizePreset);

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;

    const ctx = canvas.getContext('2d', { alpha: mimeType !== 'image/jpeg' });
    if (!ctx) {
      throw new Error('Could not initialize image conversion context.');
    }

    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, target.width, target.height);
    }

    ctx.drawImage(source, 0, 0, target.width, target.height);

    const blob = await new Promise((resolve, reject) => {
      const q = mimeType === 'image/png' ? undefined : Math.min(1, Math.max(0.1, quality));
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Failed to convert image.'));
          return;
        }
        resolve(result);
      }, mimeType, q);
    });

    if (typeof source.close === 'function') {
      source.close();
    }

    return {
      blob,
      mimeType,
      width: target.width,
      height: target.height,
    };
  },
};
