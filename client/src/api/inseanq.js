// src/api/inseanq.js
import axios from "axios";
import { format, startOfDay, endOfDay } from "date-fns";

// ✅ 반드시 detailed 사용 (요금/좌석/오퍼 일관)
const BASE_URL = "http://210.114.22.82:3002/api/availability";

// 헤더는 모델 컨텍스트 기준
const client = axios.create({

});

/**
 * 날짜 범위 정규화(포함 범위) + 페이지네이션 전부 수집
 * @param {{dateFrom: Date, dateTo: Date, region?: string, boat?: string}} params
 * @returns Promise<Array<any>>
 */
export async function fetchAvailabilityAll(params = {}) {
    // ✅ 날짜 포함 범위 보장 (현지→UTC 오차 최소화 위해 YYYY-MM-DD 전송)
    const dateFrom = format(startOfDay(params.dateFrom), "yyyy-MM-dd");
    const dateTo = format(endOfDay(params.dateTo), "yyyy-MM-dd");

    const query = {
        date_from: dateFrom,
        date_to: dateTo,
    };
    if (params.region && params.region !== "전체") query.region = params.region;
    if (params.boat && params.boat !== "전체") query.vessel = params.boat;

    let page = 1;
    const pageSize = 50; // 충분히 크게
    const all = [];

    while (true) {
        const { data } = await client.get(BASE_URL, {
            params: { ...query, page, per_page: pageSize },
        });
        const items = Array.isArray(data?.data) ? data.data : [];
        all.push(...items);

        const total = Number(data?.total ?? 0);
        if (page * pageSize >= total || items.length === 0) break;
        page += 1;
    }

    // 공통 정렬: 출발일 오름차순, 선명, 일정명 보조
    all.sort((a, b) => {
        const da = new Date(a.startDate || a.start_date || a.start);
        const db = new Date(b.startDate || b.start_date || b.start);
        if (da - db !== 0) return da - db;
        return String(a.vesselName || a.vessel || "").localeCompare(String(b.vesselName || b.vessel || ""));
    });

    return all;
}
