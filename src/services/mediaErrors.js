export const MEDIA_ERROR_TYPE = {
  RUNTIME: 'runtime',
  UNSUPPORTED: 'unsupported',
  HEAVY_OPERATION: 'heavy-op',
  IO: 'io',
};

export function classifyMediaError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('out of bounds') || message.includes('memory access')) {
    return MEDIA_ERROR_TYPE.HEAVY_OPERATION;
  }
  if (message.includes('not supported') || message.includes('unsupported')) {
    return MEDIA_ERROR_TYPE.UNSUPPORTED;
  }
  if (message.includes('request failed') || message.includes('network') || message.includes('cors')) {
    return MEDIA_ERROR_TYPE.IO;
  }
  return MEDIA_ERROR_TYPE.RUNTIME;
}

export function formatMediaError(error, defaultMessage) {
  const type = classifyMediaError(error);

  if (type === MEDIA_ERROR_TYPE.HEAVY_OPERATION) {
    return 'This operation is heavy for browser processing. Try a copy/remux option first.';
  }
  if (type === MEDIA_ERROR_TYPE.UNSUPPORTED) {
    return 'This format/operation is not supported in the current browser runtime.';
  }
  if (type === MEDIA_ERROR_TYPE.IO) {
    return 'Media I/O failed. Check file access and try again.';
  }
  return error?.message || defaultMessage;
}
