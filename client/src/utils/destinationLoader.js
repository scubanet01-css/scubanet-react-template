import axios from "axios";

export async function loadDestinationFilter() {
    try {
        const res = await axios.get("/data/destination-filter.json");
        return res.data || {};
    } catch (err) {
        console.error("❌ destination-filter.json 로드 실패:", err);
        return {};
    }
}
