// ✅ TripDetail.jsx (UTS + Admin Boat Assets 최종 정리 버전)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";

import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";

const BOAT_ASSETS_JSON_BASE = "/data/boats-assets"; // nginx가 서빙하는 메타데이터 JSON

// ============================
// Cabin Key Normalization Utils
// ============================

function norm(str) {
  return String(str || "").trim().toUpperCase();
}

// canonicalType / cabinName 에서 QUALITY 를 뽑아내는 규칙
function deriveQualityFromCabin(cabin) {
  const ct = norm(cabin?.canonicalType || "");
  const name = norm(cabin?.cabinName || "");

  const src = ct || name;

  if (src.includes("JUNIOR")) return "JUNIOR_SUITE";
  if (src.includes("MASTER")) return "MASTER_SUITE";
  if (src.includes("SUPERIOR")) return "SUPERIOR";
  if (src.includes("DELUXE")) return "DELUXE";
  if (src.includes("SUITE")) return "SUITE";

  return "STANDARD";
}

function TripDetail() {
  const { id: tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [boatAssets, setBoatAssets] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // ✅ 객실(=cabinType)별 이미지 인덱스
  const [indices, setIndices] = useState([]);

  const refs = {
    overview: useRef(null),
    deckplans: useRef(null),
    cabins: useRef(null),
    facilities: useRef(null),
    price: useRef(null),
  };

  const scrollTo = (key) =>
    refs[key]?.current?.scrollIntoView({ behavior: "smooth" });

  const role = localStorage.getItem("role");

  const goBooking = () => {
    if (!trip) return;
    if (role === "instructor") {
      navigate(`/instructor/${trip.id}`, { state: { trip } });
    } else {
      navigate(`/booking/${trip.id}`, { state: { trip } });
    }
  };

  // ===============================
  // ✅ 1) UTS Trip 데이터 로딩
  // ===============================
  useEffect(() => {
    async function loadTrip() {
      try {
        const tripRes = await fetch("/data/uts-trips.json").then((r) =>
          r.json()
        );
        const trips = Array.isArray(tripRes) ? tripRes : tripRes?.data || [];

        const foundTrip = trips.find((t) => String(t.id) === String(tripId));
        setTrip(foundTrip || null);

        const cabinTypes = buildCabinTypes(foundTrip);
        setIndices(Array(cabinTypes.length).fill(0));
      } catch (e) {
        console.error("🚨 TripDetail trip load error:", e);
        setTrip(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadTrip();
  }, [tripId]);

  // ===============================
  // ✅ 2) Admin Boat Assets JSON 로딩
  // ===============================
  useEffect(() => {
    async function loadBoatAssets() {
      if (!trip) return;

      const vesselId = getVesselId(trip);
      console.log("🛳 Trip vesselId:", vesselId);

      if (!vesselId) {
        setBoatAssets(null);
        return;
      }

      const url = `${BOAT_ASSETS_JSON_BASE}/${vesselId}.json`;
      console.log("📦 boatAssets URL:", url);

      setAssetsLoading(true);
      try {
        const res = await fetch(url);

        if (!res.ok) {
          console.warn("⚠ boatAssets JSON not found:", url, res.status);
          setBoatAssets(null);
          return;
        }

        const json = await res.json();
        console.log("✅ boatAssets JSON:", json);

        // JSON 전체를 보관 (assets 루트는 아래에서 분리)
        setBoatAssets(json || null);
      } catch (e) {
        console.error("🚨 boatAssets load error:", e);
        setBoatAssets(null);
      } finally {
        setAssetsLoading(false);
      }
    }

    loadBoatAssets();
  }, [trip]);

  // ===============================
  // ✅ UTS cabins -> "객실 타입" 단위로 묶기
  // ===============================
  function buildCabinTypes(t) {
    const cabins = Array.isArray(t?.cabins) ? t.cabins : [];
    const map = new Map();

    for (const cab of cabins) {
      const base = String(cab?.canonicalType || cab?.type || cab?.name || "").trim();
      const deck = String(cab?.deckCode || "").trim();
      const key = deck ? `${base}__${deck}` : base;

      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,                              // ✅ 추가
          name: key,                        // (구버전 호환)
          displayName: key,                 // ✅ 추가: 나중에 예쁘게 바꿀 자리
          rawType: cab?.type || "",
          description: cab?.description || "",
          images: [],
          cabins: [],
        });
      }

      const bucket = map.get(key);
      bucket.cabins.push(cab);

      const imgs = Array.isArray(cab?.images) ? cab.images : [];
      for (const img of imgs) {
        if (typeof img === "string" && img.trim()) bucket.images.push({ image: img });
        else if (img?.image) bucket.images.push({ image: img.image });
        else if (img?.url) bucket.images.push({ image: img.url });
      }

      if (!bucket.description && cab?.description) bucket.description = cab.description;
    }

    for (const bucket of map.values()) {
      const seen = new Set();
      bucket.images = bucket.images.filter((x) => {
        const u = String(x?.image || "");
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      });
    }

    return Array.from(map.values());
  }


  // ===============================
  // ✅ 객실 타입 최저가
  //    - 기본: 해당 cabinType 에 연결된 UTS cabins 사용
  //    - 보정: cabins 가 비어 있으면 같은 QUALITY + DECK 의 UTS cabins 로 fallback
  // ===============================
  function findCabinTypeLowestPrice(cabType) {
    const allCabins = Array.isArray(trip?.cabins) ? trip.cabins : [];
    if (!cabType || !allCabins.length) return null;

    // 1) 기본: 이 타입에 직접 연결된 cabins 우선 사용
    let candidates = Array.isArray(cabType.cabins) ? cabType.cabins : [];

    // 2) Admin-only 타입(STANDARD DOUBLE LOWER_DECK 등) → fallback
    if (!candidates.length) {
      // key 또는 name 에서 QUALITY / DECK 추출
      const keySource = String(cabType.key || cabType.name || "").toUpperCase();
      const parts = keySource.split("__");

      let quality = parts[0] || "";
      let deck = parts[1] || "";

      quality = quality.toUpperCase();
      deck = deck.toUpperCase();

      // QUALITY, DECK 이 제대로 안 잡혔으면 한 번 더 보정(최소한 deck 이나 quality 하나만 맞아도 매칭)
      candidates = allCabins.filter((c) => {
        const cQuality = String(c.quality || "").toUpperCase();
        const cDeck = String(c.deckCode || "").toUpperCase();

        const okQuality = !quality || cQuality === quality;
        const okDeck = !deck || cDeck === deck;

        return okQuality && okDeck;
      });
    }

    if (!candidates.length) return null;

    // 3) 최저가 찾기
    let best = null;

    for (const cab of candidates) {
      const rps = Array.isArray(cab.ratePlans) ? cab.ratePlans : [];
      for (const rp of rps) {
        const price = rp?.price;
        if (price == null) continue;

        if (!best || Number(price) < Number(best.price)) {
          best = {
            planName: rp.ratePlanName || rp.name || "Rate",
            price,
          };
        }
      }
    }

    return best;
  }





  const changeImage = (idx, dir, total) => {
    setIndices((prev) => {
      const updated = [...prev];
      updated[idx] = (updated[idx] + dir + total) % total;
      return updated;
    });
  };

  // ===============================
  // ✅ vesselId 결정 규칙
  // ===============================
  function getVesselId(t) {
    return (
      t?.vesselId ||
      t?.boatId ||
      t?.boat?.id ||
      t?.boat?.vesselId ||
      t?.boat?.boatId ||
      null
    );
  }

  // ===============================
  // ✅ 공통 메모 값
  // ===============================
  const vesselId = useMemo(() => getVesselId(trip), [trip]);
  const currency = useMemo(() => getCurrencyForTrip(trip), [trip]);

  // boats-assets 핵심 루트
  const assets = boatAssets?.assets || null;

  /* ===============================
     1) Hero (Admin 우선, 없으면 UTS cover)
  =============================== */
  const heroImageUrl = useMemo(() => {
    if (assets?.hero?.url) {
      return assets.hero.url; // 예: "/assets/vessels/vessel_black_pearl/hero/1. Black Pearl.jpg"
    }
    return trip?.images?.cover || null;
  }, [assets, trip]);

  /* ===============================
     2) Overview Gallery (Hero + UTS gallery)
  =============================== */
  const overviewImages = useMemo(() => {
    const list = [];

    if (heroImageUrl) {
      list.push({
        src: heroImageUrl,
        label: trip?.boatName || "",
      });
    }

    const gallery = Array.isArray(trip?.images?.gallery)
      ? trip.images.gallery
      : [];

    for (const g of gallery) {
      const url = typeof g === "string" ? g : g?.url || g?.image;
      if (!url) continue;
      if (list.find((x) => x.src === url)) continue; // 중복 제거

      list.push({
        src: url,
        label: trip?.boatName || "",
      });
    }

    console.log("🖼 overviewImages:", list);
    return list;
  }, [trip, heroImageUrl]);

  /* ===============================
     3) Deck Plans (Admin)
  =============================== */
  const deckPlans = useMemo(() => {
    const list = Array.isArray(assets?.deckPlans) ? assets.deckPlans : [];

    return list
      .map((d) => ({
        deckCode: d?.deckCode || "",
        title: d?.deckName || d?.deckCode || "DECK",
        url: d?.image?.url || null,
        order: d?.order ?? 9999,
      }))
      .filter((x) => x.deckCode && x.url)
      .sort((a, b) => a.order - b.order);
  }, [assets]);

  /* ===============================
     4) Facilities (Admin)
  =============================== */
  const facilities = useMemo(() => {
    const list = Array.isArray(assets?.facilities) ? assets.facilities : [];

    return list
      .map((f) => ({
        facilityType: f?.facilityType || "",
        title: f?.name || f?.facilityType || "FACILITY",
        images: (Array.isArray(f?.images) ? f.images : [])
          .map((img) => ({
            url: img?.url || null,
            title: img?.title || "",
            order: img?.order ?? 9999,
          }))
          .filter((img) => img.url)
          .sort((a, b) => a.order - b.order),
      }))
      .filter((f) => f.facilityType && f.images.length > 0);
  }, [assets]);

  // ===============================
  // 🔧 키 정규화 / 품질 코드 매핑 유틸
  // ===============================
  function normalizeKey(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]+/g, "");
  }

  const CABIN_QUALITIES = [
    "MASTER SUITE",
    "JUNIOR SUITE",
    "SUITE",
    "DELUXE",
    "STANDARD",
  ];

  function getQualityCodeFromName(name) {
    const s = String(name || "").toUpperCase();

    // 1) 먼저 'MASTER SEA VIEW' → MASTER 로 인식
    if (s.includes("MASTER SEA VIEW")) {
      return "MASTER";
    }

    // 2) 'SEA VIEW' 가 들어가면 SUITE 로 인식
    //    (Black Pearl 기준: Sea View Cabin = Main Deck Suite 라고 네가 말해준 사실을 그대로 반영)
    if (s.includes("SEA VIEW")) {
      return "SUITE";
    }

    // 3) 기존 품질 키워드 매칭
    for (const q of CABIN_QUALITIES) {
      if (s.includes(q)) {
        return q.replace(/\s+/g, "_");
      }
    }

    // 4) 그래도 못 찾으면 기존 fallback 유지
    return normalizeKey(name).toUpperCase();
  }


  /* ===============================
    5) Cabins (UTS + Admin merge)
    - Admin: quality(DELUXE / SUITE...) + view(SEA_VIEW / MASTER_SEA_VIEW...)
    - UTS : "Deluxe Twin", "Sea View Cabin", "Master Sea View" 에서 같은 코드를 뽑아 매칭
 =============================== */
  const cabinTypes = useMemo(() => {
    // ----------------------------
    // 1) UTS cabinTypes 정리 (key 기준으로 dedupe)
    // ----------------------------
    const utsCabinTypesRaw = Array.isArray(buildCabinTypes(trip))
      ? buildCabinTypes(trip)
      : [];

    // key: QUALITY__DECK__BED (또는 QUALITY__DECK)
    const utsByKey = new Map();

    utsCabinTypesRaw.forEach((uts) => {
      const key = makeUtsCabinKey(uts); // 이미 추가해 둔 함수
      if (!key) return;

      const existing = utsByKey.get(key);
      if (existing) {
        // 같은 key가 여러 번 나오면 cabins만 합쳐서 하나로
        const mergedCabins = [
          ...(Array.isArray(existing.cabins) ? existing.cabins : []),
          ...(Array.isArray(uts.cabins) ? uts.cabins : []),
        ];
        utsByKey.set(key, { ...existing, cabins: mergedCabins });
      } else {
        utsByKey.set(key, { ...uts, key });
      }
    });

    // ----------------------------
    // 2) Admin cabins 정리 (vessel_*.json → assets.cabins)
    // ----------------------------
    const adminCabins = Array.isArray(assets?.cabins) ? assets.cabins : [];

    // key: QUALITY__DECK__BED
    const adminByKey = new Map();

    adminCabins.forEach((c) => {
      const quality = norm(c?.cabinTypeCode);
      const deck = norm(c?.deckCode);
      const bed = norm(c?.bedType);

      // quality, deck 는 필수 / bed 는 있으면 사용
      if (!quality || !deck) return;

      const images = (Array.isArray(c?.images) ? c.images : [])
        .map((img) => ({
          url: img?.url || null,
          title: img?.title || "",
          order: img?.order ?? 9999,
        }))
        .filter((img) => img.url)
        .sort((a, b) => a.order - b.order);

      if (!images.length) return;

      const primaryKey = [quality, deck, bed].filter(Boolean).join("__");

      adminByKey.set(primaryKey, {
        primaryKey,
        cabinName: c?.cabinName || "",
        title:
          c?.cabinName ||
          [quality, bed, deck].filter(Boolean).join(" "),
        images,
        quality,
        deck,
        bed,
      });
    });

    const utsKeySet = new Set(utsByKey.keys());
    const merged = [];

    // ----------------------------
    // 3) UTS cabinTypes 기준으로 Admin 정보 붙이기
    // ----------------------------
    utsByKey.forEach((uts, key) => {
      // 우선 exact key(QUALITY__DECK__BED)만 본다
      const admin = adminByKey.get(key) || null;

      merged.push({
        ...uts,
        key,
        // 기본 이름 (UTS 쪽 이름)
        displayName: uts?.displayName || uts?.name || "",
        // Admin cabinName이 있으면 이걸 별도로 들고 간다
        cabinName: admin?.cabinName || uts?.name || "",
        adminImages: admin?.images || [],
        adminTitle: admin?.title || "",
        _matchKeyUsed: admin ? key : "",
      });

      // 이미 병합된 Admin entry 는 admin-only 단계에서 제외
      if (admin) {
        adminByKey.delete(key);
      }
    });

    // ----------------------------
    // 4) UTS에는 없지만 Admin 에만 있는 cabin 타입 추가
    //    (예: UTS 요금은 없고 사진만 있는 타입)
    // ----------------------------
    adminByKey.forEach((admin, key) => {
      merged.push({
        key,
        name: admin.cabinName || key,
        displayName: admin.cabinName || key,
        rawType: "",
        description: "",
        cabins: [], // 아래 fixed 단계에서 fallback cabins 채운다
        adminImages: admin.images,
        adminTitle: admin.title,
        cabinName: admin.cabinName || "",
      });
    });

    // ----------------------------
    // 5) cabins 가 비어 있는 타입에 대해
    //    trip.cabins 를 이용해서 fallback cabins 채우기
    //    (기존 fixed 로직 유지)
    // ----------------------------
    const allCabins = Array.isArray(trip?.cabins) ? trip.cabins : [];

    const fixed = merged.map((ct) => {
      // 이미 cabins 가 있으면 그대로
      if (Array.isArray(ct.cabins) && ct.cabins.length) return ct;

      // admin 이미지도 없으면 손댈 필요 없음
      if (!Array.isArray(ct.adminImages) || !ct.adminImages.length) return ct;

      // key (또는 name) 에서 QUALITY 그룹 + DECK 추출
      const key = String(ct.key || ct.name || "");
      const parts = key.split("__");
      if (parts.length < 2) return ct;

      const qualityGroup = (parts[0] || "")
        .toUpperCase()
        .split("_")[0]; // "STANDARD_TWIN" → "STANDARD"

      const deck = (parts[1] || parts[parts.length - 1] || "")
        .toUpperCase(); // LOWER_DECK / MAIN_DECK ...

      // trip.cabins 에서 같은 QUALITY 그룹 + DECK 를 가진 cabins 찾기
      const fallbackCabins = allCabins.filter((c) => {
        const q = String(c.quality || "")
          .toUpperCase()
          .split("_")[0];
        const d = String(c.deckCode || "").toUpperCase();
        return q === qualityGroup && d === deck;
      });

      return fallbackCabins.length
        ? { ...ct, cabins: fallbackCabins }
        : ct;
    });

    console.log("=== CABIN TYPES MERGED (fixed) ===", fixed);
    return fixed;
  }, [trip, assets]);

  // QUALITY 그룹(STANDARD / SUITE...) + DECK 기준으로 형제 타입에서 cabins 빌려오기
  function getSiblingCabinsForPrice(cabType, allTypes) {
    const key = String(cabType.key || cabType.name || "");
    const parts = key.split("__");
    if (parts.length < 2) return [];

    // parts[0] = "STANDARD_TWIN" or "STANDARD_DOUBLE" or "SUITE_TWIN" ...
    // parts[last] = "LOWER_DECK" / "MAIN_DECK" / "UPPER_DECK"
    const qualityRaw = parts[0];                 // 예: "STANDARD_TWIN"
    const deck = parts[parts.length - 1];        // 예: "LOWER_DECK"

    // QUALITY 그룹만 뽑기: "STANDARD_TWIN" -> "STANDARD"
    const qualityGroup = qualityRaw.split("_")[0];  // "STANDARD" / "SUITE" ...

    const sibling = allTypes.find((ct) => {
      if (ct === cabType) return false;

      const k2 = String(ct.key || ct.name || "");
      const p2 = k2.split("__");
      if (p2.length < 2) return false;

      const q2Raw = p2[0];
      const d2 = p2[p2.length - 1];

      const q2Group = q2Raw.split("_")[0];

      return (
        q2Group === qualityGroup &&
        d2 === deck &&
        Array.isArray(ct.cabins) &&
        ct.cabins.length > 0
      );
    });

    return sibling?.cabins || [];
  }



  console.log("CABIN TYPES KEYS", cabinTypes.map(x => x.key || x.name));
  console.log("CABIN TYPES ADMIN?", cabinTypes.map(x => ({
    key: x.key || x.name,
    admin: (x.adminImages || []).length
  })));

  useEffect(() => {
    if (!trip) return;

    const uts = buildCabinTypes(trip);
    const admin = Array.isArray(assets?.cabins) ? assets.cabins : [];

    console.log("=== UTS KEYS ===");
    console.table(uts.map(x => ({
      name: x.name,
      key: makeUtsCabinKey(x),
      sampleDeck: x?.cabins?.[0]?.deckCode,
      sampleBed: x?.cabins?.[0]?.bedType,
    })));

    console.log("=== ADMIN KEYS ===");
    console.table(admin.map(x => ({
      cabinName: x.cabinName,
      deckCode: x.deckCode,
      bedType: x.bedType,
      key: makeAdminCabinKey(x),
    })));
  }, [trip, assets]);


  /* ===============================
     Cabin 매칭용 헬퍼
  =============================== */

  // 공통 정규화
  function norm(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]+/g, "");
  }

  /**
   * parseCabinAttributes(label, fallbackQuality)
   * - label에서 quality / deck / bedType / view / master/junior 같은 태그를 추출
   * - fallbackQuality가 있으면 quality 기본값으로 사용
   */
  function parseCabinAttributes(label, fallbackQuality) {
    const s = String(label || "").toUpperCase();

    // quality
    let quality =
      (s.includes("BUDGET") && "BUDGET") ||
      (s.includes("DELUXE") && "DELUXE") ||
      (s.includes("SUITE") && "SUITE") ||
      (s.includes("STANDARD") && "STANDARD") ||
      null;

    if (!quality && fallbackQuality) quality = norm(fallbackQuality);

    // deck (label에 있는 경우만)
    let deck =
      (s.includes("UPPER") && "UPPER_DECK") ||
      (s.includes("MAIN") && "MAIN_DECK") ||
      ((s.includes("LOWER") || s.includes("LOW")) && "LOWER_DECK") ||
      null;

    // view
    let view =
      (s.includes("SEA VIEW") && "SEA_VIEW") ||
      (s.includes("SEAVIEW") && "SEA_VIEW") ||
      (s.includes("OCEAN VIEW") && "OCEAN_VIEW") ||
      (s.includes("OCEANVIEW") && "OCEAN_VIEW") ||
      null;

    // master/junior tags
    const tags = [];
    if (s.includes("MASTER")) tags.push("MASTER");
    if (s.includes("JUNIOR")) tags.push("JUNIOR");

    // bedType (우선순위: 명시된 것)
    let bedType =
      ((s.includes("TWIN/DOUBLE") || s.includes("TWIN DOUBLE")) && "TWIN_DOUBLE") ||
      (s.includes("TWIN") && "TWIN") ||
      (s.includes("DOUBLE") && "DOUBLE") ||
      (s.includes("TRIPLE") && "TRIPLE") ||
      (s.includes("QUAD") && "QUAD") ||
      (s.includes("QUADRUPLE") && "QUAD") ||
      null;

    return { quality: quality ? norm(quality) : null, deck, bedType, view, tags };
  }

  // ✅ Admin JSON -> key (QUALITY__DECK__BEDTYPE)  ※매칭키는 최소로 고정
  function makeAdminCabinKey(c) {
    const quality = norm(c?.cabinTypeCode);
    const deck = norm(c?.deckCode);
    const bed = norm(c?.bedType);

    // view/tags는 선택(있으면 포함)
    const parsed = parseCabinAttributes(c?.cabinName || "", c?.cabinTypeCode || "");
    const view = norm(parsed.view);
    const tags = (parsed.tags || []).map(norm);

    if (!quality) return null;

    return [quality, deck, bed, view, ...tags].filter(Boolean).join("__");
  }




  // ✅ UTS cabin type(또는 cabin 묶음) -> key (QUALITY__DECK__BEDTYPE)
  function makeUtsCabinKey(utsGroup) {
    // utsGroup.cabins 는 이 타입에 속하는 UTS cabin 배열이라고 가정
    const one = (utsGroup.cabins && utsGroup.cabins[0]) || {};

    const quality = norm(
      utsGroup.quality ||
      one.cabinTypeCode ||
      deriveQualityFromCabin(one)
    );

    const deck = norm(
      utsGroup.sampleDeck ||
      one.deckCode
    );

    // bedType 이 없는 경우도 있어서 TWIN 기본값
    const bed = norm(
      utsGroup.sampleBed ||
      one.bedType ||
      "TWIN"
    );

    if (!quality || !deck) return null;

    return `${quality}__${deck}__${bed}`;
  }

  // cabinTypes 길이가 바뀌면 indices도 맞춰줌
  useEffect(() => {
    if (!Array.isArray(cabinTypes)) return;
    setIndices((prev) => {
      const next = Array(cabinTypes.length).fill(0);
      for (let i = 0; i < Math.min(prev.length, next.length); i++)
        next[i] = prev[i] || 0;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinTypes.length]);

  if (isLoading) return <div className="trip-loading">⏳ 데이터를 불러오는 중...</div>;
  if (!trip) return <div>⚠ 여행 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="trip-detail-container">
      <TripSummaryHeader
        trip={trip}
        scrollTo={scrollTo}
        goBooking={goBooking}
      />

      <section className="trip-detail-actions" style={{ marginTop: "20px" }}>
        <button
          onClick={goBooking}
          style={{
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          예약하기
        </button>

        {assetsLoading && (
          <span style={{ marginLeft: 12, color: "#666" }}>
            (이미지 메타데이터 로딩 중…)
          </span>
        )}
      </section>

      {/* ✅ 히어로/보트사진 (Admin Hero 우선 + UTS 갤러리) */}
      <section ref={refs.overview} className="trip-section trip-overview">
        <h2>히어로 / 보트사진</h2>

        {overviewImages.length > 0 ? (
          <div style={{ maxWidth: "980px" }}>
            {/* 메인 히어로 이미지 */}
            <img
              src={overviewImages[0].src}
              alt={overviewImages[0].label || "Hero image"}
              style={{
                width: "100%",
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />

            {/* 서브 썸네일들 (있으면) */}
            {overviewImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                  overflowX: "auto",
                }}
              >
                {overviewImages.slice(1).map((img, idx) => (
                  <img
                    key={idx}
                    src={img.src}
                    alt={img.label || `Gallery ${idx + 2}`}
                    style={{
                      width: "120px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      flex: "0 0 auto",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "#666" }}>등록된 이미지가 없습니다.</p>
        )}
      </section>

      {/* ✅ 덱 플랜 (Admin) */}
      <section ref={refs.deckplans} className="trip-section trip-deckplans">
        <h2>Deck Plans (덱 플랜)</h2>

        {deckPlans.length > 0 ? (
          <div className="facility-grid">
            {deckPlans.map((d) => (
              <figure key={d.deckCode} className="facility-card">
                <img src={encodeURI(d.url)} alt={d.title} loading="lazy" />
                <figcaption>{d.title}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666" }}>
            등록된 덱 플랜이 없습니다. (Admin에서 Deck Plans 저장 시 표시됩니다.)
          </p>
        )}
      </section>

      {/* ✅ 객실 섹션 (UTS 객실 타입 + Admin 객실 이미지 merge) */}
      <section ref={refs.cabins} className="trip-section trip-cabins">
        <h2>객실 정보</h2>

        {cabinTypes.map((cabType, i) => {
          const adminImgs = Array.isArray(cabType?.adminImages)
            ? cabType.adminImages
            : [];
          const utsImgs = Array.isArray(cabType?.images)
            ? cabType.images
            : [];

          const images = adminImgs.length
            ? adminImgs.map((x) => ({
              src: x.url,
              label: x.title || cabType.name,
            }))
            : utsImgs.map((x) => ({
              src: x.image,
              label: cabType.name,
            }));

          // ✅ 1순위: 자기 자신의 cabins
          // ✅ 2순위: 같은 QUALITY + DECK 를 가진 형제 타입의 cabins 가져오기
          const cabinsForPrice =
            Array.isArray(cabType.cabins) && cabType.cabins.length
              ? cabType.cabins
              : getSiblingCabinsForPrice(cabType, cabinTypes);

          const priceInfo = findCabinTypeLowestPrice(cabinsForPrice);


          const currentIndex = indices[i] || 0;

          const desc =
            cabType?.adminDescription ||
            cabType?.description ||
            (images[0]?.label || "").trim() ||   // ➜ 이미지 제목도 fallback 으로 사용
            "설명 없음";

          // 🔹 제목 우선순위: Admin 제목 > cabinName > displayName > name
          const title =
            (cabType.adminTitle && cabType.adminTitle.trim()) ||
            (cabType.cabinName && cabType.cabinName.trim()) ||
            cabType.displayName ||
            cabType.name ||
            "";
          return (
            <div
              key={cabType.key || i}

              className="cabin-card"
              style={{ marginBottom: "50px" }}
            >
              <h3>{title}</h3>


              {images.length > 0 ? (
                <div
                  style={{
                    position: "relative",
                    maxWidth: "600px",
                    display: "inline-block",
                  }}
                >
                  <img
                    src={encodeURI(images[currentIndex]?.src || "")}
                    alt={`${cabType.name} ${currentIndex + 1}`}
                    style={{ width: "100%", borderRadius: "10px", height: "340px", objectFit: "cover" }}
                    loading="lazy"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          changeImage(i, -1, images.length)
                        }
                        className="arrow-btn left"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() =>
                          changeImage(i, 1, images.length)
                        }
                        className="arrow-btn right"
                      >
                        ›
                      </button>
                      <div className="index-badge">
                        {currentIndex + 1}/{images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p style={{ color: "#666" }}>등록된 이미지 없음</p>
              )}

              <p style={{ marginTop: "10px" }}>{desc}</p>

              {priceInfo ? (
                <p>
                  <strong>요금제: {priceInfo.planName}</strong>{" "}
                  — {formatCurrency(priceInfo.price, currency)}
                </p>
              ) : (
                <p style={{ color: "#666" }}>가격 정보 없음</p>
              )}


              {adminImgs.length > 0 && (
                <p
                  style={{
                    color: "#2a7",
                    marginTop: 6,
                    fontSize: 13,
                  }}
                >
                  (객실 이미지는 Admin Assets 기준으로 표시 중)
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* ✅ 공용시설 (Admin) */}
      <section
        ref={refs.facilities}
        className="trip-section facilities-section"
      >
        <h2>공용 시설</h2>

        {facilities.length > 0 ? (
          facilities.map((facility) => (
            <div
              key={facility.facilityType}
              className="facility-group"
            >
              <h3>{facility.title || facility.facilityType}</h3>

              <div className="facility-grid">
                {facility.images.map((img, idx) => (
                  <figure key={idx} className="facility-card">
                    <img
                      src={img.url}
                      alt={img.title || facility.title}
                      loading="lazy"
                    />
                    {img.title && (
                      <figcaption>{img.title}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: "#666" }}>
            등록된 공용시설 이미지가 없습니다. (Admin에서 Facilities
            저장 시 표시됩니다.)
          </p>
        )}
      </section>

      {/* ✅ 상세가격 (UTS trip 기준) */}
      <section ref={refs.price} className="trip-section trip-price">
        <h2>상세가격 (Price details)</h2>
        <TripPriceDetails trip={trip} />
      </section>
    </div>
  );
}

export default TripDetail;
