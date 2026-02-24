// server/utils/specialTripsStore.js

const fs = require("fs");
const path = require("path");

const DATA_DIR = "/var/scubanet-data";
const SPECIAL_PATH = path.join(DATA_DIR, "special-trips.json");

/**
 * ✅ special-trips.json 읽기
 * - 파일이 없으면 [] 반환
 * - JSON 파싱 오류가 나면 로그 찍고 [] 반환
 */
function loadSpecialTrips() {
    try {
        if (!fs.existsSync(SPECIAL_PATH)) {
            return [];
        }
        const raw = fs.readFileSync(SPECIAL_PATH, "utf8");
        const json = JSON.parse(raw);
        if (Array.isArray(json)) return json;

        console.warn("⚠ special-trips.json: 배열이 아님, 빈 배열로 처리합니다.");
        return [];
    } catch (err) {
        console.error("❌ special-trips.json 로드 오류:", err);
        return [];
    }
}

/**
 * ✅ special-trips.json 저장
 * - 리스트 전체를 통째로 저장
 */
function saveSpecialTrips(list) {
    try {
        const safeList = Array.isArray(list) ? list : [];
        const json = JSON.stringify(safeList, null, 2);
        fs.writeFileSync(SPECIAL_PATH, json, "utf8");
        console.log(
            `💾 special-trips.json 저장 완료 (${safeList.length}건), 경로: ${SPECIAL_PATH}`
        );
    } catch (err) {
        console.error("❌ special-trips.json 저장 오류:", err);
        throw err;
    }
}

/**
 * ✅ ID 기준 upsert (추가/수정 공통)
 * - 같은 specialTripId가 있으면 덮어쓰기
 * - 없으면 새로 추가
 */
function upsertSpecialTrip(trip) {
    if (!trip || !trip.specialTripId) {
        throw new Error("specialTripId가 없는 트립은 저장할 수 없습니다.");
    }

    const list = loadSpecialTrips();
    const idx = list.findIndex(
        (t) => t.specialTripId === trip.specialTripId
    );

    if (idx >= 0) {
        list[idx] = { ...list[idx], ...trip };
    } else {
        list.push(trip);
    }

    saveSpecialTrips(list);
    return trip;
}

module.exports = {
    loadSpecialTrips,
    saveSpecialTrips,
    upsertSpecialTrip,
};