# Portfolio design system

Shared tokens live in `docs/styles.css` under `:root`.

- Color: near-black surfaces, warm white text, cyan focus accents, and pink section markers. Preserve the existing palette.
- Type: Google Sans on the website; Press Start 2P only in the Commodore welcome animation. `--type-hero` controls responsive hero sizing.
- Space: an 8px base with 8 / 16 / 24 / 32 / 48 / 64px steps. Section spacing scales from 90 to 130px.
- Components: pill actions, bordered content panels, compact tags, section headings, and a transparent portrait with a soft lower fade. No portrait frame.
- Motion: scroll changes opacity only. Text stays at its layout position, fading from the background to full brightness and back. No slide, parallax, word masks, or delayed opacity transitions. Stopping scroll freezes the brightness immediately. Cursor lighting uses cyan and pink; rendering stops when idle.
- Chapter choreography: chapter fades follow their actual shared border as it travels from the viewport bottom to the bottom of the fixed navigation. The outgoing and incoming fades are complementary, so the previous chapter does not disappear early and leave a blank transition. About and Contact keep heading and supporting text together. Experience keeps all companies in one timeline with no inner scrollbar. Approach, Selected work, and Toolkit share a stage with brightness-only handoffs. The hero dims as About rises over it, mirroring About's entrance. Fades use a quintic (smootherstep) curve. Scroll painting reads only `scrollY` against geometry cached on resize, and dimmed layers carry `will-change: opacity`, so brightness changes stay on the compositor. Cursor lighting keeps tracking the resting cursor while the page scrolls. If content cannot fit the viewport, or reduced motion is enabled, retain normal readable document flow.
- Accessibility: reduced motion disables scroll choreography and hover movement. Keyboard focus restores full visibility. Never intercept wheel or touch scrolling.

Preview by serving `docs/` or opening `docs/index.html` locally.
