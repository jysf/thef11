# f/11

A photo blog built with Eleventy, by a developer who is also building
[crustyimg](https://github.com/jysf/crustyimg), a Rust image CLI.
Live at <https://thef11.com>.

## Prerequisites

- **Node ≥ 18.** CI builds on Node 22, 24, and 26; 24 is what deploys.
- **exiftool** — the image audit refuses to run without it (it fails closed).
  - macOS: `brew install exiftool`
  - Ubuntu: `sudo apt-get install -y libimage-exiftool-perl`
- **Bash ≥ 4.** `scripts/audit-images.sh` uses associative arrays (`declare -A`),
  a Bash 4 feature. macOS still ships Bash 3.2, which the script cannot run on —
  install a modern one with `brew install bash` (Homebrew puts it first on your
  PATH, so `#!/usr/bin/env bash` picks it up). CI runs Ubuntu's Bash 5, so this
  only bites local macOS.

  If the audit ever aborts with `declare: -A: invalid option`, this is the
  reason. Note the audit fails **closed**: when it can't run, the pre-commit
  hook blocks *every* commit, not just ones with bad images.

## Setup

```sh
npm ci        # install deps; also points git at .githooks (via the prepare script)
```

## Scripts

```sh
npm start      # serve with hot reload
npm run build  # build to _site/
npm run clean  # remove _site/ and caches
npm run audit  # run the EXIF keep-list audit over every tracked image
```

## Adding a post

A post is a folder under `src/posts/` holding its own `index.md` and its own
images:

```
src/posts/2026-07-12-example/
  index.md
  rooftops.png
```

Reference images by bare filename through the `image` shortcode; they are copied
to sit beside the rendered page. Pick a layout in front matter —
`layouts/article.njk` or `layouts/essay.njk`.

## Privacy

The repo is public and git history is permanent, so originals never enter git.
They live outside the tree in the gitignored `_incoming/` / `_originals/`
airlock; only stripped, verified images land in `src/posts/`. Every committed
image is checked against `.exif-keeplist` by `scripts/audit-images.sh` — locally
via the pre-commit hook, and independently in CI on every push, which is the
real enforcement boundary (the hook can be skipped with `--no-verify` and does
not exist on a fresh clone).
```
