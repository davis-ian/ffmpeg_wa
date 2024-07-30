import path from "path";

export const fcommand = {
  //Commands

  /**
   * Generates an FFmpeg command to trim the first N seconds from a video.
   * @param {string} inputFilePath - The path to the input video file.
   * @param {number} trimSeconds - The number of seconds to trim from the start.
   * @param {string} outputFilePath - The path to the output video file.
   * @return {string} - The FFmpeg command.
   */
  generateTrimCommand(inputFilePath, trimSeconds, outputFilePath) {
    return `ffmpeg -y -i ${inputFilePath} -ss ${this.formatTime(
      trimSeconds
    )} -c copy ${outputFilePath}`;
  },

  /**
   * Generates an FFmpeg command to convert a video to a different format.
   * @param {string} inputFilePath - The path to the input video file.
   * @param {string} outputFormat - The desired output format (e.g., "mp4", "mov").
   * @param {string} outputFilePath - The path to the output video file.
   * @return {string} - The FFmpeg command.
   */
  generateConvertCommand(inputFilePath, outputFormat, outputFilePath) {
    return `ffmpeg -y -i ${inputFilePath} -c:v libx264 -c:a aac ${outputFilePath}.${outputFormat}`;
  },

  /**
   * Generates FFmpeg command to convert file to hls
   * @param {string} inputPath - file path
   * @param {string} encoder - desired encoder
   * @param {number} startNumber - the starting hls segment index
   * @param {number} hlsTime - the hls segment duration in seconds
   * @param {number} outputPath - the output path
   */
  generateHlsConvertCommand(
    inputPath,
    encoder,
    outputPath,
    startNumber = 0,
    hlsTime = 10
  ) {
    return `ffmpeg -y -i ${inputPath} -c:v ${encoder} -start_number ${startNumber} -hls_time ${hlsTime} -hls_list_size 0 -f hls ${outputPath}`;
  },

  // Helpers

  /**
   * Formats seconds into an HH:MM:SS time string.
   * @param {number} totalSeconds - The total seconds to format.
   * @return {string} - The formatted time string.
   */
  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
    const seconds = totalSeconds - hours * 3600 - minutes * 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  },

  /**
   * Converts file path to m3u8
   * @param {string} path - file path
   */
  convertToHlsPath(path) {
    path = path.replace(/"/g, "");

    const directory = path.substring(0, path.lastIndexOf("\\") + 1);
    const nameWithoutExt = path.substring(
      path.lastIndexOf("\\") + 1,
      path.lastIndexOf(".")
    );

    // const newDirectory = `${directory}${nameWithoutExt}_hls\\`;

    const newFileName = `${nameWithoutExt}.m3u8`;

    const newPath = `${directory}${newFileName}`;
    return `"${newPath}"`;
  },

  /**
   * Returns current directory from file path
   * @param {string} filePath
   * @return {string}  - file directory
   */
  generateOutputDir(filePath) {
    if (filePath) {
      // Use path.sep to get the platform-specific path separator
      const separatorIndex = filePath.lastIndexOf("/") + 1;

      return filePath.substring(0, separatorIndex);
    }
  },
};

export default fcommand;
