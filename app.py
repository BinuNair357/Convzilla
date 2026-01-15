import os
import traceback
from flask import Flask, render_template, request, send_file, jsonify, after_this_request
from werkzeug.utils import secure_filename
from converter import convert_file

app = Flask(__name__)

# Configure upload and output folders
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'converted'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        files = request.files.getlist('file')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        target_format = request.form.get('format')
        if not target_format:
            return jsonify({'error': 'Target format not specified'}), 400

        input_paths = []
        base_filename = "converted_result"

        # Save uploaded files
        for i, file in enumerate(files):
            if file and file.filename:
                # Use first file's name as base for output
                if i == 0:
                    base_filename = os.path.splitext(secure_filename(file.filename))[0]
                
                filename = secure_filename(file.filename)
                # Avoid collision if uploading same file multiple times? 
                # For simplicity, we just save them. If dupes, they overwrite or need handling.
                # Adding index to ensure uniqueness for this batch processing could be safer but user might want exact names.
                # Let's keep it simple: assume different names or overwrite is fine for temp processing.
                input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(input_path)
                input_paths.append(input_path)

        if not input_paths:
             return jsonify({'error': 'No valid files saved'}), 400

        # Determine output filename
        output_filename = f"{base_filename}.{target_format}"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)

        # Perform conversion
        convert_file(input_paths, output_path, target_format)

        # Cleanup Input Files immediately
        for p in input_paths:
             try:
                 os.remove(p)
             except OSError:
                 pass

        # Return the converted file
        # Note: We cannot easily delete the output file *after* sending it with send_file unless we use a background task or stream it.
        # For this local app, we will leave output files in 'converted' folder for user reference or manual cleanup.
        # Alternatively, use after_this_request.
        
        @after_this_request
        def remove_file(response):
            try:
                os.remove(output_path)
            except Exception as error:
                app.logger.error("Error removing or closing downloaded file handle", error)
            return response

        return send_file(output_path, as_attachment=True, download_name=output_filename)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # SECURITY: Disable debug mode for production/distribution
    app.run(debug=False, port=5000)
