import { ffmpegService } from './ffmpegService.js';

export const silenceCutterService = {
  async cut(file, options = {}) {
    const {
      silenceDb = -35,
      minSilenceSeconds = 0.4,
    } = options;

    const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const inputName = `silence_in_${Date.now()}.${inputExt}`;
    const outputName = `silence_out_${Date.now()}.mp3`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      const args = [
        '-threads',
        '1',
        '-i',
        inputName,
        '-vn',
        '-af',
        `silenceremove=start_periods=1:start_duration=${minSilenceSeconds}:start_threshold=${silenceDb}dB:stop_periods=-1:stop_duration=${minSilenceSeconds}:stop_threshold=${silenceDb}dB`,
        '-c:a',
        'libmp3lame',
        '-b:a',
        '192k',
        outputName,
      ];

      const data = await ffmpegService.processVideo(file, inputName, args, outputName);
      ffmpegService.setLastOperationStrategy('transcode');
      return {
        data,
        mimeType: 'audio/mpeg',
        extension: 'mp3',
        strategy: 'transcode',
        warnings: ['Silence removal re-encodes audio.'],
      };
    });
  },
};
