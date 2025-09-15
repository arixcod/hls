const express = require('express');
const fs = require('fs');
const path = require('path');
const { downloadFromS3, uploadDirectoryToS3 } = require('../s3Utils');
const { generateHLS } = require('../ffmpegUtils');

const router = express.Router();

// POST /video/process-hls
// body: { bucket: 'my-bucket', inputKey: 'uploads/my.mp4' }
router.post('/process-hls', async (req, res) => {
  try {
    const { bucket, inputKey } = req.body;
    if (!bucket || !inputKey) return res.status(400).json({ error: 'Provide bucket and inputKey in body' });

    const jobId = Date.now().toString();
    const localInput = path.join('/tmp', `${jobId}-input.mp4`);
    const outputDir = path.join('/tmp', `hls-${jobId}`);

    fs.mkdirSync(outputDir, { recursive: true });

    console.log('Downloading from S3:', bucket, inputKey);
    await downloadFromS3(bucket, inputKey, localInput);

    console.log('Generating multi-bitrate HLS...');
    await generateHLS(localInput, outputDir);

    console.log('Uploading HLS to S3...');
    const s3Prefix = `hls/${jobId}`;
    await uploadDirectoryToS3(bucket, outputDir, s3Prefix);

    const region = process.env.AWS_REGION || 'ap-south-1';
    const masterUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Prefix}/master.m3u8`;

    // cleanup local files
    try { fs.unlinkSync(localInput); } catch(e) {}
    // optionally remove outputDir recursively
    const rimraf = require('rimraf');
    rimraf.sync(outputDir);

    res.json({ status: 'success', jobId, masterPlaylist: masterUrl });
  } catch (err) {
    console.error('Error processing video:', err);
    res.status(500).json({ error: err.message || 'processing failed' });
  }
});

module.exports = router;
