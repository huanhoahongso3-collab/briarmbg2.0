// import fetch from "node-fetch"; // if needed, otherwise Node 18+ has fetch built-in
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // --- 1. Prepare FormData ---
    const form = new FormData();
    form.append("data[]", buffer, {
      filename: "input.png",
      contentType: "image/png",
    });

    // --- 2. Send to Gradio predict ---
    const response = await fetch(
      "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/predict",
      {
        method: "POST",
        body: form,
      }
    );

    const json = await response.json();

    // --- 3. Get base64 output ---
    const base64 = json.data[0]; // should be 'data:image/png;base64,...'
    const imgBuffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");

    // --- 4. Send processed image ---
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}
