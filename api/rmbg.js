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
      const blob = new Blob([buffer], { type: "image/png" });

      // --- 2. Connect to Gradio Space ---
      const client = await Client.connect(
        "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
      );

      // --- 3. Send image to /predict ---
      const result = await client.predict("/predict", [blob]);

      const output = result.data?.[0];
      if (!output) {
        return res.status(502).json({ error: "No output from Gradio Space", detail: result });
      }

      let imgBuffer;

      // --- 4. If Gradio returns a file object, use client.download() ---
      if (typeof output === "object" && output.path) {
        imgBuffer = Buffer.from(await client.download(output.path));
        res.setHeader("Content-Type", "image/png");
        return res.send(imgBuffer);
      }

      // --- 5. Fallback for data URL string (rare) ---
      if (typeof output === "string" && output.startsWith("data:image")) {
        const base64 = output.split(",")[1];
        imgBuffer = Buffer.from(base64, "base64");
        res.setHeader("Content-Type", "image/png");
        return res.send(imgBuffer);
      }

      // --- 6. Unknown format fallback ---
      return res.status(500).json({ error: "Unknown output format", output });
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}
