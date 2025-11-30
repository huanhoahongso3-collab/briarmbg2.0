import { client } from "@gradio/client";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // 1. Read raw image data
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // 2. Convert to Blob
    const blob = new Blob([buffer], { type: "image/png" });

    // 3. Connect to the Gradio replica
    const app = await client("https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/");

    // 4. Send image via predict
    const result = await app.predict("/predict", [blob]);

    const output = result?.data?.[0];
    if (!output) return res.status(500).json({ error: "No output", result });

    let imgBuffer;

    // 5A. Data URL
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      imgBuffer = Buffer.from(base64, "base64");
    }
    // 5B. Raw base64 string
    else if (typeof output === "string") {
      imgBuffer = Buffer.from(output, "base64");
    }
    // 5C. Unexpected
    else {
      return res.status(500).json({ error: "Unknown output type", output });
    }

    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
