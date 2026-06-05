# D01 Chart Visual Language Result

## Reusable Spec
- Palette: translate the sample's clean gray diagram language into Tutor context.
  Use connector gray, boundary gray, high-contrast text, blue/cyan for foreground
  flow, green for background/verified updates, violet for learner brain/context,
  orange for risk.
- Layout: fixed SVG viewBox, responsive container, 3-6 primary nodes, rounded
  orthogonal paths, dashed rounded regions for lanes.
- Nodes: compact glass cards, 140-180px wide, 56-72px high, 8-12px radius,
  centered semibold label.
- Arrows: gray 2-2.5px strokes, rounded joins, small chevrons, path labels near
  the path.
- Motion: glowing packets travel along arrows and briefly flash nodes on arrival;
  respect reduced motion.
- Interaction: hover/focus should highlight nodes and connected paths; click can
  pin focus in future.
- Accessibility: SVG title/desc, keyboard focus, visible focus rings,
  screen-reader summary, no color-only meaning.
- Responsive: preserve aspect ratio or allow horizontal scroll; keep targets at
  least 44px.

## Avoid
Default Mermaid styling, dense crossing arrows, animated everything at once,
force-layout spaghetti, purple-only palettes, giant decorative gradients, and
unsynced packet/node flashes.
