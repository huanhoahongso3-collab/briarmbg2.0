export const config = {
  api: {
    bodyParser: false, // disable default body parsing for binary uploads
  },
};

// Helper to read raw request body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // --- 1. Read raw image from request ---
    const buffer = await getRawBody(req);

    // --- 2. Prepare FormData for Gradio API ---
    const formData = new FormData();
    formData.append("data", new Blob([buffer], { type: "image/png" }));

    // --- 3. Send request to the main Gradio Space API ---
    const response = await fetch(
      "https://hf.space/embed/briaai/BRIA-RMBG-2.0/api/predict/",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Gradio API returned ${response.status}`);
    }

    const result = await response.json();

    // --- 4. The output file is usually in result.data[1] ---
    const file = result.data[1];
    if (!file?.name && !file?.url) {
      throw new Error("No output file returned from Gradio Space");
    }

    // --- 5. Download the resulting image ---
    const imgResp = await fetch(file.url);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    // --- 6. Return image ---
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
