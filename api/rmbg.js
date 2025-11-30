import { Client } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw request body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // --- 1. Read raw binary uploaded via curl ---
    const buffer = await getRawBody(req);

    // --- 2. Convert buffer to Blob ---
    const blob = new Blob([buffer], { type: "image/png" });

    // --- 3. Instantiate Gradio Client ---
    const client = new Client("https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/");
    await client.ready?.();

    // --- 4. Send image to Gradio ---
    const result = await client.predict("/predict", { image: blob });

    // --- 5. Get output file ---
    const file = result.data[1];

    // --- 6. Download output ---
    const imgResp = await fetch(file.url);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    // --- 7. Return image ---
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
