#!/usr/bin/env python3
"""
VisionCraft Web Server & API Proxy
Zero-dependency local HTTP development server for VS Code.
Runs on Python 3.x using standard library modules.
Includes optional local proxy to bypass browser adblockers/CORS for Gemini Vision API.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import urllib.request
import urllib.error

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # Local proxy endpoint for Gemini Vision API
        if self.path.startswith('/api/gemini'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                api_key = data.get('apiKey', '').strip()
                payload = data.get('payload', {})
                model = data.get('model', 'gemini-1.5-flash')

                if not api_key:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing API key'}).encode('utf-8'))
                    return

                if self.path.endswith('/models'):
                    target_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
                    req = urllib.request.Request(target_url, headers={'Content-Type': 'application/json'})
                else:
                    target_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                    req = urllib.request.Request(
                        target_url,
                        data=json.dumps(payload).encode('utf-8'),
                        headers={'Content-Type': 'application/json'}
                    )

                print(f"[VisionCraft Server] Calling Gemini Vision ({model})...")

                try:
                    with urllib.request.urlopen(req, timeout=40) as response:
                        res_data = response.read()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(res_data)
                        print("[VisionCraft Server] ✅ Gemini Response Received Successfully!")
                except urllib.error.HTTPError as e:
                    err_msg = e.read()
                    print(f"[VisionCraft Server] ❌ Gemini Error {e.code}: {err_msg.decode('utf-8', errors='ignore')[:250]}")
                    self.send_response(e.code)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(err_msg)
            except Exception as e:
                print(f"[VisionCraft Server] Gemini Proxy Exception: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        # Local proxy endpoint for Groq Vision API
        if self.path.startswith('/api/groq'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                api_key = data.get('apiKey', '').strip()
                payload = data.get('payload', {})

                if not api_key:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing API key'}).encode('utf-8'))
                    return

                if self.path.endswith('/models'):
                    target_url = "https://api.groq.com/openai/v1/models"
                    req = urllib.request.Request(
                        target_url,
                        headers={
                            'Authorization': f"Bearer {api_key}",
                            'Content-Type': 'application/json'
                        }
                    )
                else:
                    target_url = "https://api.groq.com/openai/v1/chat/completions"
                    req = urllib.request.Request(
                        target_url,
                        data=json.dumps(payload).encode('utf-8'),
                        headers={
                            'Authorization': f"Bearer {api_key}",
                            'Content-Type': 'application/json'
                        }
                    )

                print(f"[VisionCraft Server] Calling Groq Proxy ({target_url})...")

                try:
                    with urllib.request.urlopen(req, timeout=40) as response:
                        res_data = response.read()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(res_data)
                        print("[VisionCraft Server] ✅ Groq Response Received Successfully!")
                except urllib.error.HTTPError as e:
                    err_msg = e.read()
                    print(f"[VisionCraft Server] ❌ Groq Error {e.code}: {err_msg.decode('utf-8', errors='ignore')[:250]}")
                    self.send_response(e.code)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(err_msg)
            except Exception as e:
                print(f"[VisionCraft Server] Groq Proxy Exception: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        # Fallback to default
        super().do_POST()

def main():
    os.chdir(DIRECTORY)
    handler = CustomHTTPHandler
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("=" * 65)
            print("🚀 VisionCraft Studio Server is Running!")
            print(f"👉 Local URL: {url}")
            print(f"📁 Serving Directory: {DIRECTORY}")
            print("=" * 65)
            print("💡 In VS Code: Press Ctrl+C in this terminal to stop the server.")
            print("-" * 65)

            try:
                webbrowser.open(url)
            except Exception:
                pass

            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped successfully.")
        sys.exit(0)
    except OSError as e:
        print(f"\n❌ Error starting server: {e}")
        print(f"Tip: Port {PORT} might be occupied. Try closing other servers or modify the PORT variable in server.py.")
        sys.exit(1)

if __name__ == "__main__":
    main()
