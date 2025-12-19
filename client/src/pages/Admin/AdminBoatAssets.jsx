import React, { useEffect, useMemo, useState } from "react";

/**
 * AdminBoatAssets (Refactored Full Schema)
 * - Full Schema(섹션/미리보기/JSON 프리뷰/서버저장) 유지
 * - 입력 최소화: Tags 제거, 불필요한 텍스트 입력 최소화
 * - Deck Code: MAIN_DECK 포함
 * - 이미지 자동 리사이즈: 선택 시 캔버스로 축소하여 state에 저장(향후 업로드 단계에도 그대로 사용 가능)
 *
 * 서버 저장: POST /admin/api/boats-assets (nginx 프록시 기준)
 * 현재 단계는 "메타데이터 저장" 단계이며, 이미지 업로드(multer)는 다음 단계에서 추가 예정.
 */

const CABIN_TYPE_OPTIONS = ["STANDARD", "DELUXE", "SUITE", "CUSTOM"];

const DECK_CODE_OPTIONS = [
    "LOWER_DECK",
    "MAIN_DECK",
    "UPPER_DECK",
    "SUN_DECK",
    "BRIDGE_DECK",
    "OTHER",
];

const FACILITY_TYPE_OPTIONS = [
    "RESTAURANT",
    "LOUNGE",
    "SUN_DECK",
    "DIVE_DECK",
    "CAMERA_ROOM",
    "BAR",
    "OTHER",
];

const FOOD_TYPE_OPTIONS = ["MEAL", "SNACK", "DRINK", "COCKTAIL", "OTHER"];

// 메타데이터 URL 규칙(파일명 기반)
function buildUrl({ vesselId, bucket, sub, filename }) {
    if (!filename) return "";
    const base = `/assets/vessels/${vesselId}/${bucket}`;
    return sub ? `${base}/${sub}/${filename}` : `${base}/${filename}`;
}

// --------- 이미지 리사이즈 유틸 (클라이언트) ---------
async function resizeImageFile(file, opts = {}) {
    const {
        maxWidth = 1600,
        maxHeight = 1600,
        quality = 0.85,
        // 입력이 PNG여도 용량이 너무 크면 jpeg로 변환하는 게 유리.
        // 다만 투명 배경이 필요하면 PNG 유지가 필요할 수 있으니, 기본은 "원본이 PNG면 PNG 유지".
        keepPngIfSourcePng = true,
    } = opts;

    // 이미지가 아니면 그대로 반환
    if (!file?.type?.startsWith("image/")) return file;

    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    try {
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = objectUrl;
        });

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        // 이미 충분히 작으면 원본 반환
        if (srcW <= maxWidth && srcH <= maxHeight) {
            return file;
        }

        const ratio = Math.min(maxWidth / srcW, maxHeight / srcH);
        const dstW = Math.round(srcW * ratio);
        const dstH = Math.round(srcH * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = dstW;
        canvas.height = dstH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, dstW, dstH);

        const srcIsPng = file.type === "image/png";
        const outType =
            srcIsPng && keepPngIfSourcePng ? "image/png" : "image/jpeg";

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, outType, outType === "image/jpeg" ? quality : undefined)
        );

        if (!blob) return file;

        // 파일명 유지(업로드 단계에서 동일 파일명 규칙을 유지하려면)
        // 단, jpeg로 바꾸면 확장자도 바꾸는 게 정석이지만 지금은 "메타데이터 저장"이므로 이름 유지.
        // 실제 업로드 단계에서 확장자 일치 정책을 정하면 그때 조정하면 됩니다.
        const resizedFile = new File([blob], file.name, { type: outType });

        return resizedFile;
    } catch (e) {
        console.error("resizeImageFile failed:", e);
        return file;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

// objectURL 생성/관리(메모리 누수 방지)
function makePreviewUrl(file) {
    if (!file) return "";
    return URL.createObjectURL(file);
}

function AdminBoatAssets() {
    const [utsTrips, setUtsTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    // Hero
    // { id, file, preview, title, description, isPrimary, order }
    const [heroImage, setHeroImage] = useState(null);

    // Deck Plans
    // [{ deckCode, deckName, order, image:{ id, file, preview, title, order } }]
    const [deckPlans, setDeckPlans] = useState([]);

    // Cabins
    // [{ cabinTypeCode, deckCode, cabinName, images:[{id,file,preview,title,order}] }]
    const [cabins, setCabins] = useState([]);

    // Facilities
    // [{ facilityType, name, images:[{id,file,preview,title,order}] }]
    const [facilities, setFacilities] = useState([]);

    // Tenders
    // [{ name, capacity, images:[{id,file,preview,title,order}] }]
    const [tenders, setTenders] = useState([]);

    // Food
    // [{ foodType, name, images:[{id,file,preview,title,order}] }]
    const [food, setFood] = useState([]);

    const [saveStatus, setSaveStatus] = useState("");

    // -------------------------------
    // Load UTS Trips
    // -------------------------------
    useEffect(() => {
        fetch("/data/uts-trips.json")
            .then((res) => res.json())
            .then((data) => {
                setUtsTrips(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("uts-trips.json 로드 실패", err);
                setLoading(false);
            });
    }, []);

    // vessel options
    const vesselOptions = useMemo(() => {
        const map = new Map();
        utsTrips.forEach((t) => {
            if (t.vesselId && !map.has(t.vesselId)) {
                map.set(t.vesselId, {
                    vesselId: t.vesselId,
                    boatName: t.boatName || t.vesselId,
                });
            }
        });
        return Array.from(map.values());
    }, [utsTrips]);

    // -------------------------------
    // Cleanup previews on unmount / vessel change
    // -------------------------------
    function revokePreview(obj) {
        if (!obj) return;
        if (obj.preview) URL.revokeObjectURL(obj.preview);
    }

    function revokeAllPreviews() {
        revokePreview(heroImage);

        deckPlans.forEach((d) => revokePreview(d?.image));
        cabins.forEach((c) => c.images?.forEach(revokePreview));
        facilities.forEach((f) => f.images?.forEach(revokePreview));
        tenders.forEach((t) => t.images?.forEach(revokePreview));
        food.forEach((f) => f.images?.forEach(revokePreview));
    }

    useEffect(() => {
        return () => {
            // component unmount
            revokeAllPreviews();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function resetAllStatesForNewVessel(nextVesselId, nextBoatName) {
        // 기존 preview URL 정리
        revokeAllPreviews();

        setVesselId(nextVesselId);
        setBoatName(nextBoatName);

        setHeroImage(null);
        setDeckPlans([]);
        setCabins([]);
        setFacilities([]);
        setTenders([]);
        setFood([]);
        setSaveStatus("");
    }

    function handleVesselSelect(e) {
        const selected = vesselOptions.find((v) => v.vesselId === e.target.value);
        if (!selected) return;
        resetAllStatesForNewVessel(selected.vesselId, selected.boatName);
    }

    // -------------------------------
    // Hero
    // -------------------------------
    async function handleHeroUpload(e) {
        const raw = e.target.files?.[0];
        if (!raw || !vesselId) return;

        const file = await resizeImageFile(raw, { maxWidth: 2000, maxHeight: 2000, quality: 0.9 });
        const preview = makePreviewUrl(file);

        setHeroImage({
            id: `${vesselId}_hero_01`,
            file,
            preview,
            title: boatName || "",
            description: "", // Hero만 간단 설명 유지(선택)
            order: 1,
            isPrimary: true,
        });
    }

    function updateHero(field, value) {
        if (!heroImage) return;
        setHeroImage({ ...heroImage, [field]: value });
    }

    function removeHero() {
        revokePreview(heroImage);
        setHeroImage(null);
    }

    // -------------------------------
    // Deck Plans
    // -------------------------------
    function addDeckPlan() {
        if (!vesselId) return;
        setDeckPlans((prev) => [
            ...prev,
            {
                deckCode: "MAIN_DECK",
                deckName: "Main Deck",
                order: prev.length + 1,
                image: null,
            },
        ]);
    }

    function removeDeckPlan(index) {
        setDeckPlans((prev) => {
            const updated = [...prev];
            // preview 정리
            revokePreview(updated[index]?.image);

            updated.splice(index, 1);
            return updated.map((d, i) => ({ ...d, order: i + 1 }));
        });
    }

    function updateDeckPlan(index, field, value) {
        setDeckPlans((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            // deckCode 변경 시, image id/title도 기본값을 유지하고 싶으면 여기서 처리 가능(선택)
            return updated;
        });
    }

    async function uploadDeckPlanImage(index, rawFile) {
        if (!rawFile || !vesselId) return;

        const file = await resizeImageFile(rawFile, { maxWidth: 2000, maxHeight: 2000, quality: 0.9 });

        setDeckPlans((prev) => {
            const updated = [...prev];
            const deck = updated[index];

            // 기존 preview 정리
            revokePreview(deck?.image);

            const preview = makePreviewUrl(file);

            updated[index] = {
                ...deck,
                image: {
                    id: `${vesselId}_deck_${deck.deckCode}_${Date.now()}`,
                    file,
                    preview,
                    title: deck.deckName ? `${deck.deckName} Plan` : `${deck.deckCode} Plan`,
                    order: deck.order || index + 1,
                },
            };
            return updated;
        });
    }

    function updateDeckPlanImageTitle(index, title) {
        setDeckPlans((prev) => {
            const updated = [...prev];
            const deck = updated[index];
            if (!deck?.image) return prev;
            updated[index] = { ...deck, image: { ...deck.image, title } };
            return updated;
        });
    }

    function removeDeckPlanImage(index) {
        setDeckPlans((prev) => {
            const updated = [...prev];
            const deck = updated[index];
            revokePreview(deck?.image);
            updated[index] = { ...deck, image: null };
            return updated;
        });
    }

    // -------------------------------
    // Cabins
    // -------------------------------
    function addCabin() {
        if (!vesselId) return;
        setCabins((prev) => [
            ...prev,
            {
                cabinTypeCode: "STANDARD",
                deckCode: "MAIN_DECK",
                cabinName: "",
                images: [],
            },
        ]);
    }

    function removeCabin(index) {
        setCabins((prev) => {
            const updated = [...prev];
            // preview 정리
            updated[index]?.images?.forEach(revokePreview);
            updated.splice(index, 1);
            return updated;
        });
    }

    function updateCabin(index, field, value) {
        setCabins((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    async function addCabinImage(cabinIndex, rawFile) {
        if (!rawFile || !vesselId) return;

        const file = await resizeImageFile(rawFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.88 });

        setCabins((prev) => {
            const updated = [...prev];
            const cabin = updated[cabinIndex];

            const preview = makePreviewUrl(file);
            const order = (cabin.images?.length || 0) + 1;

            const defaultTitle =
                cabin.cabinName?.trim()
                    ? cabin.cabinName.trim()
                    : `${cabin.cabinTypeCode} Cabin`;

            const nextImg = {
                id: `${vesselId}_cabin_${cabin.cabinTypeCode}_${Date.now()}`,
                file,
                preview,
                title: defaultTitle, // 최소입력: Title은 자동 세팅 + 필요 시 수정만
                order,
            };

            updated[cabinIndex] = {
                ...cabin,
                images: [...(cabin.images || []), nextImg],
            };

            return updated;
        });
    }

    function updateCabinImage(cabinIndex, imageIndex, field, value) {
        setCabins((prev) => {
            const updated = [...prev];
            const cabin = updated[cabinIndex];
            const img = cabin.images?.[imageIndex];
            if (!img) return prev;

            const nextImages = [...cabin.images];
            nextImages[imageIndex] = { ...img, [field]: value };
            updated[cabinIndex] = { ...cabin, images: nextImages };
            return updated;
        });
    }

    function removeCabinImage(cabinIndex, imageIndex) {
        setCabins((prev) => {
            const updated = [...prev];
            const cabin = updated[cabinIndex];
            const img = cabin.images?.[imageIndex];
            revokePreview(img);

            const nextImages = [...(cabin.images || [])];
            nextImages.splice(imageIndex, 1);
            // order 재정렬
            const normalized = nextImages.map((it, i) => ({ ...it, order: i + 1 }));
            updated[cabinIndex] = { ...cabin, images: normalized };
            return updated;
        });
    }

    // -------------------------------
    // Facilities
    // -------------------------------
    function addFacility() {
        if (!vesselId) return;
        setFacilities((prev) => [
            ...prev,
            { facilityType: "RESTAURANT", name: "", images: [] },
        ]);
    }

    function removeFacility(index) {
        setFacilities((prev) => {
            const updated = [...prev];
            updated[index]?.images?.forEach(revokePreview);
            updated.splice(index, 1);
            return updated;
        });
    }

    function updateFacility(index, field, value) {
        setFacilities((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    async function addFacilityImage(facilityIndex, rawFile) {
        if (!rawFile || !vesselId) return;

        const file = await resizeImageFile(rawFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.88 });

        setFacilities((prev) => {
            const updated = [...prev];
            const fac = updated[facilityIndex];

            const preview = makePreviewUrl(file);
            const order = (fac.images?.length || 0) + 1;

            const defaultTitle = fac.name?.trim() ? fac.name.trim() : fac.facilityType;

            fac.images = [
                ...(fac.images || []),
                {
                    id: `${vesselId}_facility_${fac.facilityType}_${Date.now()}`,
                    file,
                    preview,
                    title: defaultTitle,
                    order,
                },
            ];

            updated[facilityIndex] = { ...fac };
            return updated;
        });
    }

    function updateFacilityImage(facilityIndex, imageIndex, field, value) {
        setFacilities((prev) => {
            const updated = [...prev];
            const fac = updated[facilityIndex];
            const img = fac.images?.[imageIndex];
            if (!img) return prev;

            const nextImages = [...fac.images];
            nextImages[imageIndex] = { ...img, [field]: value };
            updated[facilityIndex] = { ...fac, images: nextImages };
            return updated;
        });
    }

    function removeFacilityImage(facilityIndex, imageIndex) {
        setFacilities((prev) => {
            const updated = [...prev];
            const fac = updated[facilityIndex];
            const img = fac.images?.[imageIndex];
            revokePreview(img);

            const nextImages = [...(fac.images || [])];
            nextImages.splice(imageIndex, 1);
            const normalized = nextImages.map((it, i) => ({ ...it, order: i + 1 }));
            updated[facilityIndex] = { ...fac, images: normalized };
            return updated;
        });
    }

    // -------------------------------
    // Tenders
    // -------------------------------
    function addTender() {
        if (!vesselId) return;
        setTenders((prev) => [
            ...prev,
            { name: "", capacity: "", images: [] },
        ]);
    }

    function removeTender(index) {
        setTenders((prev) => {
            const updated = [...prev];
            updated[index]?.images?.forEach(revokePreview);
            updated.splice(index, 1);
            return updated;
        });
    }

    function updateTender(index, field, value) {
        setTenders((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    async function addTenderImage(tenderIndex, rawFile) {
        if (!rawFile || !vesselId) return;

        const file = await resizeImageFile(rawFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.88 });

        setTenders((prev) => {
            const updated = [...prev];
            const t = updated[tenderIndex];

            const preview = makePreviewUrl(file);
            const order = (t.images?.length || 0) + 1;

            const defaultTitle = t.name?.trim() ? t.name.trim() : "Tender";

            t.images = [
                ...(t.images || []),
                {
                    id: `${vesselId}_tender_${Date.now()}`,
                    file,
                    preview,
                    title: defaultTitle,
                    order,
                },
            ];

            updated[tenderIndex] = { ...t };
            return updated;
        });
    }

    function updateTenderImage(tenderIndex, imageIndex, field, value) {
        setTenders((prev) => {
            const updated = [...prev];
            const t = updated[tenderIndex];
            const img = t.images?.[imageIndex];
            if (!img) return prev;

            const nextImages = [...t.images];
            nextImages[imageIndex] = { ...img, [field]: value };
            updated[tenderIndex] = { ...t, images: nextImages };
            return updated;
        });
    }

    function removeTenderImage(tenderIndex, imageIndex) {
        setTenders((prev) => {
            const updated = [...prev];
            const t = updated[tenderIndex];
            const img = t.images?.[imageIndex];
            revokePreview(img);

            const nextImages = [...(t.images || [])];
            nextImages.splice(imageIndex, 1);
            const normalized = nextImages.map((it, i) => ({ ...it, order: i + 1 }));
            updated[tenderIndex] = { ...t, images: normalized };
            return updated;
        });
    }

    // -------------------------------
    // Food
    // -------------------------------
    function addFood() {
        if (!vesselId) return;
        setFood((prev) => [
            ...prev,
            { foodType: "MEAL", name: "", images: [] },
        ]);
    }

    function removeFood(index) {
        setFood((prev) => {
            const updated = [...prev];
            updated[index]?.images?.forEach(revokePreview);
            updated.splice(index, 1);
            return updated;
        });
    }

    function updateFood(index, field, value) {
        setFood((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    async function addFoodImage(foodIndex, rawFile) {
        if (!rawFile || !vesselId) return;

        const file = await resizeImageFile(rawFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.88 });

        setFood((prev) => {
            const updated = [...prev];
            const f = updated[foodIndex];

            const preview = makePreviewUrl(file);
            const order = (f.images?.length || 0) + 1;

            const defaultTitle = f.name?.trim() ? f.name.trim() : f.foodType;

            f.images = [
                ...(f.images || []),
                {
                    id: `${vesselId}_food_${f.foodType}_${Date.now()}`,
                    file,
                    preview,
                    title: defaultTitle,
                    order,
                },
            ];

            updated[foodIndex] = { ...f };
            return updated;
        });
    }

    function updateFoodImage(foodIndex, imageIndex, field, value) {
        setFood((prev) => {
            const updated = [...prev];
            const f = updated[foodIndex];
            const img = f.images?.[imageIndex];
            if (!img) return prev;

            const nextImages = [...f.images];
            nextImages[imageIndex] = { ...img, [field]: value };
            updated[foodIndex] = { ...f, images: nextImages };
            return updated;
        });
    }

    function removeFoodImage(foodIndex, imageIndex) {
        setFood((prev) => {
            const updated = [...prev];
            const f = updated[foodIndex];
            const img = f.images?.[imageIndex];
            revokePreview(img);

            const nextImages = [...(f.images || [])];
            nextImages.splice(imageIndex, 1);
            const normalized = nextImages.map((it, i) => ({ ...it, order: i + 1 }));
            updated[foodIndex] = { ...f, images: normalized };
            return updated;
        });
    }

    // -------------------------------
    // Payload (메타데이터만 저장)
    // -------------------------------
    function buildPayload() {
        if (!vesselId) return null;

        const payload = {
            vesselId,
            boatName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {},
        };

        // hero
        payload.assets.hero =
            heroImage?.file
                ? {
                    id: heroImage.id,
                    url: buildUrl({ vesselId, bucket: "hero", filename: heroImage.file.name }),
                    title: heroImage.title || boatName || "",
                    description: heroImage.description || "",
                    order: heroImage.order || 1,
                    isPrimary: !!heroImage.isPrimary,
                }
                : null;

        // deckPlans (이미지 있는 것만 저장)
        const deckPlansOut = deckPlans
            .map((d) => {
                if (!d?.image?.file) return null;
                return {
                    deckCode: d.deckCode,
                    deckName: d.deckName || d.deckCode,
                    order: d.order || 1,
                    image: {
                        id: d.image.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "deck-plans",
                            sub: d.deckCode,
                            filename: d.image.file.name,
                        }),
                        title: d.image.title || `${d.deckName || d.deckCode} Plan`,
                        order: d.image.order || d.order || 1,
                    },
                };
            })
            .filter(Boolean);
        if (deckPlansOut.length) payload.assets.deckPlans = deckPlansOut;

        // cabins (이미지 있는 것만 저장)
        const cabinsOut = cabins
            .map((c) => {
                const imagesOut = (c.images || [])
                    .filter((img) => img?.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "cabins",
                            sub: c.cabinTypeCode,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    }));

                // cabinName 또는 images가 있는 경우만 저장
                if (!imagesOut.length && !c.cabinName?.trim()) return null;

                return {
                    cabinTypeCode: c.cabinTypeCode,
                    deckCode: c.deckCode || "OTHER",
                    cabinName: c.cabinName || "",
                    images: imagesOut,
                };
            })
            .filter(Boolean);
        if (cabinsOut.length) payload.assets.cabins = cabinsOut;

        // facilities
        const facilitiesOut = facilities
            .map((f) => {
                const imagesOut = (f.images || [])
                    .filter((img) => img?.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "facilities",
                            sub: f.facilityType,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    }));

                if (!imagesOut.length && !f.name?.trim()) return null;

                return {
                    facilityType: f.facilityType,
                    name: f.name || "",
                    images: imagesOut,
                };
            })
            .filter(Boolean);
        if (facilitiesOut.length) payload.assets.facilities = facilitiesOut;

        // tenders
        const tendersOut = tenders
            .map((t) => {
                const imagesOut = (t.images || [])
                    .filter((img) => img?.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({ vesselId, bucket: "tenders", filename: img.file.name }),
                        title: img.title || "",
                        order: img.order || 1,
                    }));

                if (!imagesOut.length && !t.name?.trim()) return null;

                return {
                    name: t.name || "",
                    capacity: t.capacity === "" ? null : Number(t.capacity),
                    images: imagesOut,
                };
            })
            .filter(Boolean);
        if (tendersOut.length) payload.assets.tenders = tendersOut;

        // food
        const foodOut = food
            .map((f) => {
                const imagesOut = (f.images || [])
                    .filter((img) => img?.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "food",
                            sub: f.foodType,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    }));

                if (!imagesOut.length && !f.name?.trim()) return null;

                return {
                    foodType: f.foodType,
                    name: f.name || "",
                    images: imagesOut,
                };
            })
            .filter(Boolean);
        if (foodOut.length) payload.assets.food = foodOut;

        return payload;
    }

    // -------------------------------
    // Save to Server
    // -------------------------------
    async function handleSaveToServer() {
        const payload = buildPayload();
        if (!payload) {
            alert("선박을 먼저 선택하세요.");
            return;
        }

        setSaveStatus("저장 중...");

        try {
            const res = await fetch("/admin/api/boats-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`서버 오류 ${res.status}: ${text}`);
            }

            const result = await res.json();

            if (result.success) {
                setSaveStatus(`✅ 저장 완료 (${payload.vesselId})`);
            } else {
                setSaveStatus(`❌ 저장 실패: ${result.message || ""}`);
            }
        } catch (err) {
            console.error("서버 저장 실패:", err);
            setSaveStatus("❌ 서버 오류 (콘솔 확인)");
        }
    }

    const previewJson = useMemo(() => buildPayload(), [
        vesselId,
        boatName,
        heroImage,
        deckPlans,
        cabins,
        facilities,
        tenders,
        food,
    ]);

    if (loading) return <div style={{ padding: 24 }}>UTS 데이터 로딩 중...</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <h2>Boat Assets Admin (Refactored Full Schema)</h2>

            {/* Vessel Select */}
            <section style={{ padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                <h3 style={{ marginTop: 0 }}>UTS 선박 선택</h3>
                <select value={vesselId} onChange={handleVesselSelect} style={{ minWidth: 420 }}>
                    <option value="">선박 선택</option>
                    {vesselOptions.map((v) => (
                        <option key={v.vesselId} value={v.vesselId}>
                            {v.boatName} ({v.vesselId})
                        </option>
                    ))}
                </select>

                {vesselId && (
                    <div style={{ marginTop: 8, color: "#666" }}>
                        선택됨: <strong>{boatName}</strong> / <code>{vesselId}</code>
                    </div>
                )}
            </section>

            {!vesselId ? (
                <div style={{ marginTop: 16, color: "#777" }}>
                    선박을 선택하면 입력 섹션이 활성화됩니다.
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <h3 style={{ marginTop: 0 }}>Hero (대표 이미지)</h3>

                        <input type="file" accept="image/*" onChange={handleHeroUpload} />

                        {heroImage?.preview && (
                            <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <img
                                    src={heroImage.preview}
                                    alt="hero"
                                    style={{ width: 260, borderRadius: 8, border: "1px solid #ddd" }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                        <input
                                            value={heroImage.title || ""}
                                            onChange={(e) => updateHero("title", e.target.value)}
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    {/* Hero는 설명이 유용할 수 있어 최소 유지(원치 않으면 이 블록 통째로 삭제 가능) */}
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "block", fontSize: 12, color: "#555" }}>Description (선택)</label>
                                        <textarea
                                            value={heroImage.description || ""}
                                            onChange={(e) => updateHero("description", e.target.value)}
                                            rows={3}
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={!!heroImage.isPrimary}
                                            onChange={(e) => updateHero("isPrimary", e.target.checked)}
                                        />
                                        대표 이미지로 설정
                                    </label>

                                    <div style={{ marginTop: 10 }}>
                                        <button onClick={removeHero} style={{ color: "#b00" }}>
                                            Hero 제거
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Deck Plans */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Deck Plans (덱 플랜)</h3>
                            <button onClick={addDeckPlan}>+ 덱 추가</button>
                        </div>

                        {deckPlans.length === 0 && (
                            <div style={{ color: "#777" }}>
                                보통 LOWER / MAIN / UPPER 3개를 추가합니다. (블랙펄처럼 “All Deck” 1장도 가능)
                            </div>
                        )}

                        {deckPlans.map((d, idx) => (
                            <div
                                key={`${d.deckCode}_${idx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select value={d.deckCode} onChange={(e) => updateDeckPlan(idx, "deckCode", e.target.value)}>
                                            {DECK_CODE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Deck Name (예: Main Deck / All Deck)"
                                            value={d.deckName}
                                            onChange={(e) => updateDeckPlan(idx, "deckName", e.target.value)}
                                            style={{ width: 260 }}
                                        />
                                    </div>

                                    <button onClick={() => removeDeckPlan(idx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Deck Plan Image (덱당 1장)</div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => uploadDeckPlanImage(idx, e.target.files?.[0])}
                                        />
                                        {d.image?.preview && (
                                            <img
                                                src={d.image.preview}
                                                alt="deck plan"
                                                style={{ marginTop: 10, width: 260, borderRadius: 8, border: "1px solid #ddd" }}
                                            />
                                        )}
                                    </div>

                                    {d.image && (
                                        <div style={{ flex: 1 }}>
                                            <div style={{ marginBottom: 8 }}>
                                                <label style={{ display: "block", fontSize: 12, color: "#555" }}>Image Title</label>
                                                <input
                                                    value={d.image.title || ""}
                                                    onChange={(e) => updateDeckPlanImageTitle(idx, e.target.value)}
                                                    style={{ width: "100%" }}
                                                />
                                            </div>

                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <button onClick={() => removeDeckPlanImage(idx)} style={{ color: "#b00" }}>
                                                    이미지 제거
                                                </button>
                                                <div style={{ fontSize: 12, color: "#666" }}>
                                                    URL 예시:{" "}
                                                    <code>
                                                        {buildUrl({
                                                            vesselId,
                                                            bucket: "deck-plans",
                                                            sub: d.deckCode,
                                                            filename: d.image.file?.name,
                                                        })}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Cabins */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Cabins (객실)</h3>
                            <button onClick={addCabin}>+ 객실 타입 추가</button>
                        </div>

                        {cabins.length === 0 && <div style={{ color: "#777" }}>객실 타입을 추가하세요.</div>}

                        {cabins.map((c, cIdx) => (
                            <div
                                key={`${c.cabinTypeCode}_${cIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select value={c.cabinTypeCode} onChange={(e) => updateCabin(cIdx, "cabinTypeCode", e.target.value)}>
                                            {CABIN_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <select value={c.deckCode} onChange={(e) => updateCabin(cIdx, "deckCode", e.target.value)}>
                                            {DECK_CODE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Cabin Name (예: Deluxe Twin / 오션뷰 캐빈)"
                                            value={c.cabinName}
                                            onChange={(e) => updateCabin(cIdx, "cabinName", e.target.value)}
                                            style={{ width: 420 }}
                                        />
                                    </div>

                                    <button onClick={() => removeCabin(cIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input type="file" accept="image/*" onChange={(e) => addCabinImage(cIdx, e.target.files?.[0])} />
                                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                                        URL 예시: <code>/assets/vessels/{vesselId}/cabins/{c.cabinTypeCode}/파일명.jpg</code>
                                    </div>
                                </div>

                                {c.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {c.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="cabin"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}

                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateCabinImage(cIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>

                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeCabinImage(cIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Facilities */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Facilities (공용시설)</h3>
                            <button onClick={addFacility}>+ 시설 추가</button>
                        </div>

                        {facilities.length === 0 && <div style={{ color: "#777" }}>시설이 없으면 생략해도 됩니다.</div>}

                        {facilities.map((f, fIdx) => (
                            <div
                                key={`${f.facilityType}_${fIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select value={f.facilityType} onChange={(e) => updateFacility(fIdx, "facilityType", e.target.value)}>
                                            {FACILITY_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Facility Name (예: 레스토랑 / 선덱 / 카메라룸)"
                                            value={f.name}
                                            onChange={(e) => updateFacility(fIdx, "name", e.target.value)}
                                            style={{ width: 520 }}
                                        />
                                    </div>

                                    <button onClick={() => removeFacility(fIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input type="file" accept="image/*" onChange={(e) => addFacilityImage(fIdx, e.target.files?.[0])} />
                                </div>

                                {f.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {f.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="facility"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateFacilityImage(fIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeFacilityImage(fIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Tenders */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Tenders / Dinghy (딩기/도니)</h3>
                            <button onClick={addTender}>+ 보트 추가</button>
                        </div>

                        {tenders.length === 0 && <div style={{ color: "#777" }}>없으면 생략해도 됩니다.</div>}

                        {tenders.map((t, tIdx) => (
                            <div
                                key={`tender_${tIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <input
                                            placeholder="Name (예: Dinghy / Tender Boat)"
                                            value={t.name}
                                            onChange={(e) => updateTender(tIdx, "name", e.target.value)}
                                            style={{ width: 520 }}
                                        />
                                        <input
                                            placeholder="Capacity (선택)"
                                            value={t.capacity}
                                            onChange={(e) => updateTender(tIdx, "capacity", e.target.value)}
                                            style={{ width: 140 }}
                                        />
                                    </div>

                                    <button onClick={() => removeTender(tIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input type="file" accept="image/*" onChange={(e) => addTenderImage(tIdx, e.target.files?.[0])} />
                                </div>

                                {t.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {t.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="tender"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateTenderImage(tIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeTenderImage(tIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Food */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Food / Dining (음식/바)</h3>
                            <button onClick={addFood}>+ 항목 추가</button>
                        </div>

                        {food.length === 0 && <div style={{ color: "#777" }}>없으면 생략해도 됩니다.</div>}

                        {food.map((f, fIdx) => (
                            <div
                                key={`food_${fIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select value={f.foodType} onChange={(e) => updateFood(fIdx, "foodType", e.target.value)}>
                                            {FOOD_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Name (예: 조식/중식/석식 / 칵테일)"
                                            value={f.name}
                                            onChange={(e) => updateFood(fIdx, "name", e.target.value)}
                                            style={{ width: 620 }}
                                        />
                                    </div>

                                    <button onClick={() => removeFood(fIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input type="file" accept="image/*" onChange={(e) => addFoodImage(fIdx, e.target.files?.[0])} />
                                </div>

                                {f.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {f.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="food"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateFoodImage(fIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeFoodImage(fIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Save + Preview */}
                    <section style={{ marginTop: 22, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button onClick={handleSaveToServer} style={{ padding: "10px 16px" }}>
                                서버에 저장
                            </button>
                            <div style={{ color: saveStatus.startsWith("✅") ? "green" : "#666" }}>{saveStatus}</div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <h3 style={{ marginTop: 0 }}>JSON 미리보기</h3>
                            <pre
                                style={{
                                    background: "#f5f5f5",
                                    padding: 12,
                                    borderRadius: 10,
                                    maxHeight: 420,
                                    overflow: "auto",
                                    fontSize: 12,
                                }}
                            >
                                {JSON.stringify(previewJson, null, 2)}
                            </pre>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default AdminBoatAssets;
