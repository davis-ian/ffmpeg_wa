import { ffmpegService } from './ffmpegService.js';

function getInputName(file) {
  const originalExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
  return `video_in_${Date.now()}.${originalExt}`;
}

export const videoTrimService = {
  /**
   * Trim video with copy-first fallback strategy.
   * @param {File} file
   * @param {{ startSeconds: number, endSeconds: number }} options
   * @returns {Promise<{ data: Uint8Array, mimeType: string, extension: 'mp4', strategy: 'copy'|'transcode' }>}
   */
  async trim(file, options) {
    const startSeconds = Math.max(0, Number(options?.startSeconds || 0));
    const endSeconds = Math.max(startSeconds + 0.1, Number(options?.endSeconds || 0));

    const inputName = getInputName(file);
    const outputName = `video_trim_${Date.now()}.mp4`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      try {
        const copyData = await ffmpegService.processVideo(
          file,
          inputName,
          [
            '-threads',
            '1',
            '-ss',
            `${startSeconds}`,
            '-to',
            `${endSeconds}`,
            '-i',
            inputName,
            '-c',
            'copy',
            '-movflags',
            'faststart',
            outputName,
          ],
          outputName,
        );

        ffmpegService.setLastOperationStrategy('copy');
        return {
          data: copyData,
          mimeType: 'video/mp4',
          extension: 'mp4',
          strategy: 'copy',
        };
      } catch (copyError) {
        console.warn('[videoTrimService] copy trim failed, falling back to transcode', copyError);
      }

      const transcodeData = await ffmpegService.processVideo(
        file,
        inputName,
        [
          '-threads',
          '1',
          '-ss',
          `${startSeconds}`,
          '-to',
          `${endSeconds}`,
          '-i',
          inputName,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          'faststart',
          outputName,
        ],
        outputName,
      );

      ffmpegService.setLastOperationStrategy('transcode fallback');
      return {
        data: transcodeData,
        mimeType: 'video/mp4',
        extension: 'mp4',
        strategy: 'transcode',
      };
    });
  },
};
