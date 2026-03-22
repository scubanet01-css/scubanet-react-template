// src/utils/buildScubadatesBookingOptions.js

function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function getOccupancyId(ratePlan = {}) {
    if (ratePlan.occupancyId != null) return toNumber(ratePlan.occupancyId, 0);
    if (ratePlan.occupancyValue != null) return toNumber(ratePlan.occupancyValue, 0);

    if (Array.isArray(ratePlan.occupancy) && ratePlan.occupancy.length > 0) {
        const first = ratePlan.occupancy[0];
        if (typeof first === "object") return toNumber(first.id, 0);
        return toNumber(first, 0);
    }

    return 0;
}

function getRemainingSpaces(cabin = {}) {
    return toNumber(
        cabin?.remaining ??
        cabin?.availableSpaces ??
        cabin?.meta?.availableSpaces ??
        0,
        0
    );
}

function getSpacesPerCabin(cabin = {}) {
    return toNumber(
        cabin?.meta?.spacesPerCabin ??
        cabin?.capacity ??
        2,
        2
    );
}

function buildSharedOptions({
    cabin,
    ratePlan,
    remaining,
    spacesPerCabin,
    price,
}) {
    const cabinId = cabin?.cabinId || cabin?.id || "cabin";
    const ratePlanName = ratePlan?.ratePlanName || ratePlan?.name || "";

    const options = [];

    // ✅ 2인실(또는 spacesPerCabin인실) 공유:
    // 1명부터 remaining명까지 모두 허용
    for (let peopleCount = 1; peopleCount <= remaining; peopleCount += 1) {
        const roomCount = Math.ceil(peopleCount / spacesPerCabin);

        options.push({
            selectionKey: `${cabinId}_shared_${peopleCount}`,
            occupancy: "2",
            label:
                peopleCount === 1
                    ? `${spacesPerCabin}인 1실 (1명, 룸쉐어)`
                    : `${spacesPerCabin}인 1실 (${peopleCount}명)`,
            mode: "shared_room",
            peopleCount,
            roomCount,
            unitPrice: price,              // 1인당 가격
            price,                         // 기존 호환용
            totalPrice: price * peopleCount,
            unitSuffix: "/인",
            ratePlanName,
            discountPercent: toNumber(ratePlan?.discountPercent, 0),
            isInstructorOnly: !!ratePlan?.isInstructorOnly,
        });
    }

    return options;
}

function buildPrivateOptions({
    cabin,
    ratePlan,
    remaining,
    spacesPerCabin,
    price,
}) {
    const cabinId = cabin?.cabinId || cabin?.id || "cabin";
    const ratePlanName = ratePlan?.ratePlanName || ratePlan?.name || "";

    const options = [];
    const maxRooms = Math.floor(remaining / spacesPerCabin);

    for (let roomCount = 1; roomCount <= maxRooms; roomCount += 1) {
        const peopleCount = roomCount; // 독실 1실당 1명

        options.push({
            selectionKey: `${cabinId}_private_${roomCount}`,
            occupancy: "1",
            label: `독실 사용 (${roomCount}실 / ${peopleCount}명)`,
            mode: "private_room",
            peopleCount,
            roomCount,
            unitPrice: price,             // 1실 가격
            price,                        // 기존 호환용
            totalPrice: price * roomCount,
            unitSuffix: "/실",
            ratePlanName,
            discountPercent: toNumber(ratePlan?.discountPercent, 0),
            isInstructorOnly: !!ratePlan?.isInstructorOnly,
        });
    }

    return options;
}

/**
 * Scubadates cabin 데이터를 받아
 * 방타입 카드 1개에서 사용할 드롭다운 옵션 배열을 만든다.
 *
 * 규칙:
 * - occupancyId=2 → 공유형 옵션
 *   - 1명부터 remaining명까지 모두 생성
 * - occupancyId=1 → 독실 사용 옵션
 *   - 1실부터 floor(remaining / spacesPerCabin)실까지 생성
 */
export function buildScubadatesBookingOptions(
    cabin,
    { includeInstructorOnly = false } = {}
) {
    const ratePlans = Array.isArray(cabin?.ratePlans) ? cabin.ratePlans : [];
    if (!ratePlans.length) return [];

    const remaining = getRemainingSpaces(cabin);
    const spacesPerCabin = getSpacesPerCabin(cabin);

    if (remaining <= 0) return [];

    const expanded = [];

    ratePlans
        .filter((rp) => rp && rp.price != null)
        .filter((rp) => includeInstructorOnly || !rp.isInstructorOnly)
        .forEach((rp) => {
            const occupancyId = getOccupancyId(rp);
            const price = toNumber(rp.price, 0);

            if (price <= 0) return;

            // ✅ 독실 사용
            if (occupancyId === 1) {
                expanded.push(
                    ...buildPrivateOptions({
                        cabin,
                        ratePlan: rp,
                        remaining,
                        spacesPerCabin,
                        price,
                    })
                );
            }

            // ✅ 2인 1실 / 룸쉐어
            if (occupancyId === 2) {
                expanded.push(
                    ...buildSharedOptions({
                        cabin,
                        ratePlan: rp,
                        remaining,
                        spacesPerCabin,
                        price,
                    })
                );
            }
        });

    // selectionKey 기준 중복 제거
    const unique = new Map();
    expanded.forEach((opt) => {
        if (!unique.has(opt.selectionKey)) {
            unique.set(opt.selectionKey, opt);
        }
    });

    const result = Array.from(unique.values());

    // 정렬:
    // 1) shared_room 먼저
    // 2) peopleCount 오름차순
    // 3) private_room 나중
    result.sort((a, b) => {
        const modeOrder = {
            shared_room: 1,
            private_room: 2,
        };

        const aMode = modeOrder[a.mode] || 99;
        const bMode = modeOrder[b.mode] || 99;

        if (aMode !== bMode) return aMode - bMode;
        if (a.peopleCount !== b.peopleCount) return a.peopleCount - b.peopleCount;

        return a.totalPrice - b.totalPrice;
    });

    return result;
}

export default buildScubadatesBookingOptions;