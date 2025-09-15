const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const s3 = new AWS.S3({ region: REGION });

// Download file from S3 to destPath
async function downloadFromS3(bucket, key, destPath) {
  const params = { Bucket: bucket, Key: key };
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  const file = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    s3.getObject(params).createReadStream()
      .on('error', reject)
      .pipe(file)
      .on('finish', () => resolve(destPath))
      .on('error', reject);
  });
}

// Upload directory recursively to S3 under s3Prefix
async function uploadDirectoryToS3(bucket, localDir, s3Prefix) {
  const walk = (dir) => {
    let entries = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) {
        entries = entries.concat(walk(full).map(e => ({ full: e.full, rel: path.posix.join(it.name, e.rel) })));
      } else {
        entries.push({ full, rel: it.name });
      }
    }
    return entries;
  };

  function flatten(dir, prefix='') {
    let results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      const rel = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.isDirectory()) results = results.concat(flatten(full, rel));
      else results.push({ full, rel });
    }
    return results;
  }

  const files = flatten(localDir);
  for (const f of files) {
    const fileStream = fs.createReadStream(f.full);
    const key = `${s3Prefix}/${f.rel}`;
    let contentType = 'application/octet-stream';
    if (key.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
    if (key.endsWith('.ts')) contentType = 'video/MP2T';
    await s3.upload({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: contentType
    }).promise();
    console.log('Uploaded', key);
  }
}

module.exports = { downloadFromS3, uploadDirectoryToS3 };
