const express = require('express');
const Jimp = require('jimp');
const path = require('path');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { imagePath, detections } = req.body;

    const image = await Jimp.read(path.resolve(imagePath));
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      image.scan(x, y, width, height, (x, y, idx) => {
        image.bitmap.data[idx + 0] = 255; // Red
        image.bitmap.data[idx + 1] = 0;   // Green
        image.bitmap.data[idx + 2] = 0;   // Blue
        image.bitmap.data[idx + 3] = 255; // Alpha
      });
    });

    const annotatedImagePath = path.join('outputs', `${Date.now()}_annotated.jpg`);
    await image.writeAsync(annotatedImagePath);

    res.json({ annotatedImage: `/${annotatedImagePath}` });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

module.exports = router;
