const fs = require("fs");

const INSEANQ_FILE = "/var/scubanet-data/uts-trips.json";
const SCUBADATES_FILE = "/var/scubanet-data/scubadates-uts-trips.json";
const OUTPUT_FILE = "/var/scubanet-data/merged-uts-trips.json";

function safeReadJson(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`파일이 없습니다: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
        throw new Error(`배열 형식이 아닙니다: ${filePath}`);
    }

    return data;
}

function normalizeTrip(trip, fallbackSource) {
    return {
        ...trip,
        source: trip.source || fallbackSource || "unknown",
    };
}

function dedupeTrips(trips) {
    const map = new Map();

    for (const trip of trips) {
        const key = trip.tripId;

        if (!key) {
            console.warn("⚠️ tripId 없는 trip 발견, 건너뜀:", trip);
            continue;
        }

        if (!map.has(key)) {
            map.set(key, trip);
            continue;
        }

        console.warn(`⚠️ 중복 tripId 발견: ${key} → 기존 항목 유지`);
    }

    return Array.from(map.values());
}

function sortTrips(trips) {
    return [...trips].sort((a, b) => {
        const dateA = a.startDate || "";
        const dateB = b.startDate || "";

        if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
        }

        const boatA = a.boatName || "";
        const boatB = b.boatName || "";

        return boatA.localeCompare(boatB);
    });
}

function main() {
    console.log("🚀 UTS 통합 시작");

    const inseanqTrips = safeReadJson(INSEANQ_FILE).map((trip) =>
        normalizeTrip(trip, "inseanq")
    );

    const scubadatesTrips = safeReadJson(SCUBADATES_FILE).map((trip) =>
        normalizeTrip(trip, "scubadates")
    );

    console.log(`- Inseanq trips: ${inseanqTrips.length}`);
    console.log(`- Scubadates trips: ${scubadatesTrips.length}`);

    const merged = [...inseanqTrips, ...scubadatesTrips];
    const deduped = dedupeTrips(merged);
    const sorted = sortTrips(deduped);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), "utf-8");
    fs.chmodSync(OUTPUT_FILE, 0o644);

    try {
        fs.chownSync(OUTPUT_FILE, 33, 33); // www-data:www-data
    } catch (e) {
        console.warn("⚠️ chown 실패:", e.message);
    }

    console.log(`✅ 통합 완료: ${OUTPUT_FILE}`);
    console.log(`✅ 최종 trip 수: ${sorted.length}`);

    const sourceCounts = sorted.reduce((acc, trip) => {
        const source = trip.source || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});

    console.log("🔎 source별 trip 수:");
    Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`- ${source}: ${count}`);
    });

    if (sorted.length > 0) {
        const first = sorted[0];
        console.log("🔎 첫 trip 확인:");
        console.log(`- tripId: ${first.tripId}`);
        console.log(`- source: ${first.source}`);
        console.log(`- boatName: ${first.boatName}`);
        console.log(`- startDate: ${first.startDate}`);
    }
}

main();