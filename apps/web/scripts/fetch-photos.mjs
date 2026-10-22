// Downloads the site photos from Pexels and saves them as .webp in public/images.
//
//   bun run images
//
// The photos are free to use under the Pexels licence
// (https://www.pexels.com/license/). Credit is not required but is kept below.
// They show models, not Awgu StepForward users, and must never be presented as
// such. The one exception is AfricaPlan Foundation's own photo (see
// LISTING_PHOTOS). To swap a photo, change its id here and run the script again.

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

// One photo per demo listing, saved as public/images/listings/<name>.webp
// (1200x800). The names match LISTING_IMAGES and the image_url values in
// backend/app/scripts/seed_demo.py.
const LISTING_PHOTOS = [
  // AfricaPlan Foundation's own photo from the HackathonAfrica 3.0 banner on
  // africaplanfoundation.org, used for the sample 4.0 listing we prepared for
  // them. Get their written permission before using it beyond the pitch.
  {
    name: "hackathonafrica",
    src: "https://africaplanfoundation.org/wp-content/uploads/2024/05/DSC_0804.jpg",
    credit: "AfricaPlan Foundation",
    url: "https://africaplanfoundation.org/",
  },
  { name: "3mtt", id: 33920044, credit: "Zeal Creative Studios", url: "https://www.pexels.com/photo/focused-students-in-it-workshop-in-accra-33920044/" },
  { name: "animation", id: 29235418, credit: "Wolf Art", url: "https://www.pexels.com/photo/digital-artist-sketching-on-tablet-29235418/" },
  { name: "artisan-training", id: 16850257, credit: "Safari Consoler", url: "https://www.pexels.com/photo/carpenter-teaching-two-young-boys-in-the-workshop-16850257/" },
  { name: "beads", id: 40247355, credit: "Nana Tchuingwa", url: "https://www.pexels.com/photo/african-artisan-crafting-with-beaded-bracelets-40247355/" },
  { name: "borehole", id: 21047659, credit: "Rahul Bokhare", url: "https://www.pexels.com/photo/worker-watching-a-machine-drilling-a-well-21047659/" },
  { name: "carpentry", id: 16850260, credit: "Safari Consoler", url: "https://www.pexels.com/photo/carpenter-working-with-planks-16850260/" },
  { name: "cassava", id: 39300686, credit: "Giulia Azevedo-Baptista", url: "https://www.pexels.com/photo/traditional-cassava-processing-by-hand-39300686/" },
  { name: "clinic-desk", id: 5722166, credit: "cottonbro studio", url: "https://www.pexels.com/photo/a-woman-in-scrubs-holding-a-clipboard-5722166/" },
  { name: "coding", id: 19805876, credit: "Naboth Otieno", url: "https://www.pexels.com/photo/man-working-on-computer-in-an-office-19805876/" },
  { name: "community-class", id: 32809721, credit: "Bobby Dimas", url: "https://www.pexels.com/photo/outdoor-community-gathering-with-speaker-32809721/" },
  { name: "computer-class", id: 10638065, credit: "Ron Lach", url: "https://www.pexels.com/photo/students-using-computers-10638065/" },
  { name: "computer-exam", id: 37456293, credit: "Gabriel Joe Amuzu", url: "https://www.pexels.com/photo/students-in-classroom-during-exam-37456293/" },
  { name: "construction", id: 33597033, credit: "snazzy Photography", url: "https://www.pexels.com/photo/workers-building-at-a-construction-site-in-kaduna-33597033/" },
  { name: "customer-support", id: 7689662, credit: "Jep Gambardella", url: "https://www.pexels.com/photo/smiling-woman-working-in-call-center-7689662/" },
  { name: "data-entry", id: 3880924, credit: "Andrea Piacquadio", url: "https://www.pexels.com/photo/focused-black-man-working-with-laptop-in-workspace-3880924/" },
  { name: "delivery-rider", id: 34635135, credit: "Solomon Onyeagoro", url: "https://www.pexels.com/photo/delivery-motorcycle-on-abuja-city-street-34635135/" },
  { name: "digital-marketing", id: 34708698, credit: "Konteh Graphics", url: "https://www.pexels.com/photo/young-professionals-collaborating-on-laptop-34708698/" },
  { name: "electrician", id: 20500461, credit: "Audy of Course", url: "https://www.pexels.com/photo/a-female-electrician-standing-on-a-ladder-and-holding-cables-20500461/" },
  { name: "event-setup", id: 31528164, credit: "Kaybee Photography", url: "https://www.pexels.com/photo/outdoor-community-event-under-tent-canopy-31528164/" },
  { name: "exam-hall", id: 30058879, credit: "Khalifa Yahaya", url: "https://www.pexels.com/photo/young-student-writing-in-a-classroom-setting-30058879/" },
  { name: "export-business", id: 7552562, credit: "Hanna Pad", url: "https://www.pexels.com/photo/a-woman-smiling-while-carrying-boxes-7552562/" },
  { name: "farmer-field", id: 34705724, credit: "Achor David", url: "https://www.pexels.com/photo/smiling-nigerian-farmer-with-fresh-tomatoes-34705724/" },
  { name: "female-scholars", id: 6549597, credit: "Tima Miroshnichenko", url: "https://www.pexels.com/photo/a-woman-holding-a-stack-of-books-6549597/" },
  { name: "first-aid", id: 6520073, credit: "RDNE Stock project", url: "https://www.pexels.com/photo/paramedic-helping-a-man-6520073/" },
  { name: "fish-farm", id: 19040471, credit: "juliane Monari", url: "https://www.pexels.com/photo/close-up-of-a-person-holding-a-catfish-19040471/" },
  { name: "furniture-shop", id: 6969830, credit: "Max Vakhtbovych", url: "https://www.pexels.com/photo/stylish-interior-design-of-modern-living-room-in-furniture-showroom-6969830/" },
  { name: "graduation", id: 33799982, credit: "Skylight Views", url: "https://www.pexels.com/photo/female-graduate-celebrating-achievement-in-nigeria-33799982/" },
  { name: "green-tech", id: 8853502, credit: "Los Muertos Crew", url: "https://www.pexels.com/photo/solar-technician-installing-solar-panel-8853502/" },
  { name: "harvest", id: 11196879, credit: "Safari Consoler", url: "https://www.pexels.com/photo/people-working-on-the-farm-field-11196879/" },
  { name: "hotel-reception", id: 7820355, credit: "Mikhail Nilov", url: "https://www.pexels.com/photo/a-man-talking-to-woman-7820355/" },
  { name: "laptop-study", id: 5940710, credit: "Kampus Production", url: "https://www.pexels.com/photo/smart-young-ethnic-guy-browsing-laptop-during-lesson-in-university-5940710/" },
  { name: "loading", id: 7464266, credit: "RDNE Stock project", url: "https://www.pexels.com/photo/two-men-carrying-a-sofa-7464266/" },
  { name: "mechanic", id: 28153670, credit: "dionisio castigotivane", url: "https://www.pexels.com/photo/a-young-man-is-working-on-a-car-engine-28153670/" },
  { name: "motorcycle-repair", id: 34196071, credit: "mk_photoz", url: "https://www.pexels.com/photo/mechanic-repairing-motorcycle-in-kaduna-nigeria-34196071/" },
  { name: "motorcycle-rider", id: 36547283, credit: "Taiye Salawu", url: "https://www.pexels.com/photo/motorcyclist-on-urban-street-in-abuja-nigeria-36547283/" },
  { name: "nursing", id: 6129496, credit: "RDNE Stock project", url: "https://www.pexels.com/photo/nurse-wearing-a-scrub-suit-smiling-6129496/" },
  { name: "online-courses", id: 6578420, credit: "Andres Ayrton", url: "https://www.pexels.com/photo/thoughtful-black-guy-browsing-laptop-in-room-6578420/" },
  { name: "painting", id: 36153946, credit: "Dave Garcia", url: "https://www.pexels.com/photo/construction-workers-painting-interior-walls-36153946/" },
  { name: "pastry", id: 6578890, credit: "Andres Ayrton", url: "https://www.pexels.com/photo/positive-black-woman-mixing-ingredients-6578890/" },
  { name: "pharmacy", id: 30678215, credit: "Ninthgrid", url: "https://www.pexels.com/photo/african-customers-shopping-in-lagos-pharmacy-30678215/" },
  { name: "phone-business", id: 6994316, credit: "Kindel Media", url: "https://www.pexels.com/photo/a-woman-holding-a-smartphone-and-shopping-bags-6994316/" },
  { name: "phone-repair", id: 34264956, credit: "mk_photoz", url: "https://www.pexels.com/photo/outdoor-electronics-repair-in-kaduna-nigeria-34264956/" },
  { name: "pos-agent", id: 3801439, credit: "Andrea Piacquadio", url: "https://www.pexels.com/photo/woman-working-as-a-cashier-3801439/" },
  { name: "postgraduate", id: 10744384, credit: "Peter Chikubula", url: "https://www.pexels.com/photo/people-on-the-table-reading-books-10744384/" },
  { name: "poultry", id: 37748139, credit: "Speak Media Uganda", url: "https://www.pexels.com/photo/mother-and-daughter-feeding-chickens-outdoors-37748139/" },
  { name: "road-work", id: 33691603, credit: "josh_ dago__", url: "https://www.pexels.com/photo/road-maintenance-workers-in-kampala-uganda-33691603/" },
  { name: "school-children", id: 12448839, credit: "Armstrong Opulency", url: "https://www.pexels.com/photo/children-at-school-12448839/" },
  { name: "secondary-students", id: 34162709, credit: "Tosin Olowoleni", url: "https://www.pexels.com/photo/group-of-nigerian-schoolchildren-in-classroom-34162709/" },
  { name: "shop-assistant", id: 30019730, credit: "Muhammad-Taha Ibrahim", url: "https://www.pexels.com/photo/local-shopkeeper-posing-in-abuja-market-30019730/" },
  { name: "site-clipboard", id: 8960942, credit: "Mikael Blomkvist", url: "https://www.pexels.com/photo/woman-wearing-safety-helmet-holding-a-whiteboard-8960942/" },
  { name: "soap-making", id: 7055158, credit: "Pavel Danilyuk", url: "https://www.pexels.com/photo/artisan-soaps-in-a-ceramic-dish-7055158/" },
  { name: "solar-install", id: 30285845, credit: "Pexels User", url: "https://www.pexels.com/photo/technician-installing-solar-panels-on-rooftop-30285845/" },
  { name: "stem-women", id: 8515138, credit: "Yaroslav Shuraev", url: "https://www.pexels.com/photo/woman-wearing-laboratory-gown-holding-a-microscope-while-looking-at-the-camera-8515138/" },
  { name: "student-loan", id: 30243808, credit: "Shot By Khalid", url: "https://www.pexels.com/photo/graduates-in-traditional-cap-and-gown-attire-in-lagos-30243808/" },
  { name: "tailoring", id: 38500516, credit: "D Flamez", url: "https://www.pexels.com/photo/traditional-sewing-in-lagos-outdoor-market-38500516/" },
  { name: "university-students", id: 36347347, credit: "Skylight Views", url: "https://www.pexels.com/photo/graduation-group-photo-in-front-of-university-building-36347347/" },
  { name: "waiters", id: 28736724, credit: "Prosper Buka", url: "https://www.pexels.com/photo/catering-service-with-appetizers-at-event-in-enugu-28736724/" },
  { name: "wiring", id: 34526423, credit: "mickael ange konan", url: "https://www.pexels.com/photo/female-technician-working-on-electrical-control-panel-34526423/" },
  { name: "women-farmers", id: 31537320, credit: "Ahmed Abubakar Bature", url: "https://www.pexels.com/photo/african-women-harvesting-tea-in-taraba-nigeria-31537320/" },
  { name: "workshop-group", id: 29328857, credit: "Chris Wade Ntezicimpa", url: "https://www.pexels.com/photo/young-woman-speaks-at-indoor-conference-event-29328857/" },
];

for (const photo of LISTING_PHOTOS) {
  PHOTOS.push({
    width: 1200,
    height: 800,
    position: "attention",
    ...photo,
    name: `listings/${photo.name}`,
  });
}

await mkdir(`${OUT}listings`, { recursive: true });

for (const photo of PHOTOS) {
  // Ask Pexels for twice the final width so the crop stays sharp.
  const src =
    photo.src ??
    `https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg?auto=compress&cs=tinysrgb&w=${photo.width * 2}`;
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
