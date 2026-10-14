# Awgu StepForward — design

The approved visual direction for the product. It implements the brief in `../ui-generation-prompt.md` and the visual rules in `../frontend-spec.md` §5.

## View the mockups

Open `mockups/index.html` in Chrome (double-click it). If the fonts don't load from a `file://` path, serve the folder instead:

```bash
cd design/mockups && bunx serve -l 4321
```

Then open http://localhost:4321. Use the sun/moon switch in the top bar (or add `?theme=dark` to the URL) to preview dark mode.

## What's in the board

| Section | Contents |
|---|---|
| 01 Brand | Logo mark, lockups (light, dark, sizes 16–96 px), voice, misuse rules |
| 02 Foundations | Colour roles (light + dark), type scale, spacing and radius scale |
| 03 Components | Buttons, status/trust badges, filter chips, tabs, form fields with errors, opportunity cards, notices, offline banner, skeleton |
| 04 Web / PWA | Landing, directory, work detail, support sessions, applicant dashboard, staff moderation |
| 05 Mobile | Home, browse + filter sheet (offline), work detail, apply review |

## Brand decisions

- **Logo:** three rising steps toward a morning sun. It reads as "the next step" and as the Awgu hills, is made of simple rectangles, and works at 16 px. The wordmark is "AWGU" (Plus Jakarta Sans Bold, tracked +22%, laterite) over "StepForward" (Fraunces SemiBold).
- **Type:** Fraunces for display and headlines, Plus Jakarta Sans for everything else. Both are free (SIL OFL) and are loaded with `next/font` in the app. Four weights, Latin subset.
- **Colour:** forest green (primary), laterite red-earth (highlight), sun gold (accent), ink and cream paper. Semantic roles for verified, success, warning and danger. Every role has a dark-mode value. Large green panels use `--brand-panel`, so they stay deep forest in dark mode.
- **Components:** shadcn/ui primitives restyled through these tokens. DaisyUI is not used (see `../docs/DECISIONS.md` D21).

## Source of truth for code

`mockups/styles.css` holds the token values. When the redesign is implemented, they move into `apps/web/src/app/globals.css` (shadcn token names are noted beside each value).

## Figma

A Figma file was started ("Awgu StepForward — Design System & Mockups"), but the Figma Starter plan's AI tool-call limit stopped the build. This board can be imported into Figma later with the html-to-Figma importer once the plan allows it.
