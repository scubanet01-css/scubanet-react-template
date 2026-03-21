const VALID_COUNTRIES = new Set([
    "Indonesia",
    "Maldives",
    "Philippines",
    "Egypt",
    "Ecuador",
    "Mexico",
    "Palau",
    "Papua New Guinea",
    "Solomon Islands",
    "Thailand",
    "Myanmar",
    "Saudi Arabia",
    "Costa Rica",
    "Oman",
    "Seychelles",
    "Marshall Islands",
    "Micronesia",
    "Fiji",
    "Australia",
    "Cuba",
    "French Polynesia",
    "Others",
]);

const COUNTRY_RULES = [
    {
        country: "Indonesia",
        keywords: [
            "indonesia", "raja ampat", "misool", "komodo", "alor",
            "ambon", "banda", "banda sea", "cenderawasih", "triton",
            "lembeh", "manado", "sulawesi", "halmahera", "flores", "bali"
        ],
    },
    {
        country: "Maldives",
        keywords: [
            "maldives", "male", "north male", "south male", "central atolls", "northern atolls",
            "southern atolls", "hanifaru", "ari atoll", "baa atoll", "vaavu", "fuvahmulah", "addu", "huvadhoo"
        ],
    },
    {
        country: "Philippines",
        keywords: [
            "philippines", "tubbataha", "visayas", "coron", "apo reef", "anilao", "cebu"
        ],
    },
    {
        country: "Egypt",
        keywords: ["egypt", "red sea", "hurghada", "port ghalib", "marsa alam"],
    },
    {
        country: "Ecuador",
        keywords: ["ecuador", "galapagos", "baltra", "san cristobal"],
    },
    {
        country: "Mexico",
        keywords: ["mexico", "socorro", "revillagigedo", "sea of cortez", "la paz", "magdalena", "baja"],
    },
    {
        country: "Palau",
        keywords: ["palau", "koror", "malakal"],
    },
    {
        country: "Papua New Guinea",
        keywords: ["papua new guinea", "png", "kimbe", "alotau", "kavieng", "rabaul", "wewak"],
    },
    {
        country: "Solomon Islands",
        keywords: ["solomon", "honiara", "ghizo", "gizo", "munda"],
    },
    {
        country: "Thailand",
        keywords: ["thailand", "similan", "surin", "chalong", "thap lamu", "khao lak"],
    },
    {
        country: "Myanmar",
        keywords: ["myanmar", "burma", "mergui", "merqui", "ranong"],
    },
    {
        country: "Saudi Arabia",
        keywords: ["saudi", "jeddah", "yanbu"],
    },
    {
        country: "Costa Rica",
        keywords: ["costa rica", "cocos island", "cocos islands", "puntarenas"],
    },
    {
        country: "Oman",
        keywords: ["oman", "dibba"],
    },
    {
        country: "Seychelles",
        keywords: ["seychelles", "eden", "victoria"],
    },
    {
        country: "Marshall Islands",
        keywords: ["marshall islands", "bikini", "kwajalein"],
    },
    {
        country: "Micronesia",
        keywords: ["micronesia", "truk", "chuuk", "weno", "truk lagoon"],
    },
    {
        country: "Fiji",
        keywords: ["fiji"],
    },
    {
        country: "Australia",
        keywords: ["australia", "coral sea", "great barrier reef", "cod hole"],
    },
    {
        country: "Cuba",
        keywords: ["cuba"],
    },

    {
        country: "French Polynesia",
        keywords: ["french polynesia", "tuamotu", "rangiroa", "fakarava"],
    },

];

const DESTINATION_RULES = {
    Indonesia: [
        { name: "Raja Ampat", keywords: ["raja ampat", "rajaampat", "waisai"] },
        { name: "Misool", keywords: ["misool"] },
        { name: "Komodo", keywords: ["komodo", "labuan bajo"] },
        { name: "Alor", keywords: ["alor"] },
        { name: "Ambon", keywords: ["ambon"] },
        { name: "Banda Sea", keywords: ["banda sea", "banda", "neira"] },
        { name: "Cenderawasih Bay", keywords: ["cenderawasih", "nabire", "manokwari"] },
        { name: "Triton Bay", keywords: ["triton", "kaimana"] },
        { name: "Halmahera", keywords: ["halmahera", "ternate"] },
        { name: "Lembeh", keywords: ["lembeh", "bitung"] },
        { name: "Manado", keywords: ["manado", "bunaken", "bangka"] },
        { name: "Flores", keywords: ["flores", "maumere"] },
        { name: "Bali", keywords: ["bali"] },
        { name: "Sulawesi", keywords: ["sulawesi"] },
        { name: "Sangihe", keywords: ["sangihe"] },
    ],
    Maldives: [
        { name: "Central Atolls", keywords: ["central atolls", "central", "ari atoll", "north male", "south male", "vaavu", "best of maldives", "classic maldives"] },
        { name: "Northern Atolls", keywords: ["northern atolls", "far north", "hanimaadhoo", "hanifaru", "baa atoll", "north fiesta", "northern secrets"] },
        { name: "Southern Atolls", keywords: ["southern atolls", "deep south", "addu", "fuvahmulah", "huvadhoo", "gan"] },
    ],
    //Philippines: [
    //{ name: "Tubbataha", keywords: ["tubbataha"] },
    //{ name: "Visayas", keywords: ["visayas", "bohol", "cebu", "negros", "leyte", "malapascua", "moalboal"] },
    //{ name: "Apo-Coron", keywords: ["apo reef", "coron"] },
    //],
    Egypt: [
        { name: "Northern Wrecks", keywords: ["northern wrecks", "thistlegorm", "abu nuhas", "ras mohammed", "strait of tiran", "wrecks"] },
        { name: "BDE Reefs", keywords: ["bde", "brothers", "daedalus", "elphinstone"] },
        { name: "Red Sea Deep South", keywords: ["st john", "st. john", "st johns", "st. johns", "zabargad", "rocky island", "fury shoals"] },
    ],

    Ecuador: [
        { name: "Galapagos", keywords: ["galapagos", "wolf", "darwin", "baltra", "san cristobal"] },
    ],
    Mexico: [
        { name: "Socorro", keywords: ["socorro", "revillagigedo"] },
        { name: "Sea of Cortez", keywords: ["sea of cortez", "cortez", "la paz"] },
        { name: "Baja California", keywords: ["baja", "baja california"] },
        { name: "Magdalena Bay", keywords: ["magdalena", "mag bay"] },
        { name: "Cabo Pulmo", keywords: ["cabo pulmo"] },
    ],
    Palau: [
        { name: "Palau", keywords: ["palau", "koror", "malakal"] },
    ],
    "Papua New Guinea": [
        { name: "Kimbe Bay", keywords: ["kimbe"] },
        { name: "Milne Bay", keywords: ["milne", "alotau"] },
        { name: "Kavieng", keywords: ["kavieng"] },
        { name: "Rabaul", keywords: ["rabaul"] },
        { name: "Wewak", keywords: ["wewak"] },
    ],
    "Solomon Islands": [
        { name: "Honiara", keywords: ["honiara"] },
        { name: "Munda", keywords: ["munda"] },
        { name: "Ghizo", keywords: ["ghizo", "gizo"] },
    ],
    Thailand: [
        { name: "Similan", keywords: ["similan"] },
        { name: "Surin", keywords: ["surin"] },
    ],
    Myanmar: [
        { name: "Mergui Archipelago", keywords: ["mergui", "merqui", "burma", "ranong"] },
    ],
    "Costa Rica": [
        { name: "Cocos Island", keywords: ["cocos"] },
    ],
    Oman: [
        { name: "Oman", keywords: ["oman", "dibba"] },
    ],
    Seychelles: [
        { name: "Seychelles", keywords: ["seychelles", "eden", "victoria"] },
    ],
    "Marshall Islands": [
        { name: "Bikini Atoll", keywords: ["bikini", "kwajalein"] },
    ],
    Micronesia: [
        { name: "Truk Lagoon", keywords: ["truk", "chuuk", "weno"] },
    ],
    "French Polynesia": [
        { name: "Tuamotu", keywords: ["tuamotu", "northern tuamotu", "rangiroa", "fakarava"] },
    ],
};

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text, keyword) {
    const normalizedText = normalizeText(text);
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) return false;

    const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedKeyword)}(?=\\s|$)`);
    return pattern.test(normalizedText);
}

function getTripSearchText(trip) {
    return normalizeText([
        trip.normalizedCountry,
        trip.country,
        typeof trip.destination === "string" ? trip.destination : "",
        Array.isArray(trip.destination) ? trip.destination.join(" | ") : "",
        Array.isArray(trip.destinations) ? trip.destinations.join(" | ") : "",
        trip.route,
        trip.routeName,
        trip.tripName,
        trip.title,
        trip.product?.name,
        trip.departurePort?.name,
        trip.embarkPort,
        trip.region,
        trip.area,
        trip.boatName,
    ].filter(Boolean).join(" | "));
}

export function detectNormalizedCountry(trip) {
    // 1) UTS에 이미 정상 country가 있으면 최우선 사용
    if (
        typeof trip.country === "string" &&
        VALID_COUNTRIES.has(trip.country.trim())
    ) {
        return trip.country.trim();
    }

    // 2) 그다음 키워드 탐지
    const text = getTripSearchText(trip);

    for (const rule of COUNTRY_RULES) {
        const matchedKeyword = rule.keywords.find((kw) =>
            keywordMatches(text, kw)
        );

        if (matchedKeyword) {
            if (
                ["The Smiling Seahorse", "Bavaria", "Sachika"].includes(trip.boatName)
            ) {
                console.log("🔎 detectNormalizedCountry match", {
                    boatName: trip.boatName,
                    title: trip.tripName || trip.title || trip.routeName || "",
                    rawCountry: trip.country,
                    matchedCountry: rule.country,
                    matchedKeyword,
                    searchText: text,
                });
            }

            return rule.country;
        }
    }

    if (
        ["The Smiling Seahorse", "Bavaria", "Sachika"].includes(trip.boatName)
    ) {
        console.log("🔎 detectNormalizedCountry fallback Others", {
            boatName: trip.boatName,
            title: trip.tripName || trip.title || trip.routeName || "",
            rawCountry: trip.country,
            searchText: text,
        });
    }

    return "Others";
}

function splitFallbackDestinations(value) {
    return String(value || "")
        .split(/,|\/|&/)
        .map((x) => x.trim())
        .filter(Boolean);
}

function normalizeDestinationName(name) {
    const text = normalizeText(name);

    if (text === "rajaampat" || text === "raja ampat") {
        return "Raja Ampat";
    }

    return name;
}

function mapMaldivesFallbackDestination(value) {
    const text = normalizeText(value);

    if (
        keywordMatches(text, "deep south") ||
        keywordMatches(text, "southern atolls") ||
        keywordMatches(text, "addu") ||
        keywordMatches(text, "fuvahmulah") ||
        keywordMatches(text, "huvadhoo") ||
        keywordMatches(text, "gan")
    ) {
        return "Southern Atolls";
    }

    if (
        keywordMatches(text, "far north") ||
        keywordMatches(text, "northern atolls") ||
        keywordMatches(text, "hanimaadhoo") ||
        keywordMatches(text, "hanifaru") ||
        keywordMatches(text, "baa atoll") ||
        keywordMatches(text, "north fiesta") ||
        keywordMatches(text, "northern secrets")
    ) {
        return "Northern Atolls";
    }

    return "Central Atolls";
}

function mapEgyptFallbackDestination(value) {
    const text = normalizeText(value);

    if (
        keywordMatches(text, "brothers") ||
        keywordMatches(text, "daedalus") ||
        keywordMatches(text, "elphinstone") ||
        keywordMatches(text, "bde")
    ) {
        return "BDE Reefs";
    }

    if (
        keywordMatches(text, "thistlegorm") ||
        keywordMatches(text, "abu nuhas") ||
        keywordMatches(text, "ras mohammed") ||
        keywordMatches(text, "strait of tiran") ||
        keywordMatches(text, "northern wrecks") ||
        keywordMatches(text, "wrecks")
    ) {
        return "Northern Wrecks";
    }

    if (
        keywordMatches(text, "st john") ||
        keywordMatches(text, "st. john") ||
        keywordMatches(text, "st johns") ||
        keywordMatches(text, "st. johns") ||
        keywordMatches(text, "zabargad") ||
        keywordMatches(text, "rocky island") ||
        keywordMatches(text, "fury shoals")
    ) {
        return "Red Sea Deep South";
    }

    // Egypt인데 구체 규칙이 안 걸리면 기본값은 BDE보다는 Northern Wrecks 또는 Deep South보다
    // 넓은 북부권으로 두는 편이 안전함
    return "Northern Wrecks";
}

function mapPhilippinesFallbackDestination(value) {
    const text = normalizeText(value);

    // 1. Tubbataha
    if (keywordMatches(text, "tubbataha")) {
        return "Tubbataha";
    }

    // 2. Apo + Coron 통합
    if (
        keywordMatches(text, "apo reef") ||
        keywordMatches(text, "coron")
    ) {
        return "Apo-Coron";
    }

    // 3. Anilao 제거
    if (keywordMatches(text, "anilao")) {
        return null;
    }

    // 4. Visayas
    if (
        keywordMatches(text, "visayas") ||
        keywordMatches(text, "bohol") ||
        keywordMatches(text, "cebu") ||
        keywordMatches(text, "negros") ||
        keywordMatches(text, "leyte") ||
        keywordMatches(text, "southern leyte") ||
        keywordMatches(text, "malapascua") ||
        keywordMatches(text, "moalboal") ||
        keywordMatches(text, "dumaguete")
    ) {
        return "Visayas";
    }

    return null;
}

export function detectNormalizedDestinations(trip, country) {
    const text = getTripSearchText(trip);
    const rules = DESTINATION_RULES[country] || [];
    const matched = [];

    for (const rule of rules) {
        const hitKeywords = rule.keywords.filter((kw) => keywordMatches(text, kw));

        if (hitKeywords.length > 0) {
            matched.push(rule.name);

            if (country === "Philippines") {
                console.log("PH DEST DEBUG", {
                    boatName: trip.boatName,
                    destination: trip.destination,
                    route: trip.route,
                    routeName: trip.routeName,
                    tripName: trip.tripName,
                    title: trip.title,
                    productName: trip.product?.name,
                    departurePort: trip.departurePort?.name,
                    embarkPort: trip.embarkPort,
                    region: trip.region,
                    area: trip.area,
                    matchedRule: rule.name,
                    hitKeywords,
                    searchText: text,
                });
            }
        }
    }

    if (matched.length > 0) {
        return Array.from(new Set(matched));
    }

    if (Array.isArray(trip.normalizedDestinations) && trip.normalizedDestinations.length > 0) {
        return Array.from(new Set(trip.normalizedDestinations.filter(Boolean)));
    }

    if (typeof trip.destination === "string" && trip.destination.trim()) {
        const splitValues = splitFallbackDestinations(trip.destination);

        if (country === "Egypt") {
            const mapped = splitValues.map((value) => mapEgyptFallbackDestination(value));
            return Array.from(new Set(mapped));
        }

        if (country === "Philippines") {
            const mapped = splitValues
                .map((value) => mapPhilippinesFallbackDestination(value))
                .filter(Boolean);

            return Array.from(new Set(mapped));
        }

        // ✅ 몰디브는 raw destination을 그대로 쓰지 않고 3개 카테고리로만 묶음
        if (country === "Maldives") {
            const mapped = splitValues.map((value) => mapMaldivesFallbackDestination(value));
            return Array.from(new Set(mapped));
        }

        if (splitValues.length > 0) {
            const normalized = splitValues.map((v) => normalizeDestinationName(v));
            return Array.from(new Set(normalized));
        }
    }

    return ["Other"];
}

export function detectPrimaryDestination(trip, normalizedDestinations = []) {
    if (trip.primaryDestination) return trip.primaryDestination;
    return normalizedDestinations[0] || "Other";
}

function makeDestinationFilterKeys(country, destinations = []) {
    return destinations.map((d) => `${country}::${d}`);
}

export function normalizeUTSTrip(trip) {
    const normalizedCountry = detectNormalizedCountry(trip);
    const normalizedDestinations = detectNormalizedDestinations(trip, normalizedCountry);
    const primaryDestination = detectPrimaryDestination(trip, normalizedDestinations);
    const destinationFilterKeys = makeDestinationFilterKeys(
        normalizedCountry,
        normalizedDestinations
    );

    return {
        ...trip,
        normalizedCountry,
        normalizedDestinations,
        destinationFilterKeys,
        primaryDestination,
    };
}

export function normalizeUTSTrips(trips = []) {
    return trips.map(normalizeUTSTrip);
}

export function getCountryOptions(trips = []) {
    const countries = trips
        .map((t) => t.normalizedCountry)
        .filter(Boolean);

    const weirdCountries = Array.from(
        new Set(countries.filter((c) => !VALID_COUNTRIES.has(c)))
    );

    if (weirdCountries.length > 0) {
        console.log("🔎 weird countries in getCountryOptions:", weirdCountries);
    }

    return [
        "전체",
        ...Array.from(
            new Set(countries.filter((c) => VALID_COUNTRIES.has(c)))
        ).sort(),
    ];
}

export function getDestinationOptions(trips = [], selectedCountry = "전체") {
    if (selectedCountry === "전체") {
        const options = Array.from(
            new Set(
                trips.flatMap((t) =>
                    (Array.isArray(t.normalizedDestinations) ? t.normalizedDestinations : []).map(
                        (dest) => `${t.normalizedCountry}::${dest}`
                    )
                )
            )
        )
            .filter(Boolean)
            .sort()
            .map((key) => {
                const [country, destination] = key.split("::");
                return {
                    value: key,
                    label: `${destination} (${country})`,
                };
            });

        return [{ value: "전체", label: "전체" }, ...options];
    }

    const options = Array.from(
        new Set(
            trips
                .filter((t) => t.normalizedCountry === selectedCountry)
                .flatMap((t) => (Array.isArray(t.normalizedDestinations) ? t.normalizedDestinations : []))
        )
    )
        .filter(Boolean)
        .sort()
        .map((destination) => ({
            value: `${selectedCountry}::${destination}`,
            label: destination,
        }));

    return [{ value: "전체", label: "전체" }, ...options];
}

export function getBoatOptions(
    trips = [],
    selectedCountry = "전체",
    selectedDestination = "전체"
) {
    return [
        "전체",
        ...Array.from(
            new Set(
                trips
                    .filter((t) => selectedCountry === "전체" || t.normalizedCountry === selectedCountry)
                    .filter((t) =>
                        selectedDestination === "전체" ||
                        (Array.isArray(t.destinationFilterKeys) && t.destinationFilterKeys.includes(selectedDestination))
                    )
                    .map((t) => t.boatName)
                    .filter(Boolean)
            )
        ).sort(),
    ];
}