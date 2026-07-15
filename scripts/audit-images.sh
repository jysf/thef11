#!/usr/bin/env bash
#
# audit-images.sh — the single audit chain.
#
# Refuses any image carrying metadata that is not on the keep-list.
#
# This repository is PUBLIC and git history is PERMANENT. One GPS-bearing
# photograph committed once is public forever, and rewriting history does not
# help once someone has cloned. So this script fails CLOSED: anything it cannot
# read, cannot parse, or cannot prove clean is REFUSED. "Refused" is a normal
# outcome, not an error.
#
# KEEP-LIST, NOT DENY-LIST. We do not hunt for GPS tags. We enumerate every tag
# present in the file and block anything that is not explicitly allowed. A
# camera firmware update that invents a new location-adjacent tag is blocked
# because it is not on the list — not because we remembered to ban it. This is
# the only approach that is safe against tags that do not exist yet.
#
# Two modes, so the hook and CI run identical logic and cannot drift:
#   ./scripts/audit-images.sh staged   → scans staged blobs (pre-commit hook)
#   ./scripts/audit-images.sh all      → scans every tracked image (CI)
#
# Requires exiftool:
#   macOS   brew install exiftool
#   Ubuntu  sudo apt-get install -y libimage-exiftool-perl
#
# LATER: this is replaced by `crustyimg verify`, at which point the audit chain
# is the same binary that does the stripping. That swap is a milestone worth
# writing about — until then, exiftool is the honest, boring dependency.

set -euo pipefail

MODE="${1:-staged}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
KEEPLIST="${REPO_ROOT}/.exif-keeplist"

# Image extensions we audit. Anything else in the repo is not our business.
# Note: raw/HEIC are .gitignored outright — if one reaches here, something
# bypassed the airlock, and the extension check below will not save you.
readonly IMAGE_RE='\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$'

# Metadata groups that are genuinely embedded in the file and therefore ours to
# police. Groups we deliberately skip:
#   File       — not embedded metadata; derived by exiftool from the bytes
#                (FileName, FileSize, ImageWidth, MIMEType...)
#   ExifTool   — the scanner talking about itself
#   Composite  — values exiftool computes from other tags; not stored
#   ICC_Profile— colour management. Carries no identity. We want to keep it.
readonly SCANNED_GROUPS='EXIF|GPS|MakerNotes|XMP|IPTC|Photoshop|JFIF|PNG|APP14'

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n'  "$*"; }
dim()  { printf '\033[2m%s\033[0m\n'  "$*"; }

# --- preflight: fail closed if we cannot scan --------------------------------
if ! command -v exiftool >/dev/null 2>&1; then
  red "AUDIT CANNOT RUN: exiftool is not installed."
  echo "  This check is what keeps location and identity metadata out of a"
  echo "  public, permanent git history. It is not optional, so this is a"
  echo "  failure rather than a skip."
  echo
  echo "  macOS:  brew install exiftool"
  echo "  Ubuntu: sudo apt-get install -y libimage-exiftool-perl"
  exit 1
fi

if [[ ! -f "$KEEPLIST" ]]; then
  red "AUDIT CANNOT RUN: no keep-list at ${KEEPLIST}"
  exit 1
fi

# Load the keep-list: one tag name per line, '#' comments and blanks ignored.
declare -A ALLOWED=()
while IFS= read -r line; do
  line="${line%%#*}"                       # strip comment
  line="$(echo "$line" | tr -d '[:space:]')"
  [[ -z "$line" ]] && continue
  ALLOWED["$line"]=1
done < "$KEEPLIST"

# --- gather the files to scan ------------------------------------------------
declare -a FILES=()
if [[ "$MODE" == "staged" ]]; then
  # Added/Copied/Modified only. -z for filenames with spaces.
  while IFS= read -r -d '' f; do FILES+=("$f"); done < <(
    git diff --cached --name-only --diff-filter=ACM -z
  )
elif [[ "$MODE" == "all" ]]; then
  while IFS= read -r -d '' f; do FILES+=("$f"); done < <(git ls-files -z)
else
  red "usage: audit-images.sh [staged|all]"; exit 1
fi

# Keep only images.
declare -a IMAGES=()
for f in "${FILES[@]:-}"; do
  [[ -z "$f" ]] && continue
  if [[ "$f" =~ $IMAGE_RE ]]; then IMAGES+=("$f"); fi
done

if [[ ${#IMAGES[@]} -eq 0 ]]; then
  dim "audit: no images to scan."
  exit 0
fi

# --- scan --------------------------------------------------------------------
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

violations=0
clean=0

for f in "${IMAGES[@]}"; do
  tmp="${TMPDIR}/blob"

  # Read the STAGED content, not the working tree — they can differ. You may
  # have stripped the file on disk but staged an earlier, dirty version.
  if [[ "$MODE" == "staged" ]]; then
    if ! git show ":${f}" > "$tmp" 2>/dev/null; then
      red "REFUSED  ${f}"
      echo "         cannot read staged blob"
      violations=$((violations + 1))
      continue
    fi
  else
    cp "${REPO_ROOT}/${f}" "$tmp"
  fi

  # If exiftool cannot parse it, we cannot prove it is clean. Refuse.
  if ! meta="$(exiftool -s -G0 -n "$tmp" 2>/dev/null)"; then
    red "REFUSED  ${f}"
    echo "         undecodable — cannot prove it carries no location data"
    violations=$((violations + 1))
    continue
  fi

  declare -a bad=()
  while IFS= read -r line; do
    # exiftool -s -G0 emits:  [EXIF]  Make  : FUJIFILM
    if [[ "$line" =~ ^\[([A-Za-z0-9_]+)\][[:space:]]+([A-Za-z0-9_-]+)[[:space:]]*: ]]; then
      group="${BASH_REMATCH[1]}"
      tag="${BASH_REMATCH[2]}"
      [[ "$group" =~ ^($SCANNED_GROUPS)$ ]] || continue
      [[ -n "${ALLOWED[$tag]:-}" ]] && continue
      bad+=("${group}:${tag}")
    fi
  done <<< "$meta"

  if [[ ${#bad[@]} -gt 0 ]]; then
    red "REFUSED  ${f}"
    for b in "${bad[@]}"; do
      # Call out the genuinely dangerous ones loudly; everything else is still
      # blocked, it just may be benign and belong on the keep-list.
      if [[ "$b" =~ (GPS|Serial|Owner|MakerNotes|Artist|Creator|Location) ]]; then
        echo "         ✗ ${b}   ← identity or location"
      else
        echo "         ✗ ${b}"
      fi
    done
    violations=$((violations + 1))
  else
    clean=$((clean + 1))
  fi
done

# --- verdict -----------------------------------------------------------------
echo
if [[ $violations -gt 0 ]]; then
  bold "audit: ${clean} clean, ${violations} REFUSED of ${#IMAGES[@]} images"
  echo
  echo "Nothing was committed. Every image in this repo must carry only the"
  echo "tags in .exif-keeplist — git history is permanent and public."
  echo
  echo "Fix by re-exporting the image with metadata stripped, or:"
  echo "  exiftool -all= -tagsfromfile @ -Make -Model -LensModel -FNumber \\"
  echo "           -ExposureTime -ISO -DateTimeOriginal <file>"
  echo
  echo "If a blocked tag is genuinely harmless, add it to .exif-keeplist —"
  echo "deliberately, one line, in a commit you can point at later."
  exit 1
fi

bold "audit: ${clean} of ${#IMAGES[@]} images clean — no location or identity metadata"
exit 0
