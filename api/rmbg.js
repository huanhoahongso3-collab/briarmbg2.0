import { client as gradioClient } from "@gradio/client";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // --- 1. Collect uploaded image ---
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      const blob = new Blob([buffer], { type: "image/png" });

      // --- 2. Connect to Gradio Space ---
      const app = await gradioClient(
        "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
      );

      // --- 3. Send image to /predict ---
      const result = await app.predict("/predict", [blob]);

      // --- 4. Get the returned Blob/File ---
      const outputBlob = result.data[0]; // this is a Blob/File in Node.js
      const arrayBuffer = await outputBlob.arrayBuffer();
      const imgBuffer = Buffer.from(arrayBuffer);

      // --- 5. Return image ---
      res.setHeader("Content-Type", "image/png");
      res.send(imgBuffer);
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
