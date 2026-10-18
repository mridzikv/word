#!/usr/bin/env python3
"""Local test server for the WordCraft web build (PWA).

    python serve.py              -> http://localhost:8771/
    python serve.py 9000         -> another port
    python serve.py 8771 --lan   -> also reachable from other devices on the network

Service workers (offline + install) only run on https:// or http://localhost.
Over --lan with a plain http://192.168.x.x address the app runs, but it can't be
installed as a PWA from that device. Use Termux on the tablet itself, or an HTTPS host.
"""
import functools
import http.server
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
port = int(args[0]) if args else 8771
host = "0.0.0.0" if "--lan" in sys.argv else "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".js": "text/javascript",
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith(("/", ".html", "sw.js", ".webmanifest")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


server = http.server.ThreadingHTTPServer((host, port), functools.partial(Handler, directory=HERE))
print(f"WordCraft: http://localhost:{port}/   (sample document: http://localhost:{port}/?sample)")
if host == "0.0.0.0":
    print("LAN mode: other devices use http://<this-computer-ip>:%d/ (no PWA install over plain http)" % port)
print("Ctrl+C to stop.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
