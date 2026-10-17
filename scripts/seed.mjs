// Usage: npm run seed
// Creates 20 verified TEST profiles (emails test1@lovira.test … test20@lovira.test) so the feed
// has people in it during development. Never run this against your live project.
import zlib from "node:zlib";
import { admin } from "./env.mjs";

const db = admin();

const PEOPLE = [
  ["Aanya", "woman", ["man"], "Mumbai", "Maharashtra"], ["Rohan", "man", ["woman"], "Mumbai", "Maharashtra"],
  ["Ishita", "woman", ["man", "woman"], "Pune", "Maharashtra"], ["Kabir", "man", ["man"], "Mumbai", "Maharashtra"],
  ["Meera", "woman", ["woman"], "Bengaluru", "Karnataka"], ["Arjun", "man", ["woman"], "Bengaluru", "Karnataka"],
  ["Sam", "non_binary", ["woman", "non_binary", "man"], "Delhi", "Delhi"], ["Zoya", "trans_woman", ["man", "woman"], "Delhi", "Delhi"],
  ["Vikram", "man", ["woman"], "Delhi", "Delhi"], ["Priya", "woman", ["man"], "Chennai", "Tamil Nadu"],
  ["Dev", "trans_man", ["woman", "non_binary"], "Hyderabad", "Telangana"], ["Ananya", "woman", ["man"], "Kolkata", "West Bengal"],
  ["Karan", "man", ["woman"], "Jaipur", "Rajasthan"], ["Riya", "woman", ["man", "non_binary"], "Pune", "Maharashtra"],
  ["Aditya", "man", ["woman", "man"], "Ahmedabad", "Gujarat"], ["Neha", "woman", ["man"], "Mumbai", "Maharashtra"],
  ["Ash", "genderqueer", ["woman", "man", "non_binary", "genderqueer"], "Kochi", "Kerala"], ["Tara", "woman", ["woman", "non_binary"], "Goa", "Goa"],
  ["Yash", "man", ["woman"], "Lucknow", "Uttar Pradesh"], ["Sana", "woman", ["man"], "Bengaluru", "Karnataka"],
];
const ALL = ["woman", "man", "non_binary", "trans_woman", "trans_man", "genderqueer", "other"];

// Tiny solid-colour PNG so we don't need any image files or libraries.
function png(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  const raw = Buffer.alloc((1 + w * 3) * h);
  for (let y = 0; y < h; y++) {
    const t = y / h; // vertical gradient
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = Math.round(r * (1 - t * 0.4));
      row[2 + x * 3] = Math.round(g * (1 - t * 0.4));
      row[3 + x * 3] = Math.round(b * (1 - t * 0.4));
    }
    row.copy(raw, y * row.length);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
for (let i = 0; i < PEOPLE.length; i++) {
  const [name, gender, showMe, city, state] = PEOPLE[i];
  const email = `test${i + 1}@lovira.test`;
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const year = 1990 + (i % 12);
  const { error: pe } = await db.from("profiles").upsert({
    id: user.id, name, dob: `${year}-0${(i % 9) + 1}-15`, gender, show_me: showMe.length ? showMe : ALL,
    orientations: [], city, state, age_min: 18, age_max: 45,
    bio: `Test profile ${i + 1}. Loves chai, long walks and bad puns.`,
    prompts: [{ q: "A perfect Sunday looks like…", a: "Brunch, a book and a nap." }],
  });
  if (pe) throw pe;

  const { count } = await db.from("photos").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (!count) {
    for (let k = 0; k < 2; k++) {
      const hue = [(i * 37 + k * 90) % 255, (i * 71) % 255, (i * 113 + 120) % 255];
      const path = `${user.id}/seed-${k}.png`;
      const { error: ue } = await db.storage.from("photos").upload(path, png(300, 400, hue), { contentType: "image/png", upsert: true });
      if (ue) throw ue;
      await db.from("photos").insert({ user_id: user.id, path, position: k });
    }
  }
  await db.from("verifications").upsert({ user_id: user.id, status: "approved", id_type: "pan", reviewed_at: new Date().toISOString() });
  console.log(`✓ ${email}  ${name} (${gender}, ${city})`);
}
console.log("\nDone. 20 verified test profiles are live in the feed.");
