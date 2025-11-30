from flask import Flask, request, send_file, jsonify
from io import BytesIO
from gradio_client import Client

app = Flask(__name__)

GRADIO_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"

@app.route("/api/rmbg", methods=["POST"])
def rmbg():
    if request.method != "POST":
        return jsonify({"error": "POST only"}), 405

    try:
        # --- 1. Read raw binary upload ---
        img_bytes = request.get_data()
        if not img_bytes:
            return jsonify({"error": "No data received"}), 400

        # --- 2. Connect to Gradio Space ---
        client = Client(GRADIO_SPACE)

        # --- 3. Send image to /predict ---
        result_path = client.predict(BytesIO(img_bytes), api_name="/predict")

        if not isinstance(result_path, str):
            return jsonify({"error": "Unexpected result type", "result": str(result_path)}), 500

        # --- 4. Download output from Space ---
        output_buffer = BytesIO()
        client.download(result_path, output_buffer)
        output_buffer.seek(0)

        # --- 5. Return PNG to client ---
        return send_file(output_buffer, mimetype="image/png", as_attachment=False)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
