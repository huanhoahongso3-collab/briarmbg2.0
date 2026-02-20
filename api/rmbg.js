import { Client } from "@gradio/client";

export const config = {
  api: {
    bodyParser: false // Essential for handling raw binary image uploads
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1. Capture the raw stream from the request
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    if (buffer.length === 0) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // 2. Connect to the newer RMBG 2.0 Space
    const client = await Client.connect("briaai/BRIA-RMBG-2.0");

    // 3. Convert Buffer to Blob for the Gradio Client
    const blob = new Blob([buffer], { type: "image/png" });

    // 4. Predict
    // Note: BRIA 2.0 typically uses the /predict endpoint with an image input
    const result = await client.predict("/image", {
      image: blob,
    });

    // 5. Check the result structure
    // Result data from this model usually contains an object with a URL for the processed image
    const outputImage = result.data[0]; 

    if (outputImage && outputImage.url) {
      // 6. Fetch the processed image from Hugging Face storage
      const imgRes = await fetch(outputImage.url);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      // 7. Stream back to user
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(imgBuffer);
    } else {
      throw new Error("No image returned from model.");
    }

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to process image.", detail: error.message });
  }
}
