from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv('PORT', 5000))

@app.route('/')
def home():
    return jsonify({
        'message': 'Agent Service is running',
        'status': 'healthy'
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'agent'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
