// const { exec } = require('child_process');

// // Generate multi-bitrate HLS using FFmpeg CLI.
// // outputDir must exist. This will create subfolders v0/, v1/, v2/ and master.m3u8
// function generateHLS(inputFile, outputDir) {
//   const inFile = `"${inputFile}"`;
//   const outDir = outputDir.replace(/\\/g, '/');
//   const segmentPattern = `${outDir}/v%v/fileSequence%d.ts`;
//   const playlistPattern = `${outDir}/v%v/prog_index.m3u8`;
//   const master = 'master.m3u8';

//   const cmd = [
//     'ffmpeg -y -i', inFile,
//     // 360p
//     '-filter:v:0 scale=w=640:h=360 -c:v:0 libx264 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k -preset fast -profile:v:0 main -g 48 -keyint_min 48',
//     '-c:a:0 aac -b:a:0 96k',
//     // 720p
//     '-filter:v:1 scale=w=1280:h=720 -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -preset fast -profile:v:1 main -g 48 -keyint_min 48',
//     '-c:a:1 aac -b:a:1 128k',
//     // 1080p
//     '-filter:v:2 scale=w=1920:h=1080 -c:v:2 libx264 -b:v:2 5000k -maxrate:v:2 5350k -bufsize:v:2 7500k -preset fast -profile:v:2 main -g 48 -keyint_min 48',
//     '-c:a:2 aac -b:a:2 192k',
//     // map streams (map same input to each)
//     '-map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a',
//     // HLS options
//     '-f hls -hls_time 6 -hls_list_size 0 -hls_segment_filename', `"${segmentPattern}"`,
//     '-master_pl_name', master,
//     '-var_stream_map', `"v:0,a:0 v:1,a:1 v:2,a:2"`,
//     `"${playlistPattern}"`
//   ].join(' ');

//   return new Promise((resolve, reject) => {
//     console.log('Running FFmpeg command:');
//     console.log(cmd);
//     exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
//       if (err) {
//         console.error('FFmpeg error', err);
//         console.error(stderr);
//         return reject(err);
//       }
//       console.log('FFmpeg finished');
//       resolve();
//     });
//   });
// }

// module.exports = { generateHLS };



const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Run a single FFmpeg command for one resolution
function runFFmpeg(inputFile, outputDir, folder, scale, vBitrate, aBitrate) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(outputDir, folder);
    fs.mkdirSync(outPath, { recursive: true });

    const cmd = `ffmpeg -y -i "${inputFile}" \
      -vf scale=${scale} \
      -c:v libx264 -b:v ${vBitrate} -preset fast -profile:v main \
      -c:a aac -b:a ${aBitrate} \
      -hls_time 6 -hls_list_size 0 -f hls "${outPath}/prog_index.m3u8"`;

    console.log("Running FFmpeg:", cmd);

    exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg error:", err);
        console.error(stderr);
        return reject(err);
      }
      console.log(`FFmpeg finished for ${folder}p`);
      resolve();
    });
  });
}

// Generate multi-bitrate HLS sequentially
async function generateHLS(inputFile, outputDir) {
  try {
    // 360p
    await runFFmpeg(inputFile, outputDir, "360", "640x360", "800k", "96k");

    // 720p
    await runFFmpeg(inputFile, outputDir, "720", "1280x720", "2800k", "128k");

    // 1080p
    await runFFmpeg(inputFile, outputDir, "1080", "1920x1080", "5000k", "192k");

    // Create master.m3u8
    const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=952000,RESOLUTION=640x360
360/prog_index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3100000,RESOLUTION=1280x720
720/prog_index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5350000,RESOLUTION=1920x1080
1080/prog_index.m3u8
`;

    fs.writeFileSync(path.join(outputDir, "master.m3u8"), master);
    console.log("Master playlist created");

  } catch (err) {
    console.error("Error in generateHLS:", err);
    throw err;
  }
}

module.exports = { generateHLS };
