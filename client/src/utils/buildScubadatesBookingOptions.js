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

function buildSingleUseOptions({
    cabin,
    ratePlan,
    maxFullCabins,
    price,
}) {
    const cabinId = cabin?.cabinId || cabin?.id || "cabin";
    const ratePlanName = ratePlan?.ratePlanName || ratePlan?.name || "";

    const options = [];

    for (let roomCount = 1; roomCount <= maxFullCabins; roomCount += 1) {
        options.push({
            selectionKey: `${cabinId}_single_${roomCount}`,
            occupancy: "1",
            label: `독실 사용 (${roomCount}실 / ${roomCount}명)`,
            price, // 1실 가격
            peopleCount: roomCount,
            roomCount,
            totalPrice: price * roomCount,
            unitSuffix: "/실",
            ratePlanName,
            discountPercent: toNumber(ratePlan?.discountPercent, 0),
            isInstructorOnly: !!ratePlan?.isInstructorOnly,
            mode: "single_use",
        });
    }

    return options;
}

function buildDoubleUseOptions({
    cabin,
    ratePlan,
    maxFullCabins,
    price,
    spacesPerCabin,
}) {
    const cabinId = cabin?.cabinId || cabin?.id || "cabin";
    const ratePlanName = ratePlan?.ratePlanName || ratePlan?.name || "";

    const options = [];

    // 1명 예약: 2인실 쉐어
    options.push({
        selectionKey: `${cabinId}_double_1`,
        occupancy: "2",
        label: `${spacesPerCabin}인 1실 (1명, 룸쉐어)`,
        price, // 1인당 가격
        peopleCount: 1,
        roomCount: 1,
        totalPrice: price,
        unitSuffix: "/인",
        ratePlanName,
        discountPercent: toNumber(ratePlan?.discountPercent, 0),
        isInstructorOnly: !!ratePlan?.isInstructorOnly,
        mode: "shared_room_single",
    });

    // 2명 이상 예약
    for (let roomCount = 1; roomCount <= maxFullCabins; roomCount += 1) {
        const peopleCount = roomCount * spacesPerCabin;

        options.push({
            selectionKey: `${cabinId}_double_${peopleCount}`,
            occupancy: "2",
            label: `${spacesPerCabin}인 1실 (${peopleCount}명)`,
            price, // 1인당 가격
            peopleCount,
            roomCount,
            totalPrice: price * peopleCount,
            unitSuffix: "/인",
            ratePlanName,
            discountPercent: toNumber(ratePlan?.discountPercent, 0),
            isInstructorOnly: !!ratePlan?.isInstructorOnly,
            mode: "shared_room",
        });
    }

    return options;
}

function buildFallbackOptions({
    cabin,
    ratePlan,
    remaining,
    spacesPerCabin,
    price,
    occupancyId,
}) {
    const cabinId = cabin?.cabinId || cabin?.id || "cabin";
    const ratePlanName = ratePlan?.ratePlanName || ratePlan?.name || "";

    // 객실 단위 계산이 애매한 경우 최소 선택지 유지
    if (occupancyId === 1 && remaining >= 1) {
        return [
            {
                selectionKey: `${cabinId}_single_fallback_1`,
                occupancy: "1",
                label: "독실 사용 (1실 / 1명)",
                price,
                peopleCount: 1,
                roomCount: 1,
                totalPrice: price,
                unitSuffix: "/실",
                ratePlanName,
                discountPercent: toNumber(ratePlan?.discountPercent, 0),
                isInstructorOnly: !!ratePlan?.isInstructorOnly,
                mode: "single_use",
            },
        ];
    }

    if (occupancyId === 2 && remaining >= 1) {
        const fallbackOptions = [];

        // 1명 룸쉐어는 항상 허용
        fallbackOptions.push({
            selectionKey: `${cabinId}_double_fallback_1`,
            occupancy: "2",
            label: `${spacesPerCabin}인 1실 (1명, 룸쉐어)`,
            price,
            peopleCount: 1,
            roomCount: 1,
            totalPrice: price,
            unitSuffix: "/인",
            ratePlanName,
            discountPercent: toNumber(ratePlan?.discountPercent, 0),
            isInstructorOnly: !!ratePlan?.isInstructorOnly,
            mode: "shared_room_single",
        });

        // 남은 좌석이 객실당 인원 이상이면 1실 전체도 허용
        if (remaining >= spacesPerCabin) {
            fallbackOptions.push({
                selectionKey: `${cabinId}_double_fallback_${spacesPerCabin}`,
                occupancy: "2",
                label: `${spacesPerCabin}인 1실 (${spacesPerCabin}명)`,
                price,
                peopleCount: spacesPerCabin,
                roomCount: 1,
                totalPrice: price * spacesPerCabin,
                unitSuffix: "/인",
                ratePlanName,
                discountPercent: toNumber(ratePlan?.discountPercent, 0),
                isInstructorOnly: !!ratePlan?.isInstructorOnly,
                mode: "shared_room",
            });
        }

        return fallbackOptions;
    }

    return [];
}

/**
 * Scubadates cabin 데이터를 받아
 * 예약 가능한 옵션 배열을 생성한다.
 *
 * 반환 예시:
 * [
 *   {
 *     selectionKey,
 *     occupancy,
 *     label,
 *     price,
 *     peopleCount,
 *     roomCount,
 *     totalPrice,
 *     unitSuffix,
 *     ratePlanName,
 *     discountPercent,
 *     isInstructorOnly,
 *     mode,
 *   }
 * ]
 */
export function buildScubadatesBookingOptions(
    cabin,
    { includeInstructorOnly = false } = {}
) {
    const ratePlans = Array.isArray(cabin?.ratePlans) ? cabin.ratePlans : [];
    if (!ratePlans.length) return [];

    const remaining = getRemainingSpaces(cabin);
    const spacesPerCabin = getSpacesPerCabin(cabin);

    // 완전한 객실 단위로 계산 가능한 최대 객실 수
    const maxFullCabins =
        spacesPerCabin > 0 ? Math.floor(remaining / spacesPerCabin) : 0;

    const expanded = [];

    ratePlans
        .filter((rp) => rp && rp.price != null)
        .filter((rp) => includeInstructorOnly || !rp.isInstructorOnly)
        .forEach((rp) => {
            const occupancyId = getOccupancyId(rp);
            const price = toNumber(rp.price, 0);

            if (price <= 0) return;

            // 독실 사용
            if (occupancyId === 1) {
                if (maxFullCabins > 0) {
                    expanded.push(
                        ...buildSingleUseOptions({
                            cabin,
                            ratePlan: rp,
                            maxFullCabins,
                            price,
                        })
                    );
                } else {
                    expanded.push(
                        ...buildFallbackOptions({
                            cabin,
                            ratePlan: rp,
                            remaining,
                            spacesPerCabin,
                            price,
                            occupancyId,
                        })
                    );
                }
            }

            // 2인 1실 / 룸쉐어
            if (occupancyId === 2) {
                if (maxFullCabins > 0) {
                    expanded.push(
                        ...buildDoubleUseOptions({
                            cabin,
                            ratePlan: rp,
                            maxFullCabins,
                            price,
                            spacesPerCabin,
                        })
                    );
                } else {
                    expanded.push(
                        ...buildFallbackOptions({
                            cabin,
                            ratePlan: rp,
                            remaining,
                            spacesPerCabin,
                            price,
                            occupancyId,
                        })
                    );
                }
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

    // 정렬
    // 1) shared_room_single 먼저
    // 2) shared_room
    // 3) single_use
    // 4) peopleCount 오름차순
    result.sort((a, b) => {
        const modeOrder = {
            shared_room_single: 1,
            shared_room: 2,
            single_use: 3,
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