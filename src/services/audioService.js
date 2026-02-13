import { ffmpegService } from './ffmpegService.js';

function getInputName(file) {
  const originalExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
  return `audio_in_${Date.now()}.${originalExt}`;
}

export const audioService = {
  /**
   * Trim audio from an audio/video input with copy-first fallback strategy.
   * @param {File} file
   * @param {{ startSeconds: number, endSeconds: number }} options
   * @returns {Promise<{ data: Uint8Array, mimeType: string, extension: 'm4a'|'mp3', strategy: 'copy'|'transcode' }>}
   */
  async trim(file, options) {
    const startSeconds = Math.max(0, Number(options?.startSeconds || 0));
    const endSeconds = Math.max(startSeconds + 0.1, Number(options?.endSeconds || 0));

    const inputName = getInputName(file);
    const copyOutputName = `audio_trim_${Date.now()}.m4a`;
    const transcodeOutputName = `audio_trim_${Date.now()}.mp3`;

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
            '-vn',
            '-c:a',
            'copy',
            copyOutputName,
          ],
          copyOutputName,
        );
        ffmpegService.setLastOperationStrategy('copy');

        return {
          data: copyData,
          mimeType: 'audio/mp4',
          extension: 'm4a',
          strategy: 'copy',
        };
      } catch (copyError) {
        console.warn('[audioService] copy trim failed, falling back to MP3 transcode', copyError);
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
          '-vn',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '192k',
          transcodeOutputName,
        ],
        transcodeOutputName,
      );
      ffmpegService.setLastOperationStrategy('transcode fallback');

      return {
        data: transcodeData,
        mimeType: 'audio/mpeg',
        extension: 'mp3',
        strategy: 'transcode',
      };
    });
  },
};
