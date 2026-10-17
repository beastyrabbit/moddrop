# Product and canvas design direction

The production homepage uses the **All Access** direction: a warm green-room
palette with cream, brass, and ember accents, DM Serif Display for display type,
and DM Sans for interface text. Keep the page welcoming and spacious for
streamers, moderators, and chat communities. Avoid the rejected broadcast,
terminal, industrial, and dense all-caps grid treatments.

The stream canvas is media-first. Uploads, YouTube, audio, images, GIFs, and
video are the primary tools; drawing, text, and shapes remain available as
secondary tools. Canvas elements must stay passive and draggable. Put URL,
slider, and other element configuration in the side-panel inspector
(`MediaInspectorPanel`/`CanvasStylePanel`) instead of embedding controls inside
shapes, where controls interfere with pointer events and repositioning.

Preserve the homepage's lanyard-style all-access CTA and the animated
mods → shared canvas → OBS signal path when changing the landing experience.
