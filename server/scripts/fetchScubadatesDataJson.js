const fs = require("fs");
const path = require("path");
const axios = require("axios");

const OUTPUT_DIR = "/var/scubanet-data";
const OUTPUT_FILE = path.join(OUTPUT_DIR, "scubadates-trips.json");
const TMP_FILE = path.join(OUTPUT_DIR, "scubadates-trips.tmp.json");

const SCUBADATES_URL = "https://api.scubadates.com/data/trips/json/";
const SCUBADATES_TOKEN = "f4a8aaaf08196b122088fdc44217d2ab";

async function fetchScubadatesData() {
    console.log("🚀 Scubadates JSON 수집 시작");

    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            console.log(`📁 디렉토리 생성: ${OUTPUT_DIR}`);
        }

        const response = await axios.get(SCUBADATES_URL, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${SCUBADATES_TOKEN}`,
            },
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024,
            maxBodyLength: 50 * 1024 * 1024,
        });

        const data = response.data;

        if (!Array.isArray(data)) {
            throw new Error("Scubadates 응답이 배열 형식이 아닙니다.");
        }

        fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), "utf-8");
        fs.renameSync(TMP_FILE, OUTPUT_FILE);

        console.log(`✅ 저장 완료: ${OUTPUT_FILE}`);
        console.log(`✅ 총 trip 수: ${data.length}`);

        if (data.length > 0) {
            const firstTrip = data[0]?.trip;
            console.log("🔎 첫 trip 확인:");
            console.log(`- trip.id: ${firstTrip?.id || ""}`);
            console.log(`- vessel: ${firstTrip?.vessel?.name || ""}`);
            console.log(`- embarkation: ${firstTrip?.embarkation?.date || ""}`);
            console.log(`- disembarkation: ${firstTrip?.disembarkation?.date || ""}`);
        }
    } catch (error) {
        console.error("❌ Scubadates JSON 수집 실패");

        if (error.response) {
            console.error("status:", error.response.status);
            console.error("data:", error.response.data);
        } else {
            console.error(error.message);
        }

        process.exit(1);
    }
}

fetchScubadatesData();