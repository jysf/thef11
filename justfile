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

# Audit every tracked image against the EXIF keep-list.
# Needs exiftool and Bash >= 4 (macOS ships 3.2 — `brew install bash`).
audit:
    npm run audit

# The pre-push gate: build, then audit — the same two checks CI runs.
check: build audit
