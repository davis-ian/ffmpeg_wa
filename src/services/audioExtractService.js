import { ffmpegService } from './ffmpegService.js';

export const audioExtractService = {
  async extract(file) {
    const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const inputName = `extract_in_${Date.now()}.${inputExt}`;
    const copyOut = `extract_out_${Date.now()}.m4a`;
    const transcodeOut = `extract_out_${Date.now()}.mp3`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      try {
        const copyData = await ffmpegService.processVideo(
          file,
          inputName,
          ['-threads', '1', '-i', inputName, '-vn', '-c:a', 'copy', copyOut],
          copyOut,
        );
        ffmpegService.setLastOperationStrategy('copy');
        return {
          data: copyData,
          mimeType: 'audio/mp4',
          extension: 'm4a',
          strategy: 'copy',
          warnings: [],
        };
      } catch (copyError) {
        console.warn('[audioExtractService] copy failed, fallback to MP3', copyError);
      }

      const transcodeData = await ffmpegService.processVideo(
        file,
        inputName,
        [
          '-threads',
          '1',
          '-i',
          inputName,
          '-vn',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '192k',
          transcodeOut,
        ],
        transcodeOut,
      );
      ffmpegService.setLastOperationStrategy('transcode fallback');
      return {
        data: transcodeData,
        mimeType: 'audio/mpeg',
        extension: 'mp3',
        strategy: 'transcode',
        warnings: ['Source stream could not be copied; output was transcoded to MP3.'],
      };
    });
  },
};
