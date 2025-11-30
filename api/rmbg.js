import { client } from "@gradio/client";

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
    // 1. Read raw binary body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // 2. Convert to Blob (required by Gradio JS client)
    const blob = new Blob([buffer], { type: "image/png" });

    // 3. Connect to BRIA RMBG 1.4 endpoint
    const app = await client(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
    );

    // 4. Send image via the official Gradio JS format
    const result = await app.predict("/predict", [
      blob // image in Image component
    ]);

    const output = result?.data?.[0];

    if (!output) {
      return res.status(500).json({ error: "Model returned no output", raw: result });
    }

    // 5A. If output is data:image/png;base64,decode it
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      const imgBuffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // 5B. If output is pure base64 string
    if (typeof output === "string") {
      const imgBuffer = Buffer.from(output, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // 5C. If output is file object with NO url => the Space is misconfigured
    if (output.url === null) {
      return res.status(500).json({
        error:
          "BRIA RMBG 1.4 Space returned a file object with url=null (cannot be downloaded in JS client). This is a limitation of the Space.",
        output
      });
    }

    // 5D. If output.url exists, download it
    const imgResp = await fetch(output.url);
    const arr = Buffer.from(await imgResp.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    return res.send(arr);

  } catch (e) {
    console.error("API ERROR:", e);
    return res.status(500).json({ error: e.toString() });
  }
}
