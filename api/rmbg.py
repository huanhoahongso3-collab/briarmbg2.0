from io import BytesIO
from gradio_client import Client

GRADIO_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/sc92z/"

def handler(request):
    """
    Vercel Python serverless handler.
    Must return: (bytes, status_code, headers)
    """
    try:
        # 1. Read raw binary data
        img_bytes = request.data
        if not img_bytes:
            return {"error": "No data received"}, 400

        # 2. Connect to BRIA-RMBG-1.4 Space
        client = Client(GRADIO_SPACE)

        # 3. Send image to /predict
        result_path = client.predict(BytesIO(img_bytes), api_name="/predict")

        if not isinstance(result_path, str):
            return {"error": "Unexpected result type", "result": str(result_path)}, 500

        # 4. Download output file
        output_buffer = BytesIO()
        client.download(result_path, output_buffer)
        output_buffer.seek(0)

        # 5. Return PNG bytes with proper header
        return output_buffer.getvalue(), 200, {"Content-Type": "image/png"}

    except Exception as e:
        return {"error": str(e)}, 500
