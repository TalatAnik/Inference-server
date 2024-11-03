const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const inferenceRouter = require('./infer');
const generationRouter = require('./generateImage');
const videoInfer = require('./videoInfer');
const dbRoutes = require('./dbRoutes'); 



app.use(express.json());
app.use(express.static(__dirname)); // Serve static files, including test.html

// Mount the API routers for inference and image generation
app.use('/api/infer', inferenceRouter);
app.use('/api/generateImage', generationRouter);
app.use('/api/video_infer', videoInfer);
app.use('/api/db', dbRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
