# Video Processor - Multi-quality HLS

## What this project does
- Downloads a video from S3
- Uses FFmpeg to generate multi-quality HLS (360p, 720p, 1080p) with a master playlist
- Uploads HLS output back to S3
- Returns the master.m3u8 URL

## Setup on EC2 (m7g.large)
1. Install ffmpeg and node:
   ```
   sudo apt update
   sudo apt install -y ffmpeg
   node -v
   npm -v
   ```
2. Copy project files and install deps:
   ```
   npm install
   ```
3. Export AWS credentials (or set EC2 IAM role):
   ```
   export AWS_ACCESS_KEY_ID=YOUR_KEY
   export AWS_SECRET_ACCESS_KEY=YOUR_SECRET
   export AWS_REGION=ap-south-1
   ```
4. Start server:
   ```
   node server.js
   ```
5. Trigger processing:
   ```
   curl -X POST http://localhost:3000/video/process-hls \
     -H "Content-Type: application/json" \
     -d '{ "bucket":"your-bucket", "inputKey":"uploads/myvideo.mp4" }'
   ```

## Notes
- Ensure the EC2 has enough disk space for the downloaded file and generated segments.
- For production, use a job queue and worker instances rather than running long ffmpeg jobs in request handlers.
