import { ffmpegService } from './ffmpegService.js';

export const containerRewrapService = {
  async rewrap(file, outputFormat = 'mkv') {
    const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const inputName = `rewrap_in_${Date.now()}.${inputExt}`;
    const outputName = `rewrap_out_${Date.now()}.${outputFormat}`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      const args = ['-threads', '1', '-i', inputName, '-c', 'copy'];
      if (outputFormat === 'mp4') {
        args.push('-movflags', 'faststart');
      }
      if (outputFormat === 'ts') {
        args.push('-f', 'mpegts');
      }
      args.push(outputName);

      const data = await ffmpegService.processVideo(file, inputName, args, outputName);
      ffmpegService.setLastOperationStrategy('remux');

      return {
        data,
        extension: outputFormat,
        mimeType:
          outputFormat === 'mkv'
            ? 'video/x-matroska'
            : outputFormat === 'mov'
              ? 'video/quicktime'
              : outputFormat === 'ts'
                ? 'video/mp2t'
                : 'video/mp4',
        strategy: 'remux',
        warnings: [],
      };
    });
  },
};
