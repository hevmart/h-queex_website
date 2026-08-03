#!/usr/bin/env python3
"""Simple static file server with no-cache headers for local development."""

from __future__ import annotations

import argparse
import functools
import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    """Serve files while instructing the browser to always revalidate."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/save-content":
            self.send_error(404, "Not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body or "{}")
            values = payload.get("values")
            if not isinstance(values, dict):
                raise ValueError("Expected a JSON object with a values property.")

            project_root = Path(self.directory or ".")
            content_model_path = project_root / "content-model.json"

            if not content_model_path.exists():
                content_model_path.write_text('{\n  "values": {}\n}\n', encoding="utf-8")

            with content_model_path.open("r", encoding="utf-8") as handle:
                content_model = json.load(handle)

            if not isinstance(content_model, dict):
                content_model = {}

            existing_values = content_model.get("values")
            if not isinstance(existing_values, dict):
                existing_values = {}

            existing_values.update(values)
            content_model["values"] = existing_values

            with content_model_path.open("w", encoding="utf-8") as handle:
                json.dump(content_model, handle, indent=2)
                handle.write("\n")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "saved": len(values)}).encode("utf-8"))
        except Exception as exc:  # pragma: no cover - defensive server error handling
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a no-cache static file server.")
    parser.add_argument("--port", type=int, default=5500, help="Port to listen on.")
    parser.add_argument(
        "--directory",
        default=".",
        help="Directory to serve static files from.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    handler = functools.partial(NoCacheRequestHandler, directory=args.directory)
    server = ThreadingHTTPServer(("", args.port), handler)

    print(f"Serving {args.directory} at http://localhost:{args.port} (cache disabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
