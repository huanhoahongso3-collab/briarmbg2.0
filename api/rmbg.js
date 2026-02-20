import { Client } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false // Required to handle raw binary data via cURL
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  try {
    // 1. Collect the raw binary data from the request stream
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    if (buffer.length === 0) {
      return res.status(400).json({ error: "No image data received" });
    }

    // 2. Connect to the specific v1.4 replica
    const app = await Client.connect("https://briaai-bria-rmbg-1-4.hf.space/--replicas/bpgvg/");

    // 3. Convert Buffer to Blob (Gradio v1.4 expectation)
    const imageBlob = new Blob([buffer], { type: "image/png" });

    // 4. Call the /predict endpoint with the positional array
    const result = await app.predict("/predict", [
      imageBlob, 
    ]);

    // 5. Handle the output (v1.4 returns the file object in data[0])
    const outputData = result.data[0];

    if (outputData && outputData.url) {
      // 6. Fetch the result from the Gradio temporary storage
      const imageResponse = await fetch(outputData.url);
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const finalBuffer = Buffer.from(imageArrayBuffer);

      // 7. Send the binary image back to the user
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(finalBuffer);
    } else {
      throw new Error("Model failed to return an image URL.");
    }

  } catch (err) {
    console.error("Gradio v1.4 Error:", err);
    res.status(500).json({ 
      error: "Background removal failed", 
      message: err.message 
    });
  }
}
