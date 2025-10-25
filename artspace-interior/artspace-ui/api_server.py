"""
NeRF API Server
Flask-based REST API for training and rendering NeRF models
"""

import os
import sys
import json
import subprocess
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time
import threading
from pathlib import Path

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://152.42.97.192:3000", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    },
    r"/health": {"origins": "*"}
})  # Enable CORS for Next.js frontend

# Configuration
UPLOAD_FOLDER = Path('./data/user_uploads')
OUTPUT_FOLDER = Path('./logs/renders')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

# Track training jobs
training_jobs = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'nerf-api',
        'version': '1.0.0'
    })


@app.route('/api/upload-images', methods=['POST'])
def upload_images():
    """
    Upload multiple images for NeRF training
    Expects: multipart/form-data with 'images' files
    """
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    
    if len(files) < 10:
        return jsonify({'error': 'Please upload at least 10 images for NeRF training'}), 400
    
    # Create unique session ID
    session_id = f"session_{int(time.time())}"
    session_folder = UPLOAD_FOLDER / session_id / 'images'
    session_folder.mkdir(parents=True, exist_ok=True)
    
    uploaded_files = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = session_folder / filename
            file.save(str(filepath))
            uploaded_files.append(filename)
    
    return jsonify({
        'session_id': session_id,
        'uploaded_count': len(uploaded_files),
        'files': uploaded_files
    })


@app.route('/api/train', methods=['POST'])
def start_training():
    """
    Start NeRF training on uploaded images
    Expects JSON: { "session_id": "session_xxx", "config": {...} }
    """
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400
    
    session_folder = UPLOAD_FOLDER / session_id
    if not session_folder.exists():
        return jsonify({'error': 'Session not found'}), 404
    
    # Create custom config for this session
    config_path = session_folder / 'config.txt'
    
    # Use default config as template
    with open('config_fern.txt', 'r') as f:
        config_content = f.read()
    
    # Modify for user session
    config_content = config_content.replace(
        'basedir = ./data/nerf_llff_data/fern',
        f'basedir = {session_folder}'
    )
    config_content = config_content.replace(
        'expname = fern_test',
        f'expname = {session_id}'
    )
    
    with open(config_path, 'w') as f:
        f.write(config_content)
    
    # Start training in background thread
    job_id = f"job_{int(time.time())}"
    
    def run_training():
        training_jobs[job_id] = {
            'status': 'running',
            'session_id': session_id,
            'start_time': time.time(),
            'progress': 0
        }
        
        try:
            # Get conda base and construct proper activation command
            conda_base = '/opt/pub/apps/generic/Miniconda3/24.3.0-0'
            conda_sh = f'{conda_base}/etc/profile.d/conda.sh'
            
            # Run NeRF training with proper conda activation
            cmd = f"""
source {conda_sh}
conda activate nerf
unset PYTHONPATH
cd {os.path.dirname(os.path.abspath(__file__))}
python run_nerf.py --config {config_path}
"""
            process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                executable='/bin/bash'
            )
            
            stdout, stderr = process.communicate()
            
            if process.returncode == 0:
                training_jobs[job_id]['status'] = 'completed'
                training_jobs[job_id]['progress'] = 100
            else:
                training_jobs[job_id]['status'] = 'failed'
                training_jobs[job_id]['error'] = stderr.decode()
        except Exception as e:
            training_jobs[job_id]['status'] = 'failed'
            training_jobs[job_id]['error'] = str(e)
        
        training_jobs[job_id]['end_time'] = time.time()
    
    thread = threading.Thread(target=run_training)
    thread.start()
    
    return jsonify({
        'job_id': job_id,
        'session_id': session_id,
        'status': 'started'
    })


@app.route('/api/training-status/<job_id>', methods=['GET'])
def get_training_status(job_id):
    """Get training job status"""
    if job_id not in training_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify(training_jobs[job_id])


@app.route('/api/render', methods=['POST'])
def render_view():
    """
    Render a novel view from trained NeRF model
    Expects JSON: { "session_id": "session_xxx", "camera_pose": {...} }
    """
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400
    
    # TODO: Implement novel view rendering
    # This would call the NeRF rendering function with custom camera poses
    
    return jsonify({
        'message': 'Rendering not yet implemented',
        'session_id': session_id
    })


@app.route('/api/get-render/<session_id>/<filename>', methods=['GET'])
def get_rendered_image(session_id, filename):
    """Retrieve a rendered image"""
    image_path = OUTPUT_FOLDER / session_id / filename
    
    if not image_path.exists():
        return jsonify({'error': 'Image not found'}), 404
    
    return send_file(str(image_path), mimetype='image/png')


@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    """List all available sessions"""
    sessions = []
    for session_dir in UPLOAD_FOLDER.iterdir():
        if session_dir.is_dir():
            sessions.append({
                'session_id': session_dir.name,
                'created': session_dir.stat().st_ctime
            })
    
    return jsonify({'sessions': sessions})


if __name__ == '__main__':
    print("Starting NeRF API Server...")
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Output folder: {OUTPUT_FOLDER.absolute()}")
    app.run(host='0.0.0.0', port=5000, debug=True)
