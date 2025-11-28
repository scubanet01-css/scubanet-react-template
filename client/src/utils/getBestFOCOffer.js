// 1) Standard, Group, DEMA 등 FOC 오퍼 파싱 (강화 버전)
const parseFOC = (offer) => {
    const name = offer.name?.toLowerCase() || "";

    // case1: "4 paid + 1 FOC"
    let m1 = name.match(/(\d+)\s*paid\s*\+\s*(\d+)\s*foc/);
    if (m1) {
        return {
            offer,
            name: offer.name,
            req: Number(m1[1]),
            bonus: Number(m1[2]),
        };
    }

    // case2: "8 pax includes 1 FOC"
    let m2 = name.match(/(\d+)\s*pax.*?(\d+)\s*foc/);
    if (m2) {
        return {
            offer,
            name: offer.name,
            req: Number(m2[1]),
            bonus: Number(m2[2]),
        };
    }

    // case3: "8+2"
    let m3 = name.match(/(\d+)\s*\+\s*(\d+)/);
    if (m3) {
        return {
            offer,
            name: offer.name,
            req: Number(m3[1]),
            bonus: Number(m3[2]),
        };
    }

    // case4: "... 2FOC"
    let m4 = name.match(/(\d+).*?(\d+)\s*foc/);
    if (m4) {
        return {
            offer,
            name: offer.name,
            req: Number(m4[1]),
            bonus: Number(m4[2]),
        };
    }

    return null;
};


// 2) pax 기준 free 인원 계산
const calcFree = (pax, req, bonus) =>
    pax >= req ? Math.floor(pax / (req + bonus)) * bonus : 0;

// 3) 효율 계산 (bonus 비율)
const calcRate = (req, bonus) => bonus / (req + bonus);

// ⭐ 4) 최종적으로 가장 유리한 FOC Rule 하나 선택
export const getBestFOCOffer = (offers = [], pax = 0) => {
    const parsed = offers
        .map(parseFOC)
        .filter(Boolean)
        .map((o) => ({
            ...o,
            free: calcFree(pax, o.req, o.bonus),
            rate: calcRate(o.req, o.bonus),
        }))
        .filter((o) => o.free > 0); // free 없는 규칙은 제외

    if (parsed.length === 0) return null;

    // ⭐ 우선순위 정렬
    parsed.sort((a, b) => {
        if (b.free !== a.free) return b.free - a.free;     // free DESC
        if (b.rate !== a.rate) return b.rate - a.rate;     // rate DESC
        if (b.bonus !== a.bonus) return b.bonus - a.bonus; // bonus DESC
        return a.req - b.req;                              // req ASC
    });

    return parsed[0]; // 최종 1개만 반환
};
