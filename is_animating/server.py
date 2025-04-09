import http.server
import socketserver
import webbrowser
import os
from pathlib import Path
import time

# Create necessary directories
Path("models").mkdir(exist_ok=True)
Path("js").mkdir(exist_ok=True)

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()
    
    def log_message(self, format, *args):
        print(f"{self.log_date_time_string()} - {self.address_string()} - {format % args}")

print(f"Starting server in directory: {DIRECTORY}")
print(f"Server will be available at http://localhost:{PORT}")
print("Place your model files in the 'models' directory")
print("Press Ctrl+C to stop the server")

# Create server with specified handler
with socketserver.TCPServer(("", PORT), MyHttpRequestHandler) as httpd:
    print(f"Server started successfully. Opening browser...")
    
    # Wait a moment for the server to start
    time.sleep(1)
    
    # Open browser automatically
    try:
        webbrowser.open(f'http://localhost:{PORT}')
    except:
        print(f"Could not open browser automatically. Please navigate to http://localhost:{PORT}")
    
    # Keep server running
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.") 