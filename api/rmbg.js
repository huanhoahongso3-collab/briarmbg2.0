import { client as gradioClient } from "@gradio/client";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

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

    // --- 4. Get the URL of processed image ---
    const outputFile = result.data[0]; // { name: 'output.png', url: 'https://...' }
    if (!outputFile?.url) throw new Error("No URL returned from Gradio API");

    // --- 5. Download processed image ---
    const response = await fetch(outputFile.url);
    const processedBuffer = Buffer.from(await response.arrayBuffer());

    // Save processed image to /tmp (optional)
    const outputPath = path.join("/tmp", `output_${timestamp}.png`);
    await fs.writeFile(outputPath, processedBuffer);

    // --- 6. Send processed image back to client ---
    res.setHeader("Content-Type", "image/png");
    res.send(processedBuffer);

    // --- 7. Clean up ---
    await fs.unlink(inputPath);
    await fs.unlink(outputPath);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
