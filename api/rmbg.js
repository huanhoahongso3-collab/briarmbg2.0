import { client as gradioClient } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false, // disable built-in parser for raw binary
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // --- 1. Collect uploaded image ---
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      const blob = new Blob([buffer], { type: "image/png" });

      // --- 2. Connect to Gradio Space ---
      const app = await gradioClient(
        "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"
      );

      // --- 3. Send image to /predict endpoint ---
      const result = await app.predict("/predict", [blob]);

      // --- 4. The new API returns a base64 string ---
      const base64Data = result.data[0]; // output Image component
      const imgBuffer = Buffer.from(
        base64Data.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      // --- 5. Send image back to client ---
      res.setHeader("Content-Type", "image/png");
      res.send(imgBuffer);
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}
