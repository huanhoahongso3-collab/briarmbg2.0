import { Client } from "@gradio/client";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const buffer = await getRawBody(req);
    const blob = new Blob([buffer], { type: "image/png" });

    // --- Connect to main Gradio Space URL ---
    const client = new Client("https://hf.space/embed/briaai/BRIA-RMBG-2.0");
    await client.ready?.();

    const result = await client.predict("/predict", { image: blob });
    const file = result.data[1];

    const imgResp = await fetch(file.url);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
