const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "tmp/" });

if (!fs.existsSync("tmp")) fs.mkdirSync("tmp");

const HF_TOKEN = process.env.HF_TOKEN || "";
async function runHuggingFace(imagePath) {
  const resizedPath = imagePath + "_small.jpg";
  await sharp(imagePath)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(resizedPath);

  const imageBuffer = fs.readFileSync(resizedPath);
  try { fs.unlinkSync(resizedPath); } catch {}

  // 10 second timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-large",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    const responseText = await response.text();
    console.log("HF status:", response.status);

    if (!response.ok) {
      throw new Error(`HF error ${response.status}`);
    }

    const result = JSON.parse(responseText);
    if (Array.isArray(result) && result[0]?.generated_text) return result[0].generated_text;
    if (result.generated_text) return result.generated_text;
    throw new Error("Unexpected HF response");

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function preprocessImage(inputPath) {
  const outputPath = inputPath + "_processed.png";
  const metadata = await sharp(inputPath).metadata();
  const width = metadata.width || 800;
  const targetWidth = width < 2000 ? 2000 : width;

  await sharp(inputPath)
    .resize({ width: targetWidth, kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .normalise()
    .linear(1.5, -(128 * 1.5) + 128)
    .sharpen({ sigma: 2 })
    .median(1)
    .png({ compressionLevel: 0 })
    .toFile(outputPath);

  return outputPath;
}

async function runTesseract(imagePath) {
  console.log("Running Tesseract OCR...");
  const processedPath = await preprocessImage(imagePath);
  try {
    const result = await Tesseract.recognize(processedPath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\rTesseract progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.log("\nTesseract complete.");
    return result.data.text;
  } finally {
    try { fs.unlinkSync(processedPath); } catch {}
  }
}

app.post("/scan", upload.single("receipt"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  const filePath = req.file.path;
  let text = "";
  let method = "";

  try {
    try {
      console.log("Trying Hugging Face...");
      text = await runHuggingFace(filePath);
      method = "huggingface";
      console.log("✅ Hugging Face succeeded");
    } catch (hfErr) {
      console.log("⚠️ Hugging Face failed:", hfErr.message);
      console.log("Falling back to Tesseract...");
      text = await runTesseract(filePath);
      method = "tesseract";
      console.log("✅ Tesseract succeeded");
    }

    console.log("Method used:", method);
    console.log("Extracted text:", text);
    res.json({ success: true, text, method });

  } catch (err) {
    console.error("Both OCR methods failed:", err.message);
    res.status(500).json({ success: false, error: "OCR failed" });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`OCR service running on http://localhost:${PORT}`);
  console.log(`   Primary: Hugging Face`);
  console.log(`   Fallback: Tesseract.js`);
});