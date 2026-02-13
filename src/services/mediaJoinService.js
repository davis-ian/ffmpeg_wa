import { ffmpegService } from './ffmpegService.js';

function getPrimaryStream(metadata, type) {
  return metadata?.streams?.find((s) => s.codec_type === type) || null;
}

function normalizeFileDescriptor(file, metadata) {
  const video = getPrimaryStream(metadata, 'video');
  const audio = getPrimaryStream(metadata, 'audio');

  return {
    name: file.name,
    extension: (file.name.split('.').pop() || '').toLowerCase(),
    formatDuration: metadata?.format?.duration || null,
    video,
    audio,
  };
}

function compareDescriptor(reference, candidate) {
  const reasons = [];

  if (reference.extension !== candidate.extension) {
    reasons.push(`container mismatch (${reference.extension} vs ${candidate.extension})`);
  }

  if (Boolean(reference.video) !== Boolean(candidate.video)) {
    reasons.push('video stream presence mismatch');
  } else if (reference.video && candidate.video) {
    if (reference.video.codec_name !== candidate.video.codec_name) {
      reasons.push(`video codec mismatch (${reference.video.codec_name} vs ${candidate.video.codec_name})`);
    }
    if (reference.video.r_frame_rate !== candidate.video.r_frame_rate) {
      reasons.push(`fps mismatch (${reference.video.r_frame_rate} vs ${candidate.video.r_frame_rate})`);
    }
    if (reference.video.width !== candidate.video.width || reference.video.height !== candidate.video.height) {
      reasons.push('video resolution mismatch');
    }
  }

  if (Boolean(reference.audio) !== Boolean(candidate.audio)) {
    reasons.push('audio stream presence mismatch');
  } else if (reference.audio && candidate.audio) {
    if (reference.audio.codec_name !== candidate.audio.codec_name) {
      reasons.push(`audio codec mismatch (${reference.audio.codec_name} vs ${candidate.audio.codec_name})`);
    }
    if (reference.audio.sample_rate !== candidate.audio.sample_rate) {
      reasons.push('audio sample-rate mismatch');
    }
    if (reference.audio.channels !== candidate.audio.channels) {
      reasons.push('audio channel mismatch');
    }
  }

  return reasons;
}

export const mediaJoinService = {
  async validateCompatibility(files) {
    if (!files || files.length < 2) {
      return {
        compatible: false,
        reasons: ['Select at least two files.'],
        normalizedMetadata: [],
      };
    }

    const normalized = [];
    await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      for (const file of files) {
        const metadata = await ffmpegService.extractMetadata(file);
        normalized.push(normalizeFileDescriptor(file, metadata));
      }
    });

    const reference = normalized[0];
    const reasons = [];

    for (let i = 1; i < normalized.length; i += 1) {
      const mismatch = compareDescriptor(reference, normalized[i]);
      mismatch.forEach((reason) => reasons.push(`${normalized[i].name}: ${reason}`));
    }

    return {
      compatible: reasons.length === 0,
      reasons,
      normalizedMetadata: normalized,
    };
  },

  async join(files) {
    const validation = await this.validateCompatibility(files);
    if (!validation.compatible) {
      return {
        ...validation,
        data: null,
        mimeType: null,
        extension: null,
        strategy: 'blocked',
      };
    }

    const ext = validation.normalizedMetadata[0].extension || 'mp4';
    const outputName = `joined_${Date.now()}.${ext}`;
    const listName = `concat_${Date.now()}.txt`;

    const inputNames = [];
    return await ffmpegService.withTemporaryWorkerThreads(1, async () => {
      try {
        for (let i = 0; i < files.length; i += 1) {
          const inputName = `join_${i}_${Date.now()}.${ext}`;
          inputNames.push(inputName);
          await ffmpegService.writeFile(inputName, files[i]);
        }

        const listText = inputNames.map((name) => `file '${name}'`).join('\n');
        await ffmpegService.writeFile(listName, new TextEncoder().encode(listText));

        const code = await ffmpegService.exec([
          '-threads',
          '1',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listName,
          '-c',
          'copy',
          outputName,
        ]);

        if (code !== 0) {
          throw new Error(`Join failed with exit code ${code}`);
        }

        const data = await ffmpegService.readFile(outputName);
        ffmpegService.setLastOperationStrategy('remux');
        return {
          compatible: true,
          reasons: [],
          normalizedMetadata: validation.normalizedMetadata,
          data,
          mimeType: ext === 'mkv' ? 'video/x-matroska' : ext === 'mov' ? 'video/quicktime' : 'video/mp4',
          extension: ext,
          strategy: 'copy',
        };
      } finally {
        for (const name of inputNames) {
          try {
            await ffmpegService.deleteFile(name);
          } catch {
            // no-op
          }
        }
        for (const cleanupName of [listName, outputName]) {
          try {
            await ffmpegService.deleteFile(cleanupName);
          } catch {
            // no-op
          }
        }
      }
    });
  },
};
