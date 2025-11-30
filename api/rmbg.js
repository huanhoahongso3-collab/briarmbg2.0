import Client from "@gradio/client";

// Disable body parsing for binary upload
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

    // --- 2. Convert buffer to Blob (Gradio requires Blob/File/Buffer) ---
    const blob = new Blob([buffer], { type: "image/png" });

    // --- 3. Connect to Gradio Space ---
    const client = await Client.connect(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
    );

    // --- 4. Send image to Gradio for background removal ---
    const result = await client.predict("/predict", {
      image: blob,
    });

    // --- 5. Get output file (PNG) ---
    const file = result.data[1];

    // --- 6. Download output from file.url ---
    const imgResp = await fetch(file.url);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    // --- 7. Return image to cURL client ---
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
