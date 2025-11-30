import { client } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false
  }
};

// Helper: read raw body from request
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // --- 1. Read image from curl --
    const buffer = await readRawBody(req);
    const blob = new Blob([buffer], { type: "image/png" });

    // --- 2. Connect to the Gradio replica ---
    const app = await client("https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/");

    // --- 3. Predict ---
    // Send image as the first element in array
    const result = await app.predict("/predict", [blob]);

    const output = result.data?.[0];

    if (!output) {
      return res.status(502).json({ error: "No output from Gradio Space", detail: result });
    }

    let imgBuffer;

    // Case A: data URL (data:image/png;base64,...)
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      imgBuffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // Case B: plain base64 string (rare)
    if (typeof output === "string" && /^[A-Za-z0-9+/=]+$/.test(output)) {
      imgBuffer = Buffer.from(output, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // Case C: unknown / object with url=null
    return res.status(500).json({
      error: "Cannot handle file object with url=null in JS client. Use Python client or return public URL.",
      output
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.toString() });
  }
}
