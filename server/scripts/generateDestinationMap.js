// scripts/generateDestinationMap.js

const fs = require("fs");
const path = require("path");

// -----------------------------
// 1) Country 판별 규칙
// -----------------------------
const COUNTRY_RULES = [
    { country: "Indonesia", keywords: ["Sorong", "Labuan Bajo", "Maumere", "Ambon", "Bitung"] },
    { country: "Maldives", keywords: ["Male"] },
    { country: "Philippines", keywords: ["Mactan", "Cebu", "Puerto Princesa"] },
    { country: "Mexico", keywords: ["Cabo", "San Jose Del Cabo"] },
    { country: "Egypt", keywords: ["Hurghada", "Port Ghalib", "Marsa Alam"] },
    { country: "Palau", keywords: ["Koror"] },
    { country: "Galapagos (Ecuador)", keywords: ["Baltra", "San Cristobal"] },
    { country: "Thailand", keywords: ["Chalong", "Thap Lamu"] },
    { country: "Solomon Islands", keywords: ["Honiara"] },
    { country: "Fiji", keywords: ["Viti Levu"] },
    { country: "Sudan", keywords: ["Port Sudan"] },
    { country: "Marshall Islands", keywords: ["Kwajalein"] },
    { country: "Madagascar", keywords: ["Nosy Be"] }
];

function detectCountryImproved(productName, portName) {
    const text = `${productName} ${portName}`.toLowerCase();

    for (const rule of COUNTRY_KEYWORDS) {
        if (rule.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
            return rule.country;
        }
    }

    return "Others";
}


// -----------------------------
// 2) Destination 자동 생성
// -----------------------------
function extractDestination(productName) {
    if (!productName) return "Unknown";

    // inseanq 스타일의 표현 그대로 사용
    return productName
        .replace(/\s*\([^)]*\)/g, "")  // 괄호 제거
        .replace(/4D\/3N|3D\/2N|7Nights/gi, "")
        .trim();
}

function main() {
    const inputPath = path.join(__dirname, "..", "public", "data", "availability-basic.json");
    const outputPath = path.join(__dirname, "..", "public", "data", "destination-map.json");

    const raw = fs.readFileSync(inputPath, "utf-8");
    const json = JSON.parse(raw);
    const trips = Array.isArray(json) ? json : json.data;

    const result = {};

    for (const trip of trips) {
        const port = trip?.departurePort?.name || "";
        const product = trip?.product?.name || "";

        const country = detectCountry(port);
        const destination = extractDestination(product);

        if (!result[country]) {
            result[country] = {};
        }

        if (!result[country][destination]) {
            result[country][destination] = new Set();
        }

        result[country][destination].add(port);
    }

    // Set → Array 변환
    const output = {};
    for (const country of Object.keys(result)) {
        output[country] = {};

        for (const dest of Object.keys(result[country])) {
            output[country][dest] = Array.from(result[country][dest]);
        }
    }
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    console.log("✔ destination-map.json 생성 완료!");
}

main();
