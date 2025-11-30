// OLD:
// import { Client } from "@gradio/client";
// NEW:
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
    // --- 1. Read binary body (curl --data-binary) ---
    const chunks = [];
    req.on("data", c => chunks.push(c));

    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);

      // Convert to Blob for Gradio client
      const blob = new Blob([buffer], { type: "image/png" });

      // --- 2. Connect using new API syntax ---
      const app = await client(
        "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
      );

      // --- 3. Call the /predict endpoint (new params format) ---
      const result = await app.predict("/predict", [
        blob   // 'image' Image input
      ]);

      // result.data is an array of outputs
      // result.data[0] → output image (base64 or blob)
      // result.data[1] → sometimes file object (depends on Space)

      const output = result.data[0];

      // The output may come as:
      // - a direct Blob
      // - {url: "..."} file reference
      // - base64 string

      let bufferOut;

      if (output instanceof Blob) {
        // Direct Blob output
        bufferOut = Buffer.from(await output.arrayBuffer());
      } else if (output.url) {
        // File-like object { url: "…" }
        const dl = await fetch(output.url);
        bufferOut = Buffer.from(await dl.arrayBuffer());
      } else if (typeof output === "string" && output.startsWith("data:image")) {
        // Base64 data URL
        const base64 = output.split(",")[1];
        bufferOut = Buffer.from(base64, "base64");
      } else {
        return res
          .status(500)
          .json({ error: "Unknown output format from Gradio Space" });
      }

      // --- 4. Send PNG back to cURL client ---
      res.setHeader("Content-Type", "image/png");
      res.send(bufferOut);
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.toString() });
  }
}
