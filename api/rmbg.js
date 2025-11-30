export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // --- 1. Read raw body ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // --- 2. Use native FormData ---
    const form = new FormData();
    form.append("data", buffer, { filename: "input.png", contentType: "image/png" });

    // --- 3. Send request directly to Gradio Space ---
    const response = await fetch(
      "https://briaai-bria-rmbg-1-4.hf.space/--api/predict/",
      {
        method: "POST",
        body: form
      }
    );

    const json = await response.json();
    const output = json?.data?.[0];

    if (!output) return res.status(502).json({ error: "No output", json });

    // --- 4. Handle data URL output ---
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      const imgBuffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // --- 5. Handle plain base64 string output ---
    if (typeof output === "string" && /^[A-Za-z0-9+/=]+$/.test(output)) {
      const imgBuffer = Buffer.from(output, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // --- 6. Fallback for unsupported output ---
    return res.status(500).json({ error: "Cannot handle output", output });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.toString() });
  }
}
