import fetch from "node-fetch"; // or global fetch in Node 20+
import FormData from "form-data";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // --- Create multipart form data ---
    const form = new FormData();
    form.append("data", buffer, { filename: "input.png", contentType: "image/png" });

    // --- Send request to Gradio Space directly ---
    const response = await fetch(
      "https://briaai-bria-rmbg-1-4.hf.space/--api/predict/",
      {
        method: "POST",
        body: form
      }
    );

    const json = await response.json();

    // Check the returned data
    const output = json?.data?.[0];

    if (!output) return res.status(502).json({ error: "No output", json });

    // If output is a data URL
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      const imgBuffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // If output is a plain base64 string
    if (typeof output === "string" && /^[A-Za-z0-9+/=]+$/.test(output)) {
      const imgBuffer = Buffer.from(output, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(imgBuffer);
    }

    // Otherwise, return JSON for debugging
    return res.status(500).json({ error: "Cannot handle output", output });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.toString() });
  }
}
