// Downloads the site photos from Pexels and saves them as .webp in public/images.
//
//   bun run images
//
// The photos are free to use under the Pexels licence
// (https://www.pexels.com/license/). Credit is not required but is kept below.
// They show models, not Awgu StepForward users, and must never be presented as
// such. To swap a photo, change its id here and run the script again.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = fileURLToPath(new URL("../public/images/", import.meta.url));

// Width and height must match src/lib/images.ts. `position` picks which part
// of the photo survives the crop (a sharp position, or "attention" for the
// busiest area). For a tall photo, `top` instead sets how far down the crop
// sits, from 0 (top edge) to 1 (bottom edge).
const PHOTOS = [
  {
    name: "hero",
    id: 38956556,
    width: 880,
    height: 960,
    // The featured listing card covers the top of the hero, so keep the face low.
    top: 0,
    credit: "Warshu Media concept",
    url: "https://www.pexels.com/photo/smiling-woman-in-vibrant-orange-top-outdoors-38956556/",
  },
  {
    name: "sessions",
    id: 32326229,
    width: 1200,
    height: 800,
    position: "centre",
    credit: "Daniel Samson",
    url: "https://www.pexels.com/photo/young-adults-attending-indoor-conference-32326229/",
  },
  {
    name: "providers",
    id: 30688593,
    width: 1200,
    height: 800,
    position: "centre",
    credit: "Ninthgrid",
    url: "https://www.pexels.com/photo/casual-office-meeting-in-lagos-nigeria-30688593/",
  },
  {
    name: "category-scholarship",
    id: 35531445,
    width: 1200,
    height: 800,
    top: 0.45,
    credit: "Jagaba Denis",
    url: "https://www.pexels.com/photo/nigerian-university-graduate-studying-in-library-35531445/",
  },
  {
    name: "category-training",
    id: 33920044,
    width: 1200,
    height: 800,
    position: "centre",
    credit: "Zeal Creative Studios",
    url: "https://www.pexels.com/photo/focused-students-in-it-workshop-in-accra-33920044/",
  },
  {
    name: "category-apprenticeship",
    id: 37907669,
    width: 1200,
    height: 800,
    position: "centre",
    credit: "alameen .ng",
    url: "https://www.pexels.com/photo/young-artisan-working-in-nigeria-building-37907669/",
  },
  {
    name: "category-employment",
    id: 9301262,
    width: 1200,
    height: 800,
    position: "attention",
    credit: "Mikhail Nilov",
    url: "https://www.pexels.com/photo/man-using-laptop-working-in-the-office-9301262/",
  },
  {
    name: "category-local_work",
    id: 34037175,
    width: 1200,
    height: 800,
    position: "centre",
    credit: "LekePOV",
    url: "https://www.pexels.com/photo/street-vendor-selling-produce-at-local-market-34037175/",
  },
];

await mkdir(OUT, { recursive: true });

for (const photo of PHOTOS) {
  // Ask Pexels for twice the final width so the crop stays sharp.
  const src = `https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg?auto=compress&cs=tinysrgb&w=${photo.width * 2}`;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${photo.name}: ${res.status} from ${src}`);
  let image = sharp(Buffer.from(await res.arrayBuffer()));
  if (photo.top === undefined) {
    image = image.resize(photo.width, photo.height, { fit: "cover", position: photo.position });
  } else {
    const scaled = await image.resize({ width: photo.width }).toBuffer({ resolveWithObject: true });
    const top = Math.round((scaled.info.height - photo.height) * photo.top);
    image = sharp(scaled.data).extract({ left: 0, top, width: photo.width, height: photo.height });
  }
  const webp = await image.webp({ quality: 78 }).toBuffer();
  await writeFile(`${OUT}${photo.name}.webp`, webp);
  console.log(`${photo.name}.webp  ${(webp.length / 1024).toFixed(0)} KB  (${photo.credit})`);
}
