from flask import Flask, request, send_file, jsonify
from io import BytesIO
from gradio_client import Client

app = Flask(__name__)

# BRIA-RMBG-1.4 Space
GRADIO_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"

@app.route("/api/rmbg", methods=["POST"])
def rmbg():
    if request.method != "POST":
        return jsonify({"error": "POST only"}), 405

    try:
        # --- 1. Read raw binary uploaded via curl ---
        img_bytes = request.data
        if not img_bytes:
            return jsonify({"error": "No data received"}), 400

        # --- 2. Connect to Gradio Space ---
        client = Client(GRADIO_SPACE)

        # --- 3. Send image to /predict ---
        # Wrapping bytes in BytesIO as gradio_client expects file-like or URL
        result = client.predict(BytesIO(img_bytes), api_name="/predict")

        # The result is a file path on the Space server
        if not isinstance(result, str):
            return jsonify({"error": "Unexpected result type", "result": str(result)}), 500

        # --- 4. Download output file from Space ---
        output_buffer = BytesIO()
        client.download(result, output_buffer)
        output_buffer.seek(0)

        # --- 5. Return the image to the client ---
        return send_file(output_buffer, mimetype="image/png", as_attachment=False)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# For local testing
if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
