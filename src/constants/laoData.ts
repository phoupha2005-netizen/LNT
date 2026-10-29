export interface ProvinceData {
  name: string;
  districts: string[];
}

export const LAO_PROVINCES: ProvinceData[] = [
  {
    name: "ຫຼວງນ້ຳທາ (LNT)",
    districts: [
      "ເມືອງນ້ຳທາ",
      "ເມືອງສິງ",
      "ເມືອງລອງ",
      "ເມືອງວຽງພູຄາ",
      "ເມືອງນາແລ"
    ]
  },
  {
    name: "ນະຄອນຫຼວງວຽງຈັນ",
    districts: [
      "ເມືອງຈັນທະບູລີ",
      "ເມືອງສີໂຄດຕະບອງ",
      "ເມືອງໄຊເສດຖາ",
      "ເມືອງສີສັດຕະນາກ",
      "ເມືອງຫາດຊາຍຟອງ",
      "ເມືອງໄຊທານີ",
      "ເມືອງນາຊາຍທອງ",
      "ເມືອງສັງທອງ",
      "ເມືອງປາກງື່ມ"
    ]
  },
  {
    name: "ບໍ່ແກ້ວ",
    districts: ["ເມືອງຫ້ວຍຊາຍ", "ເມືອງຕົ້ນເຜິ້ງ", "ເມືອງເມິງ", "ເມືອງຜາອຸດົມ", "ເມືອງປາກທາ"]
  },
  {
    name: "ອຸດົມໄຊ",
    districts: ["ເມືອງໄຊ", "ເມືອງຫຼາ", "ເມືອງນາໝໍ້", "ເມືອງງາ", "ເມືອງແບ່ງ", "ເມືອງຮຸນ", "ເມືອງປາກແບ່ງ"]
  },
  {
    name: "ຫຼວງພະບາງ",
    districts: ["ເມືອງຫຼວງພະບາງ", "ເມືອງຊຽງເງິນ", "ເມືອງນານ", "ເມືອງປາກອູ", "ເມືອງນ້ຳບາກ", "ເມືອງງອຍ", "ເມືອງປາກແຊງ"]
  },
  {
    name: "ຜົ້ງສາລີ",
    districts: ["ເມືອງຜົ້ງສາລີ", "ເມືອງໃໝ່", "ເມືອງຂວາ", "ເມືອງສຳພັນ", "ເມືອງບຸນເໜືອ", "ເມືອງຍອດອູ", "ເມືອງບຸນໃຕ້"]
  },
  {
    name: "ວຽງຈັນ",
    districts: ["ເມືອງໂພນໂຮງ", "ເມືອງທຸລະຄົມ", "ເມືອງແກ້ວອຸດົມ", "ເມືອງກາສີ", "ເມືອງວັງວຽງ", "ເມືອງເຟືອງ", "ເມືອງຊະນະຄາມ"]
  },
  {
    name: "ສະຫວັນນະເຂດ",
    districts: ["ເມືອງໄກສອນ ພົມວິຫານ", "ເມືອງອຸທຸມພອນ", "ເມືອງອາດສະພັງທອງ", "ເມືອງພີນ", "ເມືອງເຊໂປນ", "ເມືອງນອງ", "ເມືອງທ່າປາງທອງ", "ເມືອງຈຳພອນ"]
  },
  {
    name: "ຈຳປາສັກ",
    districts: ["ເມືອງປາກເຊ", "ເມືອງຊະນະສົມບູນ", "ເມືອງບາຈຽງຈະເລີນສຸກ", "ເມືອງປາກຊ່ອງ", "ເມືອງປະທຸມພອນ", "ເມືອງໂພນທອງ", "ເມືອງຈຳປາສັກ"]
  },
  {
    name: "ຄຳມ່ວນ",
    districts: ["ເມືອງທ່າແຂກ", "ເມືອງມະຫາໄຊ", "ເມືອງໜອງບົກ", "ເມືອງຫີນບູນ", "ເມືອງຍົມມະລາດ", "ເມືອງບົວລະພາ", "ເມືອງນາກາຍ"]
  }
];

export const DEFAULT_PROVINCE = "ຫຼວງນ້ຳທາ (LNT)";

export const MATCH_FORMATS = [
  { value: "5", label: "5 ຄົນ (Futsal / Mini Pitch)", badge: "5v5" },
  { value: "7", label: "7 ຄົນ (Artificial Turf 7v7)", badge: "7v7" },
  { value: "11", label: "11 ຄົນ (Full Pitch 11v11)", badge: "11v11" }
];

export const SKILL_LEVELS = [
  { value: "ມ່ວນຊື່ນ / ອອກກຳລັງກາຍ", label: "ມ່ວນຊື່ນ / ອອກກຳລັງກາຍ (Casual / Friendly)", color: "text-emerald-400 border-emerald-800/50 bg-emerald-950/40" },
  { value: "ປານກາງ / ທົ່ວໄປ", label: "ປານກາງ / ທົ່ວໄປ (Intermediate / Regular)", color: "text-blue-400 border-blue-800/50 bg-blue-950/40" },
  { value: "ບານແຂ່ງຂັນ / ສີມືດີ", label: "ບານແຂ່ງຂັນ / ສີມືດີ (Competitive)", color: "text-amber-400 border-amber-800/50 bg-amber-950/40" },
  { value: "ອາວຸໂສ (35 ປີຂຶ້ນໄປ)", label: "ອາວຸໂສ (Veterans 35+)", color: "text-purple-400 border-purple-800/50 bg-purple-950/40" }
];

export interface FeeTypeOption {
  value: 'split' | 'host_pays' | 'loser_pays' | 'per_person' | 'custom';
  label: string;
  badge: string;
  tag: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const FEE_TYPES: FeeTypeOption[] = [
  { 
    value: "split", 
    label: "ຫານເຄິ່ງກັນ 50/50 (ແບ່ງເທົ່າກັນ 2 ທີມ)",
    badge: "50/50 ຫານເຄິ່ງ",
    tag: "ຫານເຄິ່ງ 50/50",
    description: "ທັງສອງທີມອອກຄ່າສະໜາມຄົນລະເຄິ່ງ ເທົ່າທຽມກັນ",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10"
  },
  { 
    value: "host_pays", 
    label: "ເຈົ້າພາບລ້ຽງ / ຈ່າຍເອງ (ທີມມາເຕະລ້າ/ຟຣີ)",
    badge: "ເຈົ້າພາບລ້ຽງ (ຟຣີ)",
    tag: "ເຈົ້າພາບຈ່າຍ (ເຕະຟຣີ)",
    description: "ທີມເຈົ້າພາບຮັບຜິດຊອບຄ່າສະໜາມທັງໝົດ ທີມມາເຕະບໍ່ເສຍຄ່າສະໜາມ",
    color: "text-teal-300",
    borderColor: "border-teal-500/40",
    bgColor: "bg-teal-500/10"
  },
  { 
    value: "loser_pays", 
    label: "ທີມແພ້ຈ່າຍຄ່າສະໜາມ (ຫຼື ແພ້ຈ່າຍຫຼາຍກວ່າ)",
    badge: "ທີມແພ້ຈ່າຍ",
    tag: "ທີມແພ້ຈ່າຍ",
    description: "ວາງເດີມພັນຄ່າສະໜາມ ທີມແພ້ຈ່າຍຄ່າສະໜາມເຕັມ ຫຼື ອອກຫຼາຍກວ່າ",
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10"
  },
  { 
    value: "per_person", 
    label: "ຫານຕາມຈຳນວນຄົນ (ແບ່ງລາຍບຸກຄົນ)",
    badge: "ຫານຕາມຫົວຄົນ",
    tag: "ຫານຕາມຈຳນວນຄົນ",
    description: "ນັບຈຳນວນນັກເຕະທັງໝົດທີ່ມາລົງສະໜາມ ແລ້ວຫານສະເລ່ຍຕໍ່ຄົນ",
    color: "text-blue-400",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10"
  },
  { 
    value: "custom", 
    label: "ກຳນົດເອງ / ຂໍ້ຕົກລົງພິເສດ",
    badge: "ກຳນົດເອງ",
    tag: "ຂໍ້ຕົກລົງພິເສດ",
    description: "ກຳນົດເງື່ອນໄຂການແບ່ງຄ່າສະໜາມ ຫຼື ຄ່ານ້ຳດື່ມຕາມຕົກລົງ",
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10"
  }
];

// High quality curated SVG/football badges for team logos
export const PRESET_TEAM_LOGOS = [
  {
    id: "lnt_tigers",
    name: "LNT Tigers (ເສືອໂຄ່ງ)",
    url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "golden_dragon",
    name: "Golden Dragon FC (ມັງກອນຄຳ)",
    url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "namtha_united",
    name: "Namtha United (ນ້ຳທາ ຢູນາຍເຕັດ)",
    url: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "red_warriors",
    name: "Red Warriors (ນັກຮົບສີແດງ)",
    url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "blue_wolves",
    name: "Blue Wolves (ໝາປ່າສີຟ້າ)",
    url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "emerald_stars",
    name: "Emerald Stars (ດາວມໍລະກົດ)",
    url: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "white_elephants",
    name: "White Elephants (ຊ້າງເຜືອກ FC)",
    url: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200&auto=format&fit=crop&q=80"
  },
  {
    id: "lightning_strike",
    name: "Lightning Strike (ສາຍຟ້າ FC)",
    url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=200&auto=format&fit=crop&q=80"
  }
];

export const POPULAR_PITCHES_LNT = [
  "ສະໜາມກິລາແຂວງຫຼວງນ້ຳທາ (LNT Provincial Stadium)",
  "ສະໜາມຫຍ້າທຽມ ນ້ຳທາ ອາຣີນາ (Namtha Arena Turf)",
  "ສະໜາມບານເຕະ ເມືອງສິງ ສະປອດ (Sing Sport)",
  "ສະໜາມຫຍ້າທຽມ ມິດຕະພາບ ວຽງພູຄາ",
  "ສະໜາມ 7 ຄົນ ຫຼວງນ້ຳທາ ຢູນາຍເຕັດ",
  "ສະໜາມບານເຕະ ນາແລ ພີມຽມ"
];
