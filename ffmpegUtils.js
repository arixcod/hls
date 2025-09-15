const { exec } = require('child_process');

// Generate multi-bitrate HLS using FFmpeg CLI.
// outputDir must exist. This will create subfolders v0/, v1/, v2/ and master.m3u8
function generateHLS(inputFile, outputDir) {
  const inFile = `"${inputFile}"`;
  const outDir = outputDir.replace(/\\/g, '/');
  const segmentPattern = `${outDir}/v%v/fileSequence%d.ts`;
  const playlistPattern = `${outDir}/v%v/prog_index.m3u8`;
  const master = 'master.m3u8';

  const cmd = [
    'ffmpeg -y -i', inFile,
    // 360p
    '-filter:v:0 scale=w=640:h=360 -c:v:0 libx264 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k -preset fast -profile:v:0 main -g 48 -keyint_min 48',
    '-c:a:0 aac -b:a:0 96k',
    // 720p
    '-filter:v:1 scale=w=1280:h=720 -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -preset fast -profile:v:1 main -g 48 -keyint_min 48',
    '-c:a:1 aac -b:a:1 128k',
    // 1080p
    '-filter:v:2 scale=w=1920:h=1080 -c:v:2 libx264 -b:v:2 5000k -maxrate:v:2 5350k -bufsize:v:2 7500k -preset fast -profile:v:2 main -g 48 -keyint_min 48',
    '-c:a:2 aac -b:a:2 192k',
    // map streams (map same input to each)
    '-map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a',
    // HLS options
    '-f hls -hls_time 6 -hls_list_size 0 -hls_segment_filename', `"${segmentPattern}"`,
    '-master_pl_name', master,
    '-var_stream_map', `"v:0,a:0 v:1,a:1 v:2,a:2"`,
    `"${playlistPattern}"`
  ].join(' ');

  return new Promise((resolve, reject) => {
    console.log('Running FFmpeg command:');
    console.log(cmd);
    exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
      if (err) {
        console.error('FFmpeg error', err);
        console.error(stderr);
        return reject(err);
      }
      console.log('FFmpeg finished');
      resolve();
    });
  });
}

module.exports = { generateHLS };
