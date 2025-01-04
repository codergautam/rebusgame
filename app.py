from flask import Flask, render_template, send_from_directory
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/puzzles')
def puzzles():
    return render_template('puzzles.html')

@app.route('/puzzles/<path:filename>')
def serve_puzzle(filename):
    return send_from_directory('puzzles', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
