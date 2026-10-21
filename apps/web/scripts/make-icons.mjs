// Draws the app icons (home-screen, maskable and Apple touch) from the logo.
//
//   bun run icons
//
// The mark is the same as components/shared/logo.tsx: three rising steps
// toward a morning sun, in the brand forest green.

import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PUBLIC = fileURLToPath(new URL("../public/icons/", import.meta.url));
const APP = fileURLToPath(new URL("../src/app/", import.meta.url));

const FOREST = "#0f5a43";
const CREAM = "#fbf7ef";
const SUN = "#f2b33d";

/** The 40x40 logo mark drawn at `scale` inside a `size` square. */
function mark(size, { scale = 1, rounded = true } = {}) {
  const inner = 40 * scale;
  const offset = (40 - inner) / 2;
  const radius = rounded ? 11 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="${radius}" fill="${FOREST}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <rect x="7.5" y="24" width="7" height="8.5" rx="1.6" fill="${CREAM}"/>
    <rect x="16.5" y="18" width="7" height="14.5" rx="1.6" fill="${CREAM}"/>
    <rect x="25.5" y="12" width="7" height="20.5" rx="1.6" fill="${CREAM}"/>
    <circle cx="14" cy="11.5" r="4" fill="${SUN}"/>
  </g>
</svg>`;
}

const ICONS = [
  // Regular icons: rounded tile, full-size mark.
  { file: `${PUBLIC}icon-192.png`, size: 192, svg: mark(192) },
  { file: `${PUBLIC}icon-512.png`, size: 512, svg: mark(512) },
  // Maskable: square, mark shrunk into the central safe zone (Android crops it).
  { file: `${PUBLIC}maskable-512.png`, size: 512, svg: mark(512, { scale: 0.72, rounded: false }) },
  // Apple touch icon: square (iOS rounds it), picked up by Next.js automatically.
  { file: `${APP}apple-icon.png`, size: 180, svg: mark(180, { scale: 0.86, rounded: false }) },
];

await mkdir(PUBLIC, { recursive: true });
for (const { file, size, svg } of ICONS) {
  const info = await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log(`${file.split(/[\\/]/).slice(-2).join("/")}  ${info.width}x${info.height}`);
}
