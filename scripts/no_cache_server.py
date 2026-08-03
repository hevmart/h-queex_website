#!/usr/bin/env python3
"""Simple static file server with no-cache headers for local development."""

from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    """Serve files while instructing the browser to always revalidate."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


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
