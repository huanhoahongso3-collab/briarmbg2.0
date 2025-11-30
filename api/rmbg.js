import { client as gradioClient } from "@gradio/client";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // --- 1. Receive client image ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk); // modern async iteration
    const buffer = Buffer.concat(chunks);

    // “Save” original in memory (just keeping buffer)
    const originalImage = buffer;

    // --- 2. Send image to Gradio API ---
    const blob = new Blob([originalImage], { type: "image/png" });
    const app = await gradioClient(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
    );

    const result = await app.predict("/predict", [blob]);

    // --- 3. Download processed image ---
    const outputBlob = result.data[0]; // Blob/File in Node.js
    const arrayBuffer = await outputBlob.arrayBuffer();
    const processedImage = Buffer.from(arrayBuffer);

    // --- 4. Return processed image to client ---
    res.setHeader("Content-Type", "image/png");
    res.send(processedImage);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
