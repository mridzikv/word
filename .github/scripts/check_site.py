#!/usr/bin/env python3
"""Pre-deploy check for the WordCraft web build.

    python3 .github/scripts/check_site.py [SITE_DIR]

Fails when index.html or sw.js points at a file that isn't there, when a build file's bytes
don't match the integrity hash in index.html (a new .wasm dropped in next to an old index.html),
or when a font in fonts/fonts.json or an icon in manifest.webmanifest is missing. Any of these
deploys without error and then breaks in the browser: the app never starts, or the service
worker fails to install and the app can't be used offline.
"""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
errors = []


def need(rel, source):
    if (root / rel).is_file():
        return True
    errors.append(f"{source}: {rel} is missing")
    return False


# Every "./file" that index.html and sw.js load (build files, manifest, icons, fonts.json).
for source in ("index.html", "sw.js"):
    text = (root / source).read_text(encoding="utf-8")
    for rel in sorted(set(re.findall(r"""["']\./([^"']+)["']""", text))):
        if not rel.endswith("/"):
            need(rel, source)

# Subresource integrity: on a mismatch the browser refuses the file.
html = (root / "index.html").read_text(encoding="utf-8")
for tag in re.findall(r"<link\b[^>]*>", html):
    href = re.search(r'href="\./([^"]+)"', tag)
    sri = re.search(r'integrity="(sha256|sha384|sha512)-([^"]+)"', tag)
    if not (href and sri) or not (root / href.group(1)).is_file():
        continue
    digest = hashlib.new(sri.group(1), (root / href.group(1)).read_bytes()).digest()
    if base64.b64encode(digest).decode() != sri.group(2):
        errors.append(f"index.html: integrity hash for {href.group(1)} does not match the file")

for name in json.loads((root / "fonts/fonts.json").read_text(encoding="utf-8"))["files"]:
    need(f"fonts/{name}", "fonts/fonts.json")
for icon in json.loads((root / "manifest.webmanifest").read_text(encoding="utf-8"))["icons"]:
    need(icon["src"], "manifest.webmanifest")

for error in errors:
    print(f"::error::{error}")
if errors:
    sys.exit(1)
print("Site check passed")
