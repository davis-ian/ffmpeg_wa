import { ffmpegService } from './ffmpegService.js';

export const contactSheetService = {
  async generate(file, options = {}) {
    const {
      columns = 4,
      rows = 4,
      intervalSeconds = 10,
      cellWidth = 320,
    } = options;

    const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const inputName = `sheet_in_${Date.now()}.${inputExt}`;
    const outputName = `sheet_out_${Date.now()}.jpg`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      const vf = `fps=1/${intervalSeconds},scale=${cellWidth}:-1,tile=${columns}x${rows}`;

      const data = await ffmpegService.processVideo(
        file,
        inputName,
        ['-threads', '1', '-i', inputName, '-vf', vf, '-frames:v', '1', '-q:v', '3', outputName],
        outputName,
      );

      ffmpegService.setLastOperationStrategy('extract');
      return {
        data,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        strategy: 'extract',
        warnings: [],
      };
    });
  },
};
