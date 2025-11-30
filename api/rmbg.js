import { Client } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // --- 1. Read raw binary uploaded via curl ---
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);

      // Create a Blob because gradio client requires Blob/File/Buffer
      const blob = new Blob([buffer], { type: "image/png" });

      // --- 2. Connect to Gradio Space ---
      const client = await Client.connect("briaai/BRIA-RMBG-1.4");

      // --- 3. Send image to real server ---
      const result = await client.predict("/predict", {
        image: blob,
      });

      // result.data[1] is output file (PNG)
      const file = result.data[1];

      // --- 4. Download output from file.url ---
      const img = await fetch(file.url);
      const imgBuffer = Buffer.from(await img.arrayBuffer());

      // --- 5. Return image back to cURL client ---
      res.setHeader("Content-Type", "image/png");
      res.send(imgBuffer);
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}

