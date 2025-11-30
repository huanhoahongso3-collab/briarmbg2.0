// api/rmbg.js
import { client } from "@gradio/client";
import { fetch as undiciFetch } from "undici"; // optional, but safer for Node 20 on Vercel

export const config = {
  api: {
    bodyParser: false
  }
};

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
    res.status(405).json({ error: "POST only" });
    return;
  }

  try {
    // 1) read binary from curl --data-binary
    const buffer = await readRawBody(req);

    // create a Blob for gradio client (works in Node >= 18)
    const blob = new Blob([buffer], { type: "image/png" });

    // 2) connect to the exact replica URL you provided
    const app = await client("https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/");

    // 3) call /predict with the image blob as position 0 input (array)
    const result = await app.predict("/predict", [blob]);

    // 4) result.data[0] is expected to be a string (per your Return Type)
    const out = result?.data?.[0];

    if (!out) {
      console.error("No output from Gradio:", result);
      return res.status(502).json({ error: "No output from Gradio Space", detail: result });
    }

    let finalBuffer;
    // Case A: data URL (data:image/png;base64,...)
    if (typeof out === "string" && out.startsWith("data:")) {
      const parts = out.split(",");
      const meta = parts[0]; // e.g. data:image/png;base64
      const b64 = parts[1] || "";
      finalBuffer = Buffer.from(b64, "base64");
      // set content-type from meta if possible
      const mime = meta.split(";")[0].split(":")[1] || "image/png";
      res.setHeader("Content-Type", mime);
      return res.send(finalBuffer);
    }

    // Case B: plain base64 string (no data: prefix)
    if (typeof out === "string" && /^[A-Za-z0-9+/=]+$/.test(out)) {
      finalBuffer = Buffer.from(out, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(finalBuffer);
    }

    // Case C: it's an object with a url field or an HTTP(S) url string
    if (typeof out === "object" && out.url) {
      const dl = await undiciFetch(out.url);
      if (!dl.ok) throw new Error(`Failed to download output: ${dl.status}`);
      const arr = await dl.arrayBuffer();
      finalBuffer = Buffer.from(arr);
      res.setHeader("Content-Type", dl.headers.get("content-type") || "image/png");
      return res.send(finalBuffer);
    }

    if (typeof out === "string" && (out.startsWith("http://") || out.startsWith("https://"))) {
      const dl = await undiciFetch(out);
      if (!dl.ok) throw new Error(`Failed to download output: ${dl.status}`);
      const arr = await dl.arrayBuffer();
      finalBuffer = Buffer.from(arr);
      res.setHeader("Content-Type", dl.headers.get("content-type") || "image/png");
      return res.send(finalBuffer);
    }

    // Unknown format fallback: return JSON for debugging
    console.error("Unknown output format:", out);
    return res.status(500).json({ error: "Unknown output format from Gradio Space", output: out });

  } catch (err) {
    console.error("Handler error:", err);
    // Return text/plain for easier debugging via curl
    res.status(500).json({ error: err?.toString?.() ?? String(err) });
  }
}
