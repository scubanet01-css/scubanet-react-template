/**
 * generateDestinationKeywords.js
 * 국가별 Destination 후보 자동 생성기
 */

const fs = require("fs");
const path = require("path");

// Inseanq 원본 데이터
const DATA_FILE = "/var/www/scubanet/data/availability-detailed.json";

// 기존 country 판단 함수 가져오기 (convertInseanqToUTS.js에서 사용한 것과 동일)
const COUNTRY_KEYWORDS = [
    { country: "Indonesia", keywords: ["komodo", "raja", "banda", "lembeh", "ambon", "bali", "alor", "misool", "sorong", "labuan", "halmahera", "ternate", "togean", "bitung", "luwuk", "bajau", "manado", "sangihe", "derawan", "sumbawa", "cenderawasih", "maluku", "triton", "waisai", "kaimana"] },
    { country: "Maldives", keywords: ["maldives", "ari", "male", "central atolls", "atolls", "laamu", "addu", "deeper south", "far south", "suvadiva", "far north", "hanifaru", "baa"] },
    { country: "Egypt", keywords: ["red sea", "hurghada", "marsa", "ghalib", "zabargad", "deadalus", "thistlegorm", "brothers"] },
    { country: "Palau", keywords: ["palau", "koror", "malakal"] },
    { country: "Thailand", keywords: ["similan", "phuket", "surin", "ranong", "andaman", "thailand", "merdeka", "chalong", "thap lamu", "khao lak", "pakbara", "lipe"] },
    { country: "Ecuador", keywords: ["wolf", "darwin", "galapagos", "san cristobal", "baltra"] },
    { country: "Mexico", keywords: ["socorro", "revillagigedo", "cabo", "guadalupe", "cortez", "mag bay", "magdalena bay"] },
    { country: "Philippines", keywords: ["tubbataha", "visayas", "leyte", "cebu", "apu", "mactan", "apo"] },
    { country: "Solomon Islands", keywords: ["solomon", "honiara"] },
    { country: "Oman", keywords: ["oman", "dibba"] },
    { country: "Micronesia", keywords: ["truk", "chuuk", "weno", "truk lagoon"] },
    { country: "Myanmar", keywords: ["burma", "mergui"] },
    { country: "Papua New Guinea", keywords: ["kimbe", "rabaul", "kavieng", "alotau"] },
    { country: "Sudan", keywords: ["sudan"] },
    { country: "Seychelles", keywords: ["eden island"] },
    { country: "Marshall Islands", keywords: ["bikini", "kwajalein"] },
    { country: "Chile", keywords: ["punta arenas", "antarctica"] },
    { country: "Costa Rica", keywords: ["puntarenas", "cocos"] },
    { country: "Bahamas", keywords: ["grenada", "martinique", "st. vincent", "nassau", "st. lucia", "freeport", "bimini"] }
];

function detectCountry(text) {
    const lower = text.toLowerCase();
    for (const rule of COUNTRY_KEYWORDS) {
        if (rule.keywords.some(kw => lower.includes(kw))) {
            return rule.country;
        }
    }
    return "Others";
}

// Stopwords 제거
const STOPWORDS = [
    "4d/3n", "3d/2n", "5d/4n", "6d/5n", "7d/6n",
    "4d", "5d", "6d", "7d", "8d",
    "nights", "days",
    "trip", "liveaboard"
];

function cleanText(str) {
    let txt = str.toLowerCase();

    STOPWORDS.forEach(sw => {
        txt = txt.replace(sw, "");
    });
    return txt.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

// ----------------------------------------------------------
// 실행부
// ----------------------------------------------------------
console.log("🚀 Destination Keyword 자동 생성 시작");

const raw = fs.readFileSync(DATA_FILE, "utf-8");
let json = JSON.parse(raw);
const trips = Array.isArray(json) ? json : json.data;

const results = {};

for (const t of trips) {
    const product = t?.product?.name || "";
    const port = t?.departurePort?.name || "";
    const combined = cleanText(`${product} ${port}`);

    const country = detectCountry(combined);

    if (!results[country]) results[country] = {};

    const words = combined.split(" ").filter(w => w.length > 2);

    for (const w of words) {
        if (!results[country][w]) results[country][w] = 0;
        results[country][w]++;
    }
}

// 빈도순 정렬
const OUTPUT = {};
for (const country of Object.keys(results)) {
    const sorted = Object.entries(results[country])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40); // 상위 40개 keyword만

    OUTPUT[country] = sorted.map(([word, count]) => ({ word, count }));
}

const OUTFILE = "/root/destination-keywords-auto.json";
fs.writeFileSync(OUTFILE, JSON.stringify(OUTPUT, null, 2));

console.log("🎉 자동 키워드 생성 완료:", OUTFILE);
