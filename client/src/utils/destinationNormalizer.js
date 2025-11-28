// src/utils/destinationNormalizer.js
import {
    indonesiaKeywords,
    maldivesPorts,
    maldivesKeywords,
} from "./destinationRules";

const normalize = (str = "") => str.toLowerCase();

// 🔹 포트 이름 기반 국가 감지용 매핑 (Indonesia/Maldives 제외 나머지)
const portCountryRules = [
    {
        country: "Egypt",
        ports: ["hurghada", "port ghalib", "marsa alam"],
    },
    {
        country: "Ecuador",
        ports: ["baltra", "san cristobal", "puerto ayora"],
    },
    {
        country: "Mexico",
        ports: ["cabo san lucas", "san jose del cabo", "la paz", "magdalena"],
    },
    {
        country: "Papua New Guinea",
        ports: ["alotau", "kavieng", "kimbe", "milne", "rabaul", "wewak"],
    },
    {
        country: "Palau",
        ports: ["koror", "malakal", "malakal harbor", "malakal port", "koror port", "koror harbor", "palau"],
    },
    {
        country: "Marshall Islands",
        ports: ["kwajalein", "bikini"],
    },
    {
        country: "Philippines",
        ports: ["mactan", "cebu", "puerto princesa"],
    },
    {
        country: "Solomon Islands",
        ports: ["honiara", "honiara",
            "guadalcanal",
            "western province",
            "solomon",           // 국가명이 포함된 경우까지 커버!
            "munda",
            "ghizo",
            "gizo"],
    },
    {
        country: "Thailand",
        ports: ["chalong", "thap lamu"],
    },

    {
        country: "Myanmar",
        ports: ["ranong"],
    },
    {
        country: "Saudi Arabia",
        ports: ["jeddah", "yanbu"],
    },
    {
        country: "Costa Rica",
        ports: ["puntarenas"],
    },
    {
        country: "Truk",
        ports: ["chuuk", "weno", "truk"],
    },
    {
        country: "Oman",
        ports: ["dibba"],
    },

    {
        country: "Seychelles",
        ports: ["eden",
            "eden island",
            "eden marina",
            "victoria"],
    },

];

export function detectCountry(trip) {
    const product = normalize(trip.product?.name);
    const port = normalize(trip.departurePort?.name);

    // 🇮🇩 인도네시아 (키워드 기반)
    if (indonesiaKeywords.some((k) => product.includes(k))) {
        return "Indonesia";
    }

    // 🇲🇻 몰디브 (포트/키워드 기반)
    if (
        Object.values(maldivesPorts).flat().some((p) => port.includes(p)) ||
        product.includes("maldives") ||
        port.includes("male")
    ) {
        return "Maldives";
    }

    // 🌍 그 외 나라들: 포트 이름 기반으로 매칭
    for (const rule of portCountryRules) {
        if (rule.ports.some((p) => port.includes(p))) {
            return rule.country;
        }
    }

    return "Others";
}

/* -----------------------
   Destination 감지
------------------------ */
export function detectDestination(trip, country) {
    const product = normalize(trip.product?.name);
    const port = normalize(trip.departurePort?.name);

    // 🇮🇩 Indonesia
    if (country === "Indonesia") {
        for (const k of indonesiaKeywords) {
            if (product.includes(k)) {

                if (k.includes("raja ampat") ||
                    k.includes("misool") ||
                    k.includes("fam") ||
                    k.includes("central")) {
                    return "Raja Ampat";
                }

                if (k.includes("komodo")) return "Komodo";
                if (k.includes("triton")) return "Triton Bay";
                if (k.includes("halmahera")) return "Halmahera";
                if (k.includes("lembeh")) return "Lembeh";
                if (k.includes("banda")) return "Banda Sea";
                if (k.includes("manado")) return "Manado";
                if (k.includes("sulawesi")) return "Sulawesi";
                if (k.includes("sangihe")) return "Sangihe";
            }
        }

        return "Indonesia - Other";
    }


    // 🇲🇻 Maldives
    if (country === "Maldives") {
        // Hanifaru
        if (maldivesKeywords.hanifaru.some((k) => product.includes(k))) {
            return "Hanifaru Bay";
        }

        // Far North (포트)
        if (maldivesPorts.farNorth.some((p) => port.includes(p))) {
            return "Far North";
        }

        // Deep South (포트)
        if (maldivesPorts.deepSouth.some((p) => port.includes(p))) {
            return "Deep South";
        }

        // Central (product의 best/classic/5 atolls 등)
        if (maldivesKeywords.central.some((k) => product.includes(k))) {
            return "Central";
        }

        return "Central";
    }

    // 🇪🇬 Egypt / 🇸🇦 Saudi Arabia : Red Sea
    if (country === "Egypt" || country === "Saudi Arabia") {
        return "Red Sea";
    }

    // 🇪🇨 Ecuador
    if (country === "Ecuador") {
        return "Galapagos";
    }

    // 🇲🇽 Mexico
    if (country === "Mexico") {
        if (product.includes("socorro") || product.includes("revillagigedo")) {
            return "Socorro";
        }
        if (product.includes("cortez")) {
            return "Sea of Cortez";
        }
        if (product.includes("la paz")) {
            return "La Paz";
        }
        if (product.includes("cabo pulmo")) {
            return "Cabo Pulmo";
        }
        if (product.includes("magdalena")) {
            return "Magdalena Bay";
        }
        return "Mexico - Other";
    }

    // 🇵🇬 Papua New Guinea
    if (country === "Papua New Guinea") {
        if (port.includes("alotau")) return "Alotau";
        if (port.includes("kavieng")) return "Kavieng";
        if (port.includes("kimbe")) return "Kimbe Bay";
        if (port.includes("milne")) return "Milne Bay";
        if (port.includes("rabaul")) return "Rabaul";
        if (port.includes("wewak")) return "Wewak";
        return "Papua New Guinea - Other";
    }

    // 🇵🇼 Palau
    if (country === "Palau") {
        return "Palau";
    }

    // 🇵🇭 Philippines
    if (country === "Philippines") {
        if (product.includes("tubbataha")) return "Tubbataha";
        if (product.includes("visayas")) return "Visayas";
        return "Philippines - Other";
    }

    // 🇨🇷 Costa Rica
    if (country === "Costa Rica") {
        return "Cocos Islands";
    }

    // 🇲🇲 Myanmar
    if (country === "Myanmar") {
        return "Merqui Archipelago";
    }

    // 🇴🇲 Oman
    if (country === "Oman") {
        return "Oman";
    }

    // 🇸🇧 Solomon Islands
    if (country === "Solomon Islands") {
        return "Solomon";
    }

    // 🇹🇭 Thailand
    if (country === "Thailand") {
        if (product.includes("similan") && product.includes("south"))
            return "Similan - South";
        if (product.includes("similan")) return "Similan";
        return "Thailand - Other";
    }

    // 🇲🇭 Marshall Islands
    if (country === "Marshall Islands") {
        return "Bikini Atoll";
    }

    // 🇹🇻 Truk
    if (country === "Truk") {
        return "Truk";
    }

    return "Others";
}

// ✅ 트립 하나를 정규화
export function normalizeTrip(trip) {
    const country = detectCountry(trip);
    const destination = detectDestination(trip, country);

    return {
        ...trip,
        normalizedCountry: country,
        normalizedDestination: destination,
    };
}

export const ALL_COUNTRIES = [
    "Ecuador",
    "Egypt",
    "Fiji",
    "Indonesia",
    "Maldives",
    "Mexico",
    "Myanmar",
    "Oman",
    "Palau",
    "Papua New Guinea",
    "Philippines",
    "Saudi Arabia",
    "Seychelles",
    "Solomon Islands",
    "Thailand",
    "Truk",
    // Others는 마지막에 추가
    "Others"
];
