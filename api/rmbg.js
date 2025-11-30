import { client as gradioClient } from "@gradio/client";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // --- 1. Receive client image ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // --- 2. Connect to Gradio API ---
    const blob = new Blob([buffer], { type: "image/png" });
    const app = await gradioClient(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
    );

    // --- 3. Send image to /predict endpoint ---
    const result = await app.predict("/predict", [blob]);

    // --- 4. Handle output ---
    const output = result.data[0];

    let processedBuffer;

    if (typeof output === "string") {
      // base64 string (some environments)
      processedBuffer = Buffer.from(
        output.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
    } else if (output instanceof Blob) {
      // Blob-like (Node.js)
      const arrayBuffer = await output.arrayBuffer();
      processedBuffer = Buffer.from(arrayBuffer);
    } else if (output.buffer) {
      // Node.js File object
      processedBuffer = Buffer.from(output.buffer);
    } else {
      throw new Error("Unexpected output format from Gradio API");
    }

    // --- 5. Return processed image ---
    res.setHeader("Content-Type", "image/png");
    res.send(processedBuffer);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
