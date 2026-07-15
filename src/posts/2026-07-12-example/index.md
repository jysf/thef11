---
layout: layouts/essay.njk
title: "An example essay"
dek: "A placeholder post so the layouts and the image shortcode can be seen rendering. Replace it with a real one."
date: 2026-07-12
tags:
  - photography
  - crustyimg
cover: /posts/2026-07-12-example/cover.png
coverAlt: "A flat charcoal swatch standing in for the cover photograph."
---

This is placeholder prose. It exists only so the essay layout has something to
lay out: a paragraph at the reading measure, an image that breaks out to the
full width of the viewport, and another that stays contained.

The image below carries the `bleed` class, so it fills the viewport width:

{% image "rooftops.png", "A placeholder standing in for a wide rooftop photograph.", "bleed" %}

Back to the measure. Everything here — the prose column, the full-bleed frame,
the contained figure — comes straight from the design system in
`src/assets/css/style.css`. Nothing about the markup below changes when the
crustyimg pipeline lands behind the `{% raw %}{% image %}{% endraw %}` seam.

{% image "bicycle.png", "A placeholder standing in for a bicycle against a garage door." %}

That is the whole point of the seam: this file keeps working unchanged.
