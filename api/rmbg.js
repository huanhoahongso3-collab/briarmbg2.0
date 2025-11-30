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

      // --- 2. Connect to the new Gradio Space ---
      const client = await Client.connect(
        "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
      );

      // --- 3. Send image to the /predict endpoint ---
      const result = await client.predict("/predict", [blob]);

      // --- 4. Handle output ---
      // result.data[0] is expected to be a string (data URL)
      const output = result.data?.[0];
      if (!output) {
        return res.status(502).json({ error: "No output from Gradio Space", detail: result });
      }

      let imgBuffer;
      if (typeof output === "string" && output.startsWith("data:image")) {
        // base64 data URL
        const base64 = output.split(",")[1];
        imgBuffer = Buffer.from(base64, "base64");
        res.setHeader("Content-Type", "image/png");
      } else {
        // fallback
        return res.status(500).json({ error: "Unknown output format", output });
      }

      // --- 5. Return image back to cURL client ---
      res.send(imgBuffer);
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}
