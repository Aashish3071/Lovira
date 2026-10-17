// Usage: npm run make-demo
// Generates the sample people for demo mode:
//   src/lib/backend/demo-people.json  (profiles)
//   public/demo/*.svg                 (illustrated photos, selfies and SAMPLE ID cards)
// Pictures are DiceBear "Avataaars" illustrations (free for personal and commercial use),
// so no real person's face is used for a fake dating profile.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

const SKIN = { deep: "614335", brown: "ae5d29", tan: "d08b5b", light: "edb98a" };
const BG = ["fde2e4", "e2ece9", "dfe7fd", "fff1e6", "e9d8fd", "d7f3f5", "fef3c7", "fce7f3", "dcfce7", "e0f2fe"];

const P = (q, a) => ({ q, a });

// [name, age, gender, show_me, city, state, look, bio, prompts, orientations, gender_custom]
const PEOPLE = [
  ["Ananya", 26, "woman", ["man"], "Mumbai", "Maharashtra", { top: "longButNotTooLong", skin: "tan", hair: "2c1b18" }, "Product designer who sketches strangers on local trains. Will judge your vada pav spot.", [P("A perfect Sunday looks like…", "Marine Drive at 7am, then a very long nap."), P("I geek out on…", "Typography and Bollywood trivia.")], ["straight"]],
  ["Ishita", 28, "woman", ["man", "woman"], "Mumbai", "Maharashtra", { top: "bob", skin: "light", hair: "724133", acc: "round" }, "Lawyer by day, stand-up open-mic regular by night. Yes, I'll roast you (lovingly).", [P("Two truths and a lie…", "I've met SRK, I can't swim, I hate biryani."), P("A green flag I look for…", "You're kind to waiters.")], ["bisexual"]],
  ["Meera", 25, "woman", ["man"], "Pune", "Maharashtra", { top: "curvy", skin: "brown", hair: "2c1b18" }, "Data scientist, part-time baker, full-time dog aunty. Looking for someone to split dessert with.", [P("My go-to chai/coffee order…", "Cutting chai, extra adrak."), P("I'm looking for…", "Someone who texts back before the chai gets cold.")], ["straight"]],
  ["Riya", 27, "woman", ["man", "non_binary"], "Pune", "Maharashtra", { top: "straight01", skin: "tan", hair: "4a312c" }, "Trekker. Sahyadris every monsoon. I'll make you carry the Maggi.", [P("My favourite place in my city…", "Sinhagad fort at sunrise."), P("The way to win me over is…", "A good playlist for a long drive.")], ["straight", "queer"]],
  ["Sana", 29, "woman", ["man"], "Bengaluru", "Karnataka", { top: "hijab", skin: "tan", hair: "2c1b18" }, "Startup founder, filter-coffee loyalist, terrible at Kannada but trying.", [P("I geek out on…", "Climate tech and old Hindi songs."), P("A perfect Sunday looks like…", "Cubbon Park, a book, no phone.")], ["straight"]],
  ["Tara", 24, "woman", ["woman", "non_binary"], "Goa", "Goa", { top: "frizzle", skin: "light", hair: "c93305", acc: "wayfarers" }, "Surf instructor. Sunsets are my personality. Looking for my person to share fish thali with.", [P("I'm looking for…", "Something slow and real."), P("Two truths and a lie…", "I've surfed in Bali, I'm scared of crabs, I hate the beach.")], ["lesbian"]],
  ["Priya", 30, "woman", ["man"], "Chennai", "Tamil Nadu", { top: "miaWallace", skin: "deep", hair: "2c1b18" }, "Carnatic violinist and software engineer. I can debug code and play Thyagaraja.", [P("My go-to chai/coffee order…", "Filter coffee, always."), P("A green flag I look for…", "You call your amma back.")], ["straight"]],
  ["Kavya", 26, "woman", ["man"], "Hyderabad", "Telangana", { top: "bun", skin: "brown", hair: "2c1b18" }, "Doctor in residency. If I reply at 3am, that's my lunch break.", [P("The way to win me over is…", "Biryani from the right place. You know the one."), P("I'm looking for…", "Patience and good humour.")], ["straight"]],
  ["Zoya", 27, "trans_woman", ["man", "woman"], "Delhi", "Delhi", { top: "straightAndStrand", skin: "light", hair: "2c1b18", acc: "prescription02" }, "Fashion stylist. I'll fix your wardrobe and your playlist.", [P("A perfect Sunday looks like…", "Sunder Nursery picnic, then Hauz Khas."), P("I geek out on…", "Vintage sarees.")], ["pansexual"]],
  ["Aditi", 25, "woman", ["man"], "Delhi", "Delhi", { top: "longButNotTooLong", skin: "light", hair: "4a312c" }, "UPSC dropout turned journalist. I ask a lot of questions, sorry not sorry.", [P("Two truths and a lie…", "I've interviewed a minister, I can't cook, I love winters."), P("I'm looking for…", "Long conversations on long walks.")], ["straight"]],
  ["Nandini", 31, "woman", ["man"], "Kolkata", "West Bengal", { top: "curly", skin: "tan", hair: "2c1b18" }, "Professor of literature. Rabindrasangeet and rosogolla, non-negotiable.", [P("My favourite place in my city…", "College Street book stalls."), P("The way to win me over is…", "Recommend me a book I haven't read.")], ["straight"]],
  ["Pooja", 28, "woman", ["man"], "Jaipur", "Rajasthan", { top: "bigHair", skin: "tan", hair: "2c1b18" }, "Runs a block-print studio. Will drag you to every haveli in the old city.", [P("I geek out on…", "Natural dyes and old architecture."), P("A perfect Sunday looks like…", "Nahargarh at sunset.")], ["straight"]],
  ["Simran", 26, "woman", ["man", "woman"], "Chandigarh", "Chandigarh", { top: "straight02", skin: "light", hair: "724133" }, "Physio and gym rat. I'll fix your posture on the first date.", [P("A green flag I look for…", "You don't skip leg day. Or dessert."), P("I'm looking for…", "A gym buddy who becomes more.")], ["bisexual"]],
  ["Fatima", 27, "woman", ["man"], "Lucknow", "Uttar Pradesh", { top: "hijab", skin: "light", hair: "2c1b18", acc: "round" }, "Architect who restores old buildings. Tehzeeb is a love language.", [P("The way to win me over is…", "Tunday kebabs and Urdu poetry."), P("My favourite place in my city…", "The Bara Imambara.")], ["straight"]],
  ["Diya", 23, "woman", ["man"], "Ahmedabad", "Gujarat", { top: "bob", skin: "tan", hair: "2c1b18" }, "Final-year design student. Garba champion three years running.", [P("Two truths and a lie…", "I've never had dhokla, I love Navratri, I can sketch you in 2 minutes."), P("I'm looking for…", "Someone who can keep up on the dance floor.")], ["straight"]],

  ["Rohan", 28, "man", ["woman"], "Mumbai", "Maharashtra", { top: "shortFlat", skin: "tan", hair: "2c1b18", beard: "beardLight" }, "Investment banker who actually leaves office by 8. Mostly.", [P("A perfect Sunday looks like…", "Cricket at Shivaji Park, then brunch in Bandra."), P("My go-to chai/coffee order…", "Cold coffee, no judgment please.")], ["straight"]],
  ["Kabir", 27, "man", ["man"], "Mumbai", "Maharashtra", { top: "shortWaved", skin: "light", hair: "4a312c", acc: "wayfarers" }, "Film editor. I'll rate your favourite movie out of 10, honestly.", [P("I geek out on…", "Wong Kar-wai films and street photography."), P("The way to win me over is…", "Late-night Irani café runs.")], ["gay"]],
  ["Arjun", 29, "man", ["woman"], "Bengaluru", "Karnataka", { top: "shortCurly", skin: "brown", hair: "2c1b18", beard: "beardMedium" }, "Backend engineer, weekend guitarist, believer in the perfect dosa.", [P("Two truths and a lie…", "I've run a marathon, I play the tabla, I hate coffee."), P("I'm looking for…", "Someone to explore new cafes with.")], ["straight"]],
  ["Vikram", 31, "man", ["woman"], "Delhi", "Delhi", { top: "theCaesar", skin: "tan", hair: "2c1b18", beard: "beardMajestic" }, "Chef at a modern Indian restaurant. I'll cook, you pick the wine.", [P("The way to win me over is…", "Eat everything I make and tell me honestly."), P("A green flag I look for…", "Curiosity.")], ["straight"]],
  ["Aditya", 26, "man", ["woman", "man"], "Ahmedabad", "Gujarat", { top: "shortRound", skin: "tan", hair: "2c1b18", acc: "prescription01" }, "Architect. I notice buildings before I notice people (working on it).", [P("I geek out on…", "Brutalist architecture and kite flying."), P("A perfect Sunday looks like…", "Sabarmati riverfront cycling.")], ["bisexual"]],
  ["Karan", 30, "man", ["woman"], "Jaipur", "Rajasthan", { top: "sides", skin: "tan", hair: "2c1b18", beard: "moustacheFancy" }, "Hotelier from a family of hoteliers. Polo on weekends, I promise I'm not posh.", [P("My favourite place in my city…", "Rooftops of the old city at dusk."), P("I'm looking for…", "Someone who laughs easily.")], ["straight"]],
  ["Yash", 25, "man", ["woman"], "Lucknow", "Uttar Pradesh", { top: "shaggy", skin: "light", hair: "4a312c" }, "Music producer. I'll make a song about you (if the date goes well).", [P("Two truths and a lie…", "I've played at NH7, I'm shy, I can't sing."), P("The way to win me over is…", "Send me your weirdest song.")], ["straight"]],
  ["Rahul", 32, "man", ["woman"], "Hyderabad", "Telangana", { top: "theCaesarAndSidePart", skin: "brown", hair: "2c1b18", beard: "beardLight" }, "Product manager. Planning nerd, but spontaneous when it counts.", [P("A green flag I look for…", "Big dreams, small talk optional."), P("My go-to chai/coffee order…", "Irani chai with Osmania biscuits.")], ["straight"]],
  ["Imran", 28, "man", ["woman"], "Kolkata", "West Bengal", { top: "shortFlat", skin: "tan", hair: "2c1b18", beard: "beardMedium" }, "Football coach for kids. East Bengal till I die.", [P("I'm looking for…", "Someone who'll come to matches with me."), P("A perfect Sunday looks like…", "Maidan football then kathi rolls.")], ["straight"]],
  ["Siddharth", 27, "man", ["man", "non_binary"], "Pune", "Maharashtra", { top: "frizzle", skin: "light", hair: "724133", acc: "round" }, "Theatre actor and UX writer. Words are my whole thing.", [P("I geek out on…", "Marathi theatre and crossword puzzles."), P("The way to win me over is…", "Quote a play at me.")], ["gay", "queer"]],

  ["Sam", 26, "non_binary", ["woman", "non_binary", "man"], "Delhi", "Delhi", { top: "shavedSides", skin: "tan", hair: "f59797" }, "Illustrator and zine-maker. They/them. Soft heart, loud jackets.", [P("I'm looking for…", "Gentle chaos and good conversations."), P("Two truths and a lie…", "I've self-published 12 zines, I own 40 plants, I hate glitter.")], ["queer", "pansexual"]],
  ["Ash", 28, "genderqueer", ["woman", "man", "non_binary", "genderqueer", "trans_woman", "trans_man"], "Kochi", "Kerala", { top: "dreads01", skin: "brown", hair: "2c1b18" }, "Marine biologist. I talk to fish and occasionally to people.", [P("My favourite place in my city…", "Fort Kochi at low tide."), P("A green flag I look for…", "You care about the ocean.")], ["queer"]],
  ["Dev", 29, "trans_man", ["woman", "non_binary"], "Hyderabad", "Telangana", { top: "shortWaved", skin: "brown", hair: "2c1b18", beard: "beardLight" }, "Physiotherapist and amateur boxer. Big on loyalty, bigger on biryani.", [P("The way to win me over is…", "Show up on time. That's it, that's the list."), P("A perfect Sunday looks like…", "Gym, Golconda, game night.")], ["straight"]],
  ["Noor", 25, "non_binary", ["woman", "non_binary", "genderqueer"], "Bengaluru", "Karnataka", { top: "bob", skin: "tan", hair: "c93305", acc: "prescription02" }, "Game developer. I will absolutely beat you at Mario Kart.", [P("I geek out on…", "Indie games and pixel art."), P("I'm looking for…", "A player two.")], ["lesbian", "queer"]],
  ["Leela", 30, "trans_woman", ["man"], "Chennai", "Tamil Nadu", { top: "longButNotTooLong", skin: "deep", hair: "2c1b18" }, "Bharatanatyam dancer and HR lead. Grace under pressure, mostly.", [P("A perfect Sunday looks like…", "Besant Nagar beach and sundal."), P("I'm looking for…", "Someone steady.")], ["straight"]],
];

// People waiting for admin review in the demo admin panel.
const APPLICANTS = [
  ["Neha", 24, "woman", ["man"], "Mumbai", "Maharashtra", { top: "straight01", skin: "tan", hair: "2c1b18" }, "New to the city, looking for friends first.", [], ["straight"], "driving_licence"],
  ["Manav", 33, "man", ["woman"], "Delhi", "Delhi", { top: "shortFlat", skin: "light", hair: "2c1b18", beard: "beardMedium" }, "Entrepreneur. Love travel and food.", [], ["straight"], "pan"],
  ["Alex", 22, "non_binary", ["woman", "non_binary"], "Pune", "Maharashtra", { top: "shaggyMullet", skin: "light", hair: "d6b370" }, "Student, artist, cat person.", [], ["queer"], "passport"],
];

const slug = (name, i) => `${name.toLowerCase()}-${i}`;

function avatar(look, seed, variant) {
  return createAvatar(avataaars, {
    seed,
    top: [look.top],
    skinColor: [SKIN[look.skin]],
    hairColor: [look.hair],
    facialHair: look.beard ? [look.beard] : [],
    facialHairProbability: look.beard ? 100 : 0,
    facialHairColor: [look.hair],
    accessories: look.acc ? [look.acc] : [],
    accessoriesProbability: look.acc && variant === 0 ? 100 : 0,
    mouth: [variant === 0 ? "smile" : "twinkle"],
    eyes: [variant === 0 ? "happy" : "default"],
    eyebrows: ["defaultNatural"],
    clothing: [variant === 0 ? "shirtCrewNeck" : "hoodie"],
    backgroundColor: [BG[(seed.length * 3 + variant * 5) % BG.length]],
    radius: 0,
  }).toString();
}

function idCard(name, dob, idType, face) {
  const title = { pan: "PERMANENT ACCOUNT NUMBER", driving_licence: "DRIVING LICENCE", passport: "PASSPORT" }[idType];
  const inner = face.replace("<svg", '<svg x="28" y="78" width="120" height="120"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" rx="16" fill="#eef2ff" stroke="#94a3b8"/><rect width="400" height="56" rx="16" fill="#1e3a8a"/><rect y="40" width="400" height="16" fill="#1e3a8a"/><text x="20" y="35" font-family="Arial" font-size="16" font-weight="bold" fill="#fff">${title}</text>${inner}<g font-family="Arial" fill="#0f172a"><text x="168" y="100" font-size="12" fill="#64748b">Name</text><text x="168" y="120" font-size="18" font-weight="bold">${name.toUpperCase()}</text><text x="168" y="148" font-size="12" fill="#64748b">Date of birth</text><text x="168" y="166" font-size="16">${dob}</text><text x="168" y="192" font-size="12" fill="#64748b">Number</text><text x="168" y="210" font-size="16">XXXX XXXX 4821</text></g><text x="200" y="140" font-family="Arial" font-size="56" font-weight="bold" fill="#e11d48" fill-opacity="0.18" text-anchor="middle" transform="rotate(-18 200 140)">SAMPLE</text></svg>`;
}

const dobFor = (age, i) => `${new Date().getFullYear() - age - 1}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`;

rmSync("public/demo", { recursive: true, force: true });
mkdirSync("public/demo", { recursive: true });

const toProfile = ([name, age, gender, show_me, city, state, look, bio, prompts, orientations], i, prefix) => {
  const id = `${prefix}-${slug(name, i)}`;
  const photos = [0, 1].map((v) => {
    const file = `demo/${id}-${v}.svg`;
    writeFileSync(`public/${file}`, avatar(look, id, v));
    return `/${file}`;
  });
  return { id, name, age, dob: dobFor(age, i), gender, gender_custom: null, orientations, show_me, city, state, bio, prompts, photos, verified: true };
};

const people = PEOPLE.map((p, i) => toProfile(p, i, "p"));
const applicants = APPLICANTS.map((p, i) => {
  const profile = { ...toProfile(p, i, "a"), verified: false };
  const selfie = `demo/${profile.id}-selfie.svg`;
  writeFileSync(`public/${selfie}`, avatar(p[6], profile.id, 1));
  const id = `demo/${profile.id}-id.svg`;
  writeFileSync(`public/${id}`, idCard(profile.name, profile.dob, p[10], avatar(p[6], profile.id, 0)));
  return { profile, id_type: p[10], selfie_path: `/${selfie}`, id_path: `/${id}` };
});

// Photos for the ready-made "sample account" (the person giving the demo).
const ME = { top: "shortWaved", skin: "tan", hair: "2c1b18", beard: "beardLight" };
const me = [0, 1].map((v) => {
  writeFileSync(`public/demo/me-${v}.svg`, avatar(ME, "me-sample", v));
  return `/demo/me-${v}.svg`;
});

writeFileSync("src/lib/backend/demo-people.json", JSON.stringify({ people, applicants, me }, null, 1) + "\n");
console.log(`Wrote ${people.length} profiles and ${applicants.length} applicants.`);
