// generateImage.js
const sharp = require('sharp');

async function generateImage(imagePath, detections) {
    try {
        const image = sharp(imagePath);
        const { metadata } = await image.metadata();

        // Prepare overlays for bounding boxes
        const overlays = detections.map(detection => {
            const { x, y, width, height, confidence } = detection;

            // Log the detection properties to debug
            // console.log(`Bounding Box: x=${x}, y=${y}, width=${width}, height=${height}, confidence=${confidence}`);

            return {
                input: Buffer.from(
                    `<svg width="${width}" height="${height}">
                        <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(255, 0, 0, 0.5)" />
                        <text x="5" y="15" fill="white">Confidence: ${confidence.toFixed(2)}</text>
                    </svg>`
                ),
                top: y,
                left: x,
            };
        });

        // Generate the output image with bounding boxes
        const outputImagePath = `output_${Date.now()}.png`;
        await image
            .composite(overlays) // Overlay bounding boxes on the image
            .toFile(outputImagePath);

        return outputImagePath; // Return the path to the generated image
    } catch (error) {
        console.error("Image generation error:", error);
        throw new Error("Failed to generate image");
    }
}

module.exports = generateImage;
