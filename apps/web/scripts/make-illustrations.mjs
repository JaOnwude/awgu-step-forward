// Draws the placeholder illustrations and saves them as .webp in public/images.
//
//   bun run images
//
// Every scene is flat vector art built from a few shared pieces (people,
// props, backgrounds), so it stays on-brand and is cheap to change. The people
// are fictional. To use real photos later, drop a .webp with the same file
// name into public/images and delete it from SCENES below.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = fileURLToPath(new URL("../public/images/", import.meta.url));

const C = {
  forest: "#0F5A43",
  forestDeep: "#0b4836",
  laterite: "#B8501F",
  lateriteDeep: "#8f3c16",
  sun: "#F2B33D",
  sunDeep: "#d99a22",
  cream: "#FBF7EF",
  ink: "#15201a",
  blue: "#1d5fa6",
  sky: "#86b8ee",
  wood: "#8a5a35",
  woodDeep: "#6f4528",
  steel: "#9aa3a8",
  hair: "#1b1410",
};

const SKIN = ["#4a2a19", "#5a3420", "#6b3e26", "#7a4a2e", "#8d5a3b"];

// ---------------------------------------------------------------- helpers

const circle = (cx, cy, r, fill, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, rx = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, width, extra = "") =>
  `<path d="M${x1},${y1} L${x2},${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" fill="none" ${extra}/>`;

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body.join("")}</svg>`;
}

function sparkles(points, colors = [C.sun, C.laterite, C.forest]) {
  return points
    .map(([x, y, r], i) => {
      const fill = colors[i % colors.length];
      return i % 2
        ? circle(x, y, r, fill)
        : path(
            `M${x},${y - r * 2} L${x + r * 0.6},${y - r * 0.6} L${x + r * 2},${y} L${x + r * 0.6},${y + r * 0.6} L${x},${y + r * 2} L${x - r * 0.6},${y + r * 0.6} L${x - r * 2},${y} L${x - r * 0.6},${y - r * 0.6}Z`,
            fill,
          );
    })
    .join("");
}

function backdrop(width, height, { bg, sunAt, sunR = 110, hills, ground }) {
  const parts = [rect(0, 0, width, height, bg)];
  if (sunAt) {
    parts.push(circle(sunAt[0], sunAt[1], sunR * 1.5, C.sun, 'opacity="0.18"'));
    parts.push(circle(sunAt[0], sunAt[1], sunR, C.sun, 'opacity="0.9"'));
  }
  if (hills) {
    parts.push(
      path(
        `M0,${height * 0.74} C${width * 0.25},${height * 0.66} ${width * 0.5},${height * 0.74} ${width * 0.75},${height * 0.68} S${width},${height * 0.7} ${width},${height * 0.7} V${height} H0Z`,
        hills,
      ),
    );
  }
  if (ground) parts.push(rect(0, height * 0.86, width, height * 0.14, ground));
  return parts.join("");
}

// ---------------------------------------------------------------- people

const HANG_L = { e: [-42, -186], h: [-44, -146] };
const HANG_R = { e: [42, -186], h: [44, -146] };

function heldItem(kind, [hx, hy]) {
  switch (kind) {
    case "scroll":
      return (
        rect(hx - 7, hy - 40, 14, 48, C.cream, 5) + rect(hx - 8, hy - 20, 16, 7, C.laterite, 2)
      );
    case "book":
      return rect(hx - 22, hy - 16, 44, 30, C.laterite, 3) + rect(hx - 18, hy - 12, 36, 4, C.cream, 1);
    case "books":
      return (
        rect(hx - 24, hy - 26, 48, 14, C.blue, 3) +
        rect(hx - 22, hy - 13, 44, 14, C.laterite, 3) +
        rect(hx - 25, hy, 50, 14, C.forest, 3)
      );
    case "spanner":
      return (
        line(hx, hy + 8, hx + 8, hy - 46, C.steel, 8) +
        `<circle cx="${hx + 9}" cy="${hy - 54}" r="10" fill="none" stroke="${C.steel}" stroke-width="7"/>`
      );
    case "folder":
      return rect(hx - 24, hy - 6, 48, 34, C.sun, 4) + rect(hx - 24, hy - 6, 20, 6, C.sunDeep, 2);
    case "tablet":
      return (
        rect(hx - 30, hy - 40, 60, 44, C.ink, 6) +
        rect(hx - 25, hy - 35, 50, 34, "#e3edf8", 3) +
        `<path d="M${hx - 10},${hy - 18} L${hx - 3},${hy - 11} L${hx + 11},${hy - 26}" stroke="${C.forest}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    case "block":
      return (
        rect(hx - 34, hy - 32, 68, 32, "#a4a9ad", 3) +
        rect(hx - 24, hy - 25, 16, 18, "#8a8f93", 2) +
        rect(hx + 8, hy - 25, 16, 18, "#8a8f93", 2)
      );
    case "pen":
      return line(hx - 4, hy + 6, hx + 10, hy - 22, C.blue, 5);
    default:
      return "";
  }
}

function hairBack(style, color) {
  if (style === "afro") return circle(0, -292, 34, color);
  if (style === "puff") return circle(0, -320, 18, color);
  if (style === "braids") return rect(-36, -296, 72, 80, color, 24);
  return "";
}

function hairFront(style, color, wrap) {
  const cap = (c) =>
    path("M-26,-284 Q-27,-310 0,-311 Q27,-310 26,-284 Q22,-297 0,-298 Q-22,-297 -26,-284Z", c);
  switch (style) {
    case "short":
    case "afro":
    case "puff":
      return cap(color);
    case "grey":
      return cap("#c9c3bb");
    case "low":
      return path("M-26,-287 Q-26,-307 0,-307 Q26,-307 26,-287 Q0,-299 -26,-287Z", color);
    case "braids":
      return (
        cap(color) +
        [-31, -24, 24, 31]
          .map((x) => line(x, -262, x, -220, "#3a2a20", 3))
          .join("")
      );
    case "wrap":
      return (
        path("M-30,-280 Q-35,-324 0,-328 Q35,-324 30,-280 Q0,-299 -30,-280Z", wrap) +
        circle(21, -322, 12, wrap) +
        circle(-12, -312, 3, C.cream, 'opacity="0.7"') +
        circle(4, -318, 3, C.cream, 'opacity="0.7"') +
        circle(-2, -302, 3, C.cream, 'opacity="0.7"')
      );
    default:
      return "";
  }
}

function headGear(acc) {
  let out = "";
  if (acc.includes("gradcap")) {
    out +=
      rect(-20, -312, 40, 16, C.ink, 3) +
      path("M-42,-314 L0,-329 L42,-314 L0,-299Z", C.ink) +
      `<path d="M0,-314 L32,-308 L34,-286" stroke="${C.sun}" stroke-width="3" fill="none"/>`;
  }
  if (acc.includes("hardhat")) {
    out +=
      path("M-31,-291 Q-31,-325 0,-327 Q31,-325 31,-291Z", C.sun) +
      rect(-38, -295, 76, 9, C.sunDeep, 4) +
      rect(-3, -326, 6, 32, C.sunDeep, 3);
  }
  if (acc.includes("goggles")) {
    out +=
      rect(-27, -304, 54, 10, "#2a2a2a", 5) +
      circle(-11, -299, 7, C.sky) +
      circle(11, -299, 7, C.sky);
  }
  return out;
}

function chestGear(acc, colors) {
  let out = "";
  if (acc.includes("collar")) {
    out += path("M-12,-240 L0,-226 L-4,-218 L-16,-234Z", "#ffffff");
    out += path("M12,-240 L0,-226 L4,-218 L16,-234Z", "#ffffff");
  }
  if (acc.includes("tie")) {
    out += path("M0,-228 L-6,-222 L-3,-176 L0,-168 L3,-176 L6,-222Z", colors.tie ?? C.laterite);
  }
  if (acc.includes("lanyard")) {
    out += `<path d="M-12,-238 L0,-198 L12,-238" stroke="${colors.lanyard ?? C.laterite}" stroke-width="3" fill="none"/>`;
    out += rect(-10, -200, 20, 26, "#ffffff", 3) + rect(-10, -200, 20, 7, colors.lanyard ?? C.laterite, 2);
  }
  if (acc.includes("backpack")) {
    out += line(-22, -236, -20, -160, colors.pack ?? C.laterite, 7);
    out += line(22, -236, 20, -160, colors.pack ?? C.laterite, 7);
  }
  if (acc.includes("apron")) {
    out += path("M-25,-214 L25,-214 L30,-92 L-30,-92Z", colors.apron ?? C.forest);
    out += line(-22, -214, -12, -240, colors.apron ?? C.forest, 4);
    out += line(22, -214, 12, -240, colors.apron ?? C.forest, 4);
    out += rect(-12, -170, 24, 18, "#ffffff", 3, 'opacity="0.25"');
  }
  if (acc.includes("overalls")) {
    out += rect(-21, -208, 42, 82, colors.bottom, 6);
    out += line(-20, -238, -16, -204, colors.bottom, 6);
    out += line(20, -238, 16, -204, colors.bottom, 6);
    out += rect(-10, -196, 20, 14, "#ffffff", 3, 'opacity="0.2"');
  }
  if (acc.includes("vest")) {
    out += path("M-34,-226 L-12,-232 L-14,-130 L-30,-130Z", "#f5c542");
    out += path("M34,-226 L12,-232 L14,-130 L30,-130Z", "#f5c542");
    out += rect(-31, -176, 18, 5, "#ffffff", 2, 'opacity="0.8"');
    out += rect(13, -176, 18, 5, "#ffffff", 2, 'opacity="0.8"');
  }
  return out;
}

/**
 * A young person, facing the viewer, feet at (x, y). Units are about 330 tall
 * at s = 1. `arms.l` / `arms.r` give elbow (e) and hand (h) in local units.
 */
function person({
  x,
  y,
  s = 1,
  skin,
  hair = "short",
  hairColor = C.hair,
  wrap = C.laterite,
  top,
  bottom = C.ink,
  bottomType = "trousers",
  shoes = "#2a1d02",
  sleeves = "short",
  legs = true,
  arms = {},
  hold = {},
  acc = [],
  colors = {},
}) {
  const L = arms.l ?? HANG_L;
  const R = arms.r ?? HANG_R;
  const g = [];

  g.push(hairBack(hair, hairColor));
  if (acc.includes("backpack")) g.push(rect(-52, -232, 36, 86, colors.pack ?? C.laterite, 11));

  if (legs) {
    if (bottomType === "trousers") {
      g.push(rect(-27, -136, 25, 130, bottom, 10), rect(2, -136, 25, 130, bottom, 10));
    } else if (bottomType === "skirt") {
      g.push(rect(-18, -84, 12, 78, skin, 5), rect(6, -84, 12, 78, skin, 5));
      g.push(path("M-28,-140 L28,-140 L44,-70 Q0,-62 -44,-70Z", bottom));
    } else if (bottomType === "gown") {
      g.push(rect(-18, -40, 12, 34, skin, 5), rect(6, -40, 12, 34, skin, 5));
      g.push(path("M-30,-140 L30,-140 L48,-26 Q0,-16 -48,-26Z", bottom));
    }
    g.push(
      `<ellipse cx="-16" cy="-6" rx="17" ry="7" fill="${shoes}"/>`,
      `<ellipse cx="16" cy="-6" rx="17" ry="7" fill="${shoes}"/>`,
    );
  }

  g.push(rect(-8, -256, 16, 22, skin, 4));
  g.push(path("M-36,-214 Q-36,-238 -14,-241 L14,-241 Q36,-238 36,-214 L31,-126 L-31,-126Z", top));
  g.push(chestGear(acc, { ...colors, bottom }));

  for (const [side, arm] of [
    [-1, L],
    [1, R],
  ]) {
    const sx = side * 30;
    const sy = -226;
    g.push(
      `<path d="M${sx},${sy} L${arm.e[0]},${arm.e[1]}" stroke="${top}" stroke-width="19" stroke-linecap="round" fill="none"/>`,
    );
    g.push(
      `<path d="M${arm.e[0]},${arm.e[1]} L${arm.h[0]},${arm.h[1]}" stroke="${sleeves === "long" ? top : skin}" stroke-width="15" stroke-linecap="round" fill="none"/>`,
    );
    const item = side < 0 ? hold.l : hold.r;
    if (item) g.push(heldItem(item, arm.h));
    g.push(circle(arm.h[0], arm.h[1], 9, skin));
    if (item === "thumb") g.push(rect(arm.h[0] - 3.5, arm.h[1] - 22, 8, 16, skin, 4));
  }

  g.push(circle(-25, -277, 6, skin), circle(25, -277, 6, skin));
  g.push(circle(0, -279, 27, skin));
  g.push(hairFront(hair, hairColor, wrap));
  g.push(circle(-9, -280, 2.8, C.hair), circle(9, -280, 2.8, C.hair));
  g.push(`<path d="M-8,-268 Q0,-261 8,-268" stroke="${C.hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  g.push(headGear(acc));

  return `<g transform="translate(${x},${y}) scale(${s})">${g.join("")}</g>`;
}

// ---------------------------------------------------------------- props

function plant(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">${[
    path("M0,-40 C-50,-70 -60,-130 -20,-150 C-10,-110 -4,-80 0,-40Z", C.forest),
    path("M0,-40 C40,-80 70,-120 40,-160 C20,-120 8,-90 0,-40Z", "#2f7d5f"),
    path("M0,-40 C-10,-90 0,-140 10,-180 C20,-130 14,-90 0,-40Z", "#3e9a74"),
    path("M-30,-44 L30,-44 L22,0 L-22,0Z", C.laterite),
  ].join("")}</g>`;
}

function desk(x, y, w, h = 30) {
  return rect(x, y, w, h, C.wood, 6) + rect(x, y + h - 2, w, 260, C.woodDeep, 0);
}

function laptopBack(x, y) {
  return path(`M${x},${y} L${x + 150},${y} L${x + 140},${y + 92} L${x + 10},${y + 92}Z`, "#cfd6db") + circle(x + 75, y + 44, 9, "#e9eef1");
}

// ---------------------------------------------------------------- scenes

const W = 1200;
const H = 800;

const SCENES = {
  "category-scholarship": () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#FDF0D2", sunAt: [980, 190], sunR: 105, hills: "#a9d1b6", ground: "#3e8a63" }),
      // stacked books
      rect(120, 600, 250, 46, C.forest, 8),
      rect(140, 556, 220, 46, C.blue, 8),
      rect(160, 512, 190, 46, C.laterite, 8),
      rect(130, 616, 230, 8, C.cream, 3),
      rect(150, 572, 200, 8, C.cream, 3),
      rect(170, 528, 170, 8, C.cream, 3),
      person({
        x: 600, y: 700, s: 1.42, skin: SKIN[2], hair: "braids", top: C.forest, bottom: C.forest,
        bottomType: "gown", sleeves: "long", acc: ["gradcap"],
        arms: { r: { e: [54, -262], h: [62, -318] }, l: { e: [-46, -196], h: [-26, -158] } },
        hold: { r: "scroll" },
      }),
      person({
        x: 880, y: 708, s: 1.32, skin: SKIN[0], hair: "short", top: C.sun, bottom: C.blue,
        acc: ["backpack"], colors: { pack: C.laterite },
        arms: { l: { e: [-54, -250], h: [-60, -306] }, r: { e: [40, -190], h: [16, -168] } },
        hold: { r: "books" },
      }),
      sparkles([[420, 160, 10], [500, 250, 7], [760, 120, 9], [700, 230, 6], [300, 300, 8], [1080, 380, 7]]),
    ]),

  "category-training": () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#E2EFE8", ground: "#c9dccf" }),
      // whiteboard
      rect(660, 110, 460, 300, "#ffffff", 14, `stroke="${C.ink}" stroke-opacity="0.15" stroke-width="6"`),
      rect(710, 290, 50, 80, C.forest, 4),
      rect(780, 240, 50, 130, C.sun, 4),
      rect(850, 190, 50, 180, C.laterite, 4),
      line(940, 180, 1080, 180, "#b9c4bd", 8),
      line(940, 220, 1060, 220, "#b9c4bd", 8),
      line(940, 260, 1080, 260, "#b9c4bd", 8),
      person({
        x: 700, y: 720, s: 1.38, skin: SKIN[4], hair: "wrap", wrap: C.laterite, top: C.sun,
        bottom: C.forest, bottomType: "skirt",
        arms: { r: { e: [58, -250], h: [96, -300] } },
      }),
      person({
        x: 220, y: 740, s: 1.25, skin: SKIN[1], hair: "puff", top: C.blue, legs: false,
        arms: { l: { e: [-40, -190], h: [-14, -160] }, r: { e: [40, -190], h: [14, -160] } },
      }),
      person({
        x: 430, y: 740, s: 1.2, skin: SKIN[3], hair: "short", top: C.laterite, legs: false,
        arms: { r: { e: [44, -186], h: [24, -150] } }, hold: { r: "pen" },
      }),
      desk(40, 568, 520),
      laptopBack(145, 478),
      rect(370, 548, 110, 18, "#ffffff", 3),
      plant(1080, 700, 1.1),
    ]),

  "category-apprenticeship": () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#FBEFD4", ground: "#c9a574" }),
      // pegboard with tools
      rect(90, 110, 470, 300, "#e8d2a6", 16),
      ...Array.from({ length: 48 }, (_, i) =>
        circle(120 + (i % 12) * 37, 135 + Math.floor(i / 12) * 75, 4, "#cdb486"),
      ),
      line(170, 160, 170, 330, C.steel, 14),
      `<circle cx="170" cy="150" r="20" fill="none" stroke="${C.steel}" stroke-width="12"/>`,
      rect(260, 170, 24, 150, C.wood, 6),
      rect(236, 150, 72, 36, "#5b646a", 6),
      path("M370,160 L500,160 L500,200 L380,330 L370,330Z", "#b9c0c4"),
      rect(470, 150, 50, 30, C.laterite, 6),
      // gear
      `<g transform="translate(1010,190)">${Array.from({ length: 8 }, (_, i) =>
        rect(-14, -96, 28, 40, C.sun, 4, `transform="rotate(${i * 45})"`),
      ).join("")}${circle(0, 0, 72, C.sun)}${circle(0, 0, 28, "#FBEFD4")}</g>`,
      // workbench
      rect(760, 520, 400, 30, C.wood, 6),
      rect(780, 550, 24, 140, C.woodDeep, 4),
      rect(1116, 550, 24, 140, C.woodDeep, 4),
      rect(860, 470, 90, 50, "#5b646a", 6),
      rect(980, 490, 120, 30, C.steel, 4),
      person({
        x: 500, y: 712, s: 1.42, skin: SKIN[0], hair: "low", top: "#f4f1ea", bottom: C.blue,
        acc: ["overalls", "goggles"],
        arms: { r: { e: [52, -220], h: [70, -262] }, l: { e: [-44, -190], h: [-40, -150] } },
        hold: { r: "spanner" },
      }),
      person({
        x: 770, y: 712, s: 1.36, skin: SKIN[2], hair: "grey", top: C.forest, bottom: "#2b2f33",
        acc: ["apron"], colors: { apron: C.wood },
        arms: { l: { e: [-50, -214], h: [-58, -252] } }, hold: { l: "thumb" },
      }),
      rect(80, 630, 150, 70, C.laterite, 8),
      rect(120, 612, 70, 22, "none", 6, `stroke="${C.lateriteDeep}" stroke-width="8"`),
    ]),

  "category-employment": () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#E3EDF8", ground: "#c7d6e8" }),
      // window with city
      rect(640, 90, 480, 360, "#cfe0f3", 16),
      rect(680, 230, 80, 220, "#9fbbe0"),
      rect(780, 170, 90, 280, "#86a9d6"),
      rect(890, 260, 70, 190, "#9fbbe0"),
      rect(980, 200, 100, 250, "#86a9d6"),
      ...Array.from({ length: 12 }, (_, i) =>
        rect(795 + (i % 3) * 25, 190 + Math.floor(i / 3) * 45, 14, 22, "#e3edf8", 2),
      ),
      line(640, 270, 1120, 270, "#ffffff", 10),
      line(880, 90, 880, 450, "#ffffff", 10),
      person({
        x: 470, y: 712, s: 1.4, skin: SKIN[3], hair: "braids", top: C.forest, bottom: C.ink,
        sleeves: "long", acc: ["lanyard"], colors: { lanyard: C.sun },
        arms: { r: { e: [52, -196], h: [88, -176] }, l: { e: [-44, -190], h: [-38, -152] } },
        hold: { l: "folder" },
      }),
      person({
        x: 730, y: 712, s: 1.4, skin: SKIN[1], hair: "short", top: "#f7f3ea", bottom: "#34405a",
        sleeves: "long", acc: ["collar", "tie"], colors: { tie: C.laterite },
        arms: { l: { e: [-52, -196], h: [-88, -176] } },
      }),
      plant(150, 712, 1.2),
      sparkles([[600, 150, 9], [560, 260, 6], [380, 140, 7]]),
    ]),

  "category-local_work": () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#F8E3D6", sunAt: [1040, 150], sunR: 80, ground: "#b98a5e" }),
      // market stall frame with striped awning
      rect(700, 200, 14, 490, C.woodDeep),
      rect(1150, 200, 14, 490, C.woodDeep),
      ...Array.from({ length: 8 }, (_, i) =>
        path(
          `M${690 + i * 60},190 L${750 + i * 60},190 L${750 + i * 60},250 Q${720 + i * 60},270 ${690 + i * 60},250Z`,
          i % 2 ? C.cream : C.laterite,
        ),
      ),
      // block wall going up
      ...[0, 1, 2, 3].flatMap((row) =>
        Array.from({ length: row === 3 ? 2 : 4 }, (_, i) =>
          rect(70 + i * 92 + (row % 2) * 46, 636 - row * 46, 88, 42, "#a4a9ad", 3),
        ),
      ),
      person({
        x: 560, y: 712, s: 1.42, skin: SKIN[0], hair: "short", top: C.laterite, bottom: C.ink,
        acc: ["hardhat"],
        arms: { r: { e: [48, -262], h: [34, -306] }, l: { e: [-46, -192], h: [-44, -150] } },
        hold: { r: "block" },
      }),
      person({
        x: 830, y: 712, s: 1.38, skin: SKIN[4], hair: "puff", top: C.blue, bottom: C.ink,
        acc: ["hardhat", "vest"],
        arms: { r: { e: [48, -196], h: [76, -166] } },
      }),
      // wheelbarrow
      path("M962,500 L1150,480 L1120,590 L1000,590Z", C.forest),
      `<ellipse cx="1060" cy="488" rx="80" ry="22" fill="#d9b27c"/>`,
      line(935, 482, 1000, 540, C.woodDeep, 10),
      line(1010, 590, 1000, 700, C.woodDeep, 10),
      circle(1120, 648, 42, C.ink),
      circle(1120, 648, 16, C.steel),
    ]),

  sessions: () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#E2EFE8", sunAt: [1060, 140], sunR: 60 }),
      // flipchart
      line(150, 700, 230, 200, C.woodDeep, 12),
      line(330, 700, 250, 200, C.woodDeep, 12),
      rect(120, 170, 240, 300, "#ffffff", 8),
      rect(120, 160, 240, 22, C.woodDeep, 6),
      circle(158, 230, 8, C.laterite),
      line(180, 230, 320, 230, "#b9c4bd", 8),
      circle(158, 290, 8, C.forest),
      line(180, 290, 300, 290, "#b9c4bd", 8),
      circle(158, 350, 8, C.sun),
      line(180, 350, 320, 350, "#b9c4bd", 8),
      person({
        x: 450, y: 712, s: 1.4, skin: SKIN[3], hair: "wrap", wrap: C.forest, top: C.laterite,
        bottom: C.ink, bottomType: "skirt",
        arms: { l: { e: [-58, -252], h: [-104, -276] } },
      }),
      person({
        x: 700, y: 730, s: 1.12, skin: SKIN[0], hair: "short", top: C.sun, legs: false,
        arms: { r: { e: [50, -262], h: [56, -312] } },
      }),
      person({ x: 870, y: 730, s: 1.12, skin: SKIN[4], hair: "afro", top: C.blue, legs: false }),
      person({
        x: 1040, y: 730, s: 1.12, skin: SKIN[2], hair: "braids", top: C.forest, legs: false,
        arms: { l: { e: [-40, -186], h: [-16, -160] } }, hold: { l: "book" },
      }),
      desk(600, 588, 600),
    ]),

  providers: () =>
    svg(W, H, [
      backdrop(W, H, { bg: "#F2EBDD", ground: "#d9cbb0" }),
      // shop awning
      ...Array.from({ length: 11 }, (_, i) =>
        path(
          `M${520 + i * 62},70 L${582 + i * 62},70 L${582 + i * 62},150 Q${551 + i * 62},176 ${520 + i * 62},150Z`,
          i % 2 ? C.cream : C.forest,
        ),
      ),
      // shelves
      rect(560, 210, 600, 14, C.woodDeep),
      rect(560, 330, 600, 14, C.woodDeep),
      ...[C.laterite, C.sun, C.blue, C.forest, C.laterite, C.sun, C.blue].map((c, i) =>
        rect(580 + i * 82, 230 - (i % 2) * 12 + 50 - 60, 60, 70 + (i % 2) * 12, c, 6),
      ),
      ...[C.sun, C.forest, C.laterite, C.blue, C.sun, C.forest, C.laterite].map((c, i) =>
        rect(580 + i * 82, 260 + 20, 60, 50, c, 6, 'opacity="0.85"'),
      ),
      // noticeboard with listings
      rect(80, 150, 380, 300, C.wood, 14),
      rect(96, 166, 348, 268, "#e8d2a6", 8),
      ...[
        [120, 190, C.cream], [280, 196, "#e3edf8"], [130, 310, "#fdf0d2"], [290, 316, C.cream],
      ].map(([x, y, c]) => rect(x, y, 130, 96, c, 4) + circle(x + 65, y + 8, 7, C.laterite) + line(x + 18, y + 40, x + 110, y + 40, "#c9bfae", 6) + line(x + 18, y + 64, x + 90, y + 64, "#c9bfae", 6)),
      circle(420, 180, 30, C.forest),
      `<path d="M406,180 L416,190 L434,170" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      // counter
      rect(560, 560, 600, 34, C.wood, 6),
      person({
        x: 790, y: 740, s: 1.38, skin: SKIN[2], hair: "puff", top: C.sun, legs: false,
        acc: ["apron"], colors: { apron: C.forest },
        arms: { r: { e: [46, -200], h: [24, -196] }, l: { e: [-46, -200], h: [-24, -196] } },
        hold: { r: "tablet" },
      }),
      rect(560, 592, 600, 220, C.woodDeep),
      plant(300, 712, 1.1),
    ]),

  hero: () =>
    svg(880, 960, [
      rect(0, 0, 880, 960, C.forest),
      circle(170, 190, 120, C.sun, 'opacity="0.18"'),
      circle(170, 190, 78, C.sun),
      path("M0,520 C176,410 330,456 484,390 S748,330 880,384 V960 H0Z", C.forestDeep),
      path("M0,640 C220,560 418,624 594,550 S814,520 880,540 V960 H0Z", C.laterite),
      path("M0,760 C242,706 484,746 682,706 S858,694 880,706 V960 H0Z", C.lateriteDeep),
      // three rising steps, the logo's idea
      rect(240, 870, 180, 90, C.cream, 10),
      rect(420, 800, 180, 160, "#f1e7d3", 10),
      rect(600, 730, 180, 230, C.cream, 10),
      rect(240, 870, 180, 14, C.sun, 6),
      rect(420, 800, 180, 14, C.sun, 6),
      rect(600, 730, 180, 14, C.sun, 6),
      person({
        x: 690, y: 734, s: 0.7, skin: SKIN[2], hair: "puff", top: C.sun, bottom: C.blue,
        acc: ["backpack"], colors: { pack: C.laterite },
        arms: { r: { e: [54, -258], h: [64, -312] } },
      }),
      person({
        x: 510, y: 804, s: 0.68, skin: SKIN[0], hair: "short", top: "#f7f3ea", bottom: C.ink,
        arms: { r: { e: [48, -230], h: [86, -262] } }, hold: { l: "book" },
      }),
      sparkles([[600, 560, 8], [400, 620, 6], [800, 600, 7]], [C.sun, C.cream]),
    ]),
};

await mkdir(OUT, { recursive: true });
for (const [name, draw] of Object.entries(SCENES)) {
  const file = `${OUT}${name}.webp`;
  const info = await sharp(Buffer.from(draw()))
    .webp({ quality: 78, effort: 6 })
    .toFile(file);
  console.log(`${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
if (process.argv.includes("--svg")) {
  for (const [name, draw] of Object.entries(SCENES)) {
    await writeFile(`${OUT}${name}.svg`, draw());
  }
}
