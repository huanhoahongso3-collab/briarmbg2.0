import { client as gradioClient } from "@gradio/client";
import fs from "fs/promises";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // --- 1. Receive client image ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // --- 2. Save original image to /tmp ---
    const timestamp = Date.now();
    const inputPath = path.join("/tmp", `input_${timestamp}.png`);
    await fs.writeFile(inputPath, buffer);

    // --- 3. Send image to Gradio API ---
    const blob = new Blob([buffer], { type: "image/png" });
    const app = await gradioClient(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
    );

    const result = await app.predict("/predict", [blob]);

    // --- 4. Save processed image to /tmp ---
    const outputData = result.data[0];

    // In Node.js, @gradio/client may return either string (base64) or object with 'name' & 'buffer'
    let processedBuffer;

    if (typeof outputData === "string") {
      // base64 string
      processedBuffer = Buffer.from(
        outputData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
    } else if (outputData.buffer) {
      // Node.js Blob/File-like object
      processedBuffer = Buffer.from(outputData.buffer);
    } else {
      throw new Error("Unexpected output format from Gradio API");
    }

    const outputPath = path.join("/tmp", `output_${timestamp}.png`);
    await fs.writeFile(outputPath, processedBuffer);

    // --- 5. Return processed image to client ---
    res.setHeader("Content-Type", "image/png");
    res.send(processedBuffer);

    // --- 6. Clean up files (optional, but good practice) ---
    await fs.unlink(inputPath);
    await fs.unlink(outputPath);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
