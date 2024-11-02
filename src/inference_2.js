const express = require('express');
const multer = require('multer');
const onnx = require('onnxruntime-node');
const fs = require('fs').promises; // Use promises to handle file operations
const sharp = require('sharp'); // Import Sharp


const generateImage = require('./imgGen');

const router = express.Router();

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Load ONNX model once when the server starts
let session;
(async () => {
  try {
    session = await onnx.InferenceSession.create('src/best_coco_10ep.onnx');
    console.log('ONNX model loaded successfully.');
  } catch (error) {
    console.error('Error loading ONNX model:', error);
  }
})();

// Preprocess image to match the model's input requirements
async function preprocessImage(imagePath) {
  // Get the resized image as a buffer
  const imageBuffer = await sharp(imagePath)
    .resize(640, 640) // Resize to the required dimensions
    .toFormat('jpeg')
    .toBuffer();

  // Convert the image buffer to a Float32Array
  const rawImageData = new Uint8Array(imageBuffer);
  const imageData = new Float32Array(640 * 640 * 3); // 640 * 640 pixels, 3 channels

  // Populate the Float32Array with normalized pixel values
  for (let i = 0; i < rawImageData.length; i += 3) {
    // Normalize pixel values and fill the array
    imageData[i / 3 * 3 + 0] = rawImageData[i] / 255.0;      // R
    imageData[i / 3 * 3 + 1] = rawImageData[i + 1] / 255.0;  // G
    imageData[i / 3 * 3 + 2] = rawImageData[i + 2] / 255.0;  // B
  }

  // Create a tensor with the shape [1, 3, height, width]
  return new onnx.Tensor('float32', imageData, [1, 3, 640, 640]);
}


function postprocessResults(output) {
    // Ensure output is defined
    if (!output || !output.data) {
        throw new Error('Output data is missing or invalid.');
    }

    const boxes = output.data;
    const detections = [];
    

    const numBoxes = 84; // Adjust based on your model's output
    const gridSize = 8400; // Adjust based on your model's output

    // Assuming the structure is [batch, num_boxes, grid]
    for (let i = 0; i < numBoxes; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;

            // Extract bounding box coordinates, confidence, and class
            const confidence = boxes[index * 6 + 4]; // Assuming confidence is at index 4
            const x1 = boxes[index * 6]; // x1 coordinate
            const y1 = boxes[index * 6 + 1]; // y1 coordinate
            const x2 = boxes[index * 6 + 2]; // x2 coordinate
            const y2 = boxes[index * 6 + 3]; // y2 coordinate
            const classId = boxes[index * 6 + 5]; // Class ID

            // Filter out low-confidence detections
            if (confidence > 80) { // Adjust the threshold as necessary
                detections.push({ x1, y1, x2, y2, confidence });
            }
        }
    }

    return detections;
}


router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Preprocess image
    const tensor = await preprocessImage(req.file.path);

    // Run inference
    const feeds = { images: tensor }; // Replace 'images' with the correct input name in your ONNX model
    const results = await session.run(feeds);
    

    // Log the entire results object to check its structure
    // console.log('Inference results:', results);

    
    // Check for outputs in the results
    if (!results || !Object.keys(results).length) {
        throw new Error('No output returned from the model.');
    }

    // Assuming your model returns multiple outputs, check what keys are available
    const outputKeys = Object.keys(results);
    console.log('Output keys:', outputKeys);

    // Check if the expected output exists
    const output = results['output0']; // Change 'output' if your model uses a different name

    if (!output) {
        throw new Error('Output from the model is missing.');
    }

    const boxes = output.data; // Access the data from the output tensor

    
    // Extract detection results and format for response
    const detections = postprocessResults(output); // Pass the raw boxes for processing


     const generatedImagePath = await generateImage(req.file.path, detections);
    console.log("Image generated at:", generatedImagePath);
     console.log("Image generated at:", generatedImagePath);


    res.json({ detections, generatedImagePath });
  } catch (error) {
    console.error('Inference error:', error);
    res.status(500).json({ error: 'Inference failed' });
  } finally {
    try {
        await fs.access(req.file.path);
        await fs.unlink(req.file.path);
    } catch (err) {
        console.error(`Error unlinking file: ${err}`);
    }
  }
});

module.exports = router;
