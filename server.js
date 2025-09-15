const express = require('express');
const videoRoutes = require('./routes/videoRoutes');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/video', videoRoutes);

app.get('/', (req, res) => res.send('Video Processor - Multi-quality HLS'));

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
