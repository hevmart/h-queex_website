#!/usr/bin/env python3
"""Simple static file server with no-cache headers for local development."""

from __future__ import annotations

import argparse
import functools
import json
import subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    """Serve files while instructing the browser to always revalidate."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path in {"/", ""}:
            local_access_path = Path(self.directory or ".") / "local-access.html"
            if local_access_path.exists():
                self.path = "/local-access.html"
            else:
                self.path = "/index.html"
        return super().do_GET()

    def do_POST(self) -> None:
        project_root = Path(self.directory or ".")

        if self.path == "/api/save-content":
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(body or "{}")
                values = payload.get("values")
                if not isinstance(values, dict):
                    raise ValueError("Expected a JSON object with a values property.")

                client_version = payload.get("_version")
                if not isinstance(client_version, int):
                    raise ValueError(
                        "Expected an integer _version field matching the version this save was loaded from."
                    )

                content_model_path = project_root / "content-model.json"

                if not content_model_path.exists():
                    content_model_path.write_text('{\n  "_version": 0,\n  "values": {}\n}\n', encoding="utf-8")

                with content_model_path.open("r", encoding="utf-8") as handle:
                    content_model = json.load(handle)

                if not isinstance(content_model, dict):
                    content_model = {}

                current_version = content_model.get("_version")
                if not isinstance(current_version, int):
                    current_version = 0

                # Optimistic concurrency check: reject a save based on a stale
                # load instead of silently overwriting whatever changed on disk
                # since this client's tab last fetched content-model.json.
                if client_version != current_version:
                    self.send_response(409)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps(
                            {
                                "ok": False,
                                "error": "Content has changed on disk since this was loaded.",
                                "_version": current_version,
                                "values": content_model.get("values", {}),
                            }
                        ).encode("utf-8")
                    )
                    return

                existing_values = content_model.get("values")
                if not isinstance(existing_values, dict):
                    existing_values = {}

                existing_values.update(values)
                content_model["values"] = existing_values
                new_version = current_version + 1
                content_model["_version"] = new_version

                with content_model_path.open("w", encoding="utf-8") as handle:
                    json.dump(content_model, handle, indent=2)
                    handle.write("\n")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"ok": True, "saved": len(values), "_version": new_version}).encode("utf-8")
                )
            except Exception as exc:  # pragma: no cover - defensive server error handling
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
            return

        if self.path == "/api/publish":
            try:
                status_result = subprocess.run(
                    ["git", "status", "--porcelain"],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if status_result.returncode != 0:
                    raise RuntimeError(status_result.stderr.strip() or "Unable to inspect git status")

                if not status_result.stdout.strip():
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": True, "published": False, "message": "No content changes to publish."}).encode("utf-8"))
                    return

                add_result = subprocess.run(
                    ["git", "add", "content-model.json"],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if add_result.returncode != 0:
                    raise RuntimeError(add_result.stderr.strip() or "Unable to stage content-model.json")

                branch_result = subprocess.run(
                    ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if branch_result.returncode != 0:
                    raise RuntimeError(branch_result.stderr.strip() or "Unable to determine current branch")
                branch_name = branch_result.stdout.strip() or "main"

                commit_result = subprocess.run(
                    ["git", "commit", "-m", "Publish content updates"],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                commit_output = (commit_result.stdout + commit_result.stderr).lower()
                if commit_result.returncode != 0:
                    if "nothing to commit" in commit_output or "no changes added to commit" in commit_output:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({"ok": True, "published": False, "message": "No content changes to publish."}).encode("utf-8"))
                        return
                    raise RuntimeError(commit_result.stderr.strip() or "Unable to commit content changes")

                push_result = subprocess.run(
                    ["git", "push", "origin", branch_name],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if push_result.returncode != 0:
                    raise RuntimeError(push_result.stderr.strip() or "Unable to push changes")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "published": True, "message": "Published to GitHub."}).encode("utf-8"))
            except Exception as exc:  # pragma: no cover - defensive server error handling
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
            return

        self.send_error(404, "Not found")


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
