import { ffmpegService } from './ffmpegService.js';
import { buildZip } from './zipUtils.js';

const MAX_FRAME_COUNT = 120;

function estimateFrameCount(durationSec, intervalSec) {
  if (!durationSec || !intervalSec || intervalSec <= 0) return 0;
  return Math.ceil(durationSec / intervalSec);
}

export const frameExportService = {
  maxFrameCount: MAX_FRAME_COUNT,

  estimateFrameCount,

  async exportFrames(file, options = {}) {
    const {
      intervalSeconds = 2,
      quality = 3,
      maxWidth = 1280,
      format = 'jpg',
      frameLimit = MAX_FRAME_COUNT,
    } = options;

    const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const inputName = `frames_in_${Date.now()}.${inputExt}`;
    const frameDir = `/frames_${Date.now()}`;
    const ext = format === 'png' ? 'png' : 'jpg';
    const pattern = `${frameDir}/frame_%04d.${ext}`;

    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      const metadata = await ffmpegService.extractMetadata(file);
      const duration = Number(metadata?.format?.duration || 0);
      const estimate = estimateFrameCount(duration, intervalSeconds);
      if (estimate > frameLimit) {
        throw new Error(
          `Estimated ${estimate} frames exceeds limit (${frameLimit}). Increase interval or trim source duration.`,
        );
      }

      await ffmpegService.createDir(frameDir);

      await ffmpegService.writeFile(inputName, file);
      try {
        const execArgs = [
          '-threads',
          '1',
          '-i',
          inputName,
          '-vf',
          `fps=1/${intervalSeconds},scale=min(${maxWidth},iw):-2`,
          '-q:v',
          `${quality}`,
          pattern,
        ];
        const code = await ffmpegService.exec(execArgs);
        if (code !== 0) {
          throw new Error(`Frame export failed with exit code ${code}`);
        }
      } finally {
        try {
          await ffmpegService.deleteFile(inputName);
        } catch {
          // no-op
        }
      }

      try {
        const dirList = await ffmpegService.listDir(frameDir);
        const frames = dirList
          .filter((entry) => !entry.isDir && /^frame_\\d+\\.(jpg|png)$/i.test(entry.name))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!frames.length) {
          throw new Error('No frames were generated.');
        }

        const zipEntries = [];
        for (const frame of frames) {
          const fullPath = `${frameDir}/${frame.name}`;
          const data = await ffmpegService.readFile(fullPath);
          zipEntries.push({
            name: frame.name,
            data: new Uint8Array(data.buffer || data),
          });
          await ffmpegService.deleteFile(fullPath);
        }

        ffmpegService.setLastOperationStrategy('extract');
        return {
          zipBlob: buildZip(zipEntries),
          count: zipEntries.length,
          estimatedCount: estimate,
          warnings: [],
        };
      } finally {
        try {
          await ffmpegService.deleteDir(frameDir);
        } catch {
          // no-op
        }
      }
    });
  },
};
