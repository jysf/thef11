# f/11 task runner — run `just` (no args) to list recipes.
# These wrap the npm scripts; package.json remains the source of truth.

# List available recipes
default:
    @just --list

alias dev := start

# Install dependencies exactly as CI does (also points git at .githooks)
install:
    npm ci

# Serve locally with hot reload → http://localhost:8080
start:
    npm start

# Build the site into _site/
build:
    npm run build

# Remove _site/ and caches
clean:
    npm run clean

# Needs exiftool and Bash >= 4 (macOS ships 3.2 — `brew install bash`).

# Audit every tracked image against the EXIF keep-list
audit:
    npm run audit

#   just ingest ~/Photos/site-originals/rooftops 2026-07-20-rooftops
#
# SRC must live OUTSIDE this repo (the airlock) — originals never enter git.
# crustyimg bakes orientation, strips metadata and drops GPS by default, and
# picks the smallest modern format; the keep-list audit then proves what we're
# about to commit is clean. Trust nothing, verify everything.
#
# HEIC is not decoded by crustyimg yet — pre-convert with `sips`, and keep that
# intermediate in the airlock too, since it inherits the original's GPS.

# Ingest an external folder of photos into src/posts/<SLUG>/, stripped + audited
ingest SRC SLUG:
    mkdir -p src/posts/{{SLUG}}
    crustyimg web "{{SRC}}"/* --out-dir src/posts/{{SLUG}}/
    git add src/posts/{{SLUG}}
    npm run audit:staged

# The pre-push gate: build, then audit — the same two checks CI runs.
check: build audit
