const ort = require("onnxruntime-node");
const express = require('express');
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const multer = require("multer");
const { createCanvas, loadImage } = require('canvas');

const router = express.Router();

// Set up multer for file uploads
const upload = multer({ dest: 'src/uploads/' });

const framesDir = path.join(__dirname, 'frames');



// Set up ffmpeg static path
ffmpeg.setFfmpegPath(require("ffmpeg-static"));

const FRAME_SKIP = 5;  // Process every 5th frame


// Video upload directory
const UPLOAD_DIR = "src/uploads/";

router.post('/', upload.single('video'), (req, res) => {
    
    // Check if file exists
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }


    const videoPath = path.join(UPLOAD_DIR, req.file.filename);
    
    const publicDir = path.join(__dirname, 'public');

    // Create frames directory if it doesn't exist
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir);
    }

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    // Extract frames from video
    ffmpeg(videoPath)
        .on('end', async () => {
            console.log("Frame extraction complete.");
            const frames = fs.readdirSync(framesDir);
            const results = [];
            const annotatedFrames = [];

            for (let i = 0; i < frames.length; i += FRAME_SKIP) {
                const framePath = path.join(framesDir, frames[i]);
                try {
                    const detection = await detect_objects_on_image(framePath);
                    console.log("detection: ", detection);
                    results.push({ frame: frames[i], detection });

                    const annotatedFramePath = await annotateFrame(framePath, detection, i);
                    annotatedFrames.push(annotatedFramePath);

                } catch (error) {
                    console.error(`Error processing frame ${frames[i]}:`, error);
                }
            }

            
            // Path to save the output video in an accessible location
            const outputVideoPath = path.join(publicDir, 'output_with_bboxes.mp4');

            // Recompile the annotated frames into a video
            ffmpeg()
                .input(path.join(framesDir, 'annotated_frame_%04d.png'))
                .inputFPS(30)
                .outputFPS(30)
                .output(outputVideoPath)
                .on('end', () => {
                    console.log('Video recompiled successfully.');
                    // Send the annotated video path and bounding box data in the API response
                    res.json({
                        data: 
                        {
                            videoPath: outputVideoPath,
                            boundingBoxes: results
                        }
                        
                    });

                    // Clean up extracted frames after response
                    frames.forEach(frame => fs.unlinkSync(path.join(framesDir, frame)));
                    fs.unlinkSync(videoPath);
                })
                .on('error', err => {
                    console.error('Error reassembling video:', err);
                    res.status(500).json({ error: 'Video reassembly failed' });
                })
                .run();



            // for (const frame of frames) {
            //     const framePath = path.join(framesDir, frame);
            //     const detection = await detect_objects_on_image(framePath);
            //     console.log("detection: ", detection);
            //     results.push(detection);
            // }

            
            
            
            
        })
        .on('error', err => {
            console.error('Error processing video:', err);
            res.status(500).json({ error: 'Video processing failed' });
        })
        .save(path.join(framesDir, 'frame_%04d.png')); // Saves each frame
});

// Object detection function for each frame (reuse infer.js code where possible)
async function detect_objects_on_image(framePath) {
    const [input, img_width, img_height] = await prepare_input(framePath);
    const output = await run_model(input);
    return process_output(output, img_width, img_height);
}

// Use functions from infer.js or adapt code here for prepare_input, run_model, and process_output

async function prepare_input(buf) {
    const img = sharp(buf);
    const md = await img.metadata();
    const [img_width,img_height] = [md.width, md.height];
    const pixels = await img.removeAlpha()
        .resize({width:640,height:640,fit:'fill'})
        .raw()
        .toBuffer();

    const red = [], green = [], blue = [];
    for (let index=0; index<pixels.length; index+=3) {
        red.push(pixels[index]/255.0);
        green.push(pixels[index+1]/255.0);
        blue.push(pixels[index+2]/255.0);
    }

    const input = [...red, ...green, ...blue];
    return [input, img_width, img_height];
}

async function run_model(input) {
    const model = await ort.InferenceSession.create("src/best_coco_10ep.onnx");
    input = new ort.Tensor(Float32Array.from(input),[1, 3, 640, 640]);
    const outputs = await model.run({images:input});
    return outputs["output0"].data;
}

async function process_output(output, img_width, img_height) {


    let boxes = [];
    for (let index=0;index<8400;index++) {
        const [class_id,prob] = [...Array(80).keys()]
            .map(col => [col, output[8400*(col+4)+index]])
            .reduce((accum, item) => item[1]>accum[1] ? item : accum,[0,0]);
        if (prob < 0.5) {
            continue;
        }
        const label = yolo_classes[class_id];
        const xc = output[index];
        const yc = output[8400+index];
        const w = output[2*8400+index];
        const h = output[3*8400+index];
        const x1 = (xc-w/2)/640*img_width;
        const y1 = (yc-h/2)/640*img_height;
        const x2 = (xc+w/2)/640*img_width;
        const y2 = (yc+h/2)/640*img_height;
        boxes.push([x1,y1,x2,y2,label,prob]);
    }


    boxes = boxes.sort((box1,box2) => box2[5]-box1[5])
    const result = [];
    while (boxes.length>0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0],box)<0.7);
    }


    return result;
}


function iou(box1,box2) {
    return intersection(box1,box2)/union(box1,box2);
}

function union(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const box1_area = (box1_x2-box1_x1)*(box1_y2-box1_y1)
    const box2_area = (box2_x2-box2_x1)*(box2_y2-box2_y1)
    return box1_area + box2_area - intersection(box1,box2)
}

function intersection(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const x1 = Math.max(box1_x1,box2_x1);
    const y1 = Math.max(box1_y1,box2_y1);
    const x2 = Math.min(box1_x2,box2_x2);
    const y2 = Math.min(box1_y2,box2_y2);
    return (x2-x1)*(y2-y1)
}

const yolo_classes = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse',
    'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase',
    'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
    'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant',
    'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
    'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];


// Annotate each frame with bounding boxes, class names, and confidence values
async function annotateFrame(framePath, detections, frameNumber) {
    const image = await loadImage(framePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    detections.forEach(([x1, y1, x2, y2, label, confidence]) => {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        const text = `${label} (${(confidence * 100).toFixed(1)}%)`;
        ctx.fillText(text, x1, y1 - 5);
    });

    const outputFramePath = path.join(framesDir, `annotated_frame_${String(frameNumber).padStart(4, '0')}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFramePath, buffer);

    return outputFramePath;
}


module.exports = router;
