// ✅ TripDetail.jsx (UTS + Admin Boat Assets 최종 정리 버전)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";

import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";

const BOAT_ASSETS_JSON_BASE = "/data/boats-assets"; // nginx가 서빙하는 메타데이터 JSON

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
  // ✅ 객실 타입 최저가 (UTS cabins[].ratePlans 기반)
  // ===============================
  function findCabinTypeLowestPrice(cabinTypeKey) {
    const cabins = Array.isArray(trip?.cabins) ? trip.cabins : [];
    if (!cabinTypeKey) return null;

    // key가 "CANONICAL__DECK" 형태면 분해
    const [canon, deck] = String(cabinTypeKey).split("__");

    const matched = cabins.filter((c) => {
      const cCanon = String(c?.canonicalType || "").trim();
      const cDeck = String(c?.deckCode || "").trim();
      if (deck) return cCanon === String(canon).trim() && cDeck === String(deck).trim();
      return cCanon === String(cabinTypeKey).trim();
    });

    let best = null;

    for (const cab of matched) {
      const rps = Array.isArray(cab?.ratePlans) ? cab.ratePlans : [];
      for (const rp of rps) {
        const price = rp?.price;
        if (price == null) continue;

        if (!best || Number(price) < Number(best.price)) {
          best = {
            planName: rp?.ratePlanName || rp?.name || "Rate",
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
    const utsCabinTypes = buildCabinTypes(trip);
    const adminCabins = Array.isArray(assets?.cabins)
      ? assets.cabins
      : [];

    const adminMap = new Map();
    const adminPrimaryKeys = new Set();

    for (const c of adminCabins) {
      const quality = norm(c?.cabinTypeCode);
      const deck = norm(c?.deckCode);
      const bed = norm(c?.bedType);

      if (!quality || !deck) continue; // deck은 필수로 두자(지금 데이터가 deck 중심이니까)

      const images = (Array.isArray(c?.images) ? c.images : [])
        .map((img) => ({
          url: img?.url || null,
          title: img?.title || "",
          order: img?.order ?? 9999,
        }))
        .filter((img) => img.url)
        .sort((a, b) => a.order - b.order);

      if (!images.length) continue;

      // ✅ “원본 1개 entry”의 대표키(Primary Key)
      const primaryKey = [quality, deck, bed].filter(Boolean).join("__");
      adminPrimaryKeys.add(primaryKey);

      const payload = {
        title: c?.cabinName || [quality, bed, deck].filter(Boolean).join(" "),
        images,
        primaryKey,
      };

      // ✅ exact key는 무조건 등록(덮어쓰기 허용 X)
      if (!adminMap.has(primaryKey)) adminMap.set(primaryKey, payload);

      // ✅ fallback 키는 “없을 때만” 등록 (덮어쓰기 금지)
      const k2 = [quality, deck].join("__");
      const k1 = [quality].join("__");

      if (!adminMap.has(k2)) adminMap.set(k2, payload);
      if (!adminMap.has(k1)) adminMap.set(k1, payload);
    }


    // 2) UTS cabin type별로 key를 만들어 adminMap과 매칭
    const utsKeySet = new Set(
      utsCabinTypes.map((uts) => makeUtsCabinKey(uts)).filter(Boolean)
    );

    const merged = utsCabinTypes.map((uts) => {
      const key3 = makeUtsCabinKey(uts); // QUALITY__DECK__BED or QUALITY__DECK
      const parts = String(key3 || "").split("__");
      const quality = parts[0] || "";
      const deck = parts[1] || "";
      const bed = parts[2] || "";

      const exact = [quality, deck, bed].filter(Boolean).join("__");
      const k2 = [quality, deck].filter(Boolean).join("__");
      const k1 = [quality].filter(Boolean).join("__");

      // ✅ exact → quality+deck → quality 순서
      const admin = (exact && adminMap.get(exact)) || (k2 && adminMap.get(k2)) || (k1 && adminMap.get(k1)) || null;

      return {
        ...uts,
        // ✅ 제목도 Admin이 있으면 Admin title 우선
        displayName: uts?.displayName || uts?.name || "",
        adminImages: admin?.images || [],
        adminTitle: admin?.title || "",
        _matchKeyUsed: admin ? (exact && adminMap.get(exact) ? exact : (k2 && adminMap.get(k2) ? k2 : k1)) : "",
      };
    });

    for (const primaryKey of adminPrimaryKeys) {
      // UTS에 같은 exact가 있으면 추가 안 함
      if (utsKeySet.has(primaryKey)) continue;

      const parts = String(primaryKey).split("__");
      const quality = parts[0] || "STANDARD";
      const deck = parts[1] || "";
      const bed = parts[2] || "";

      const admin = adminMap.get(primaryKey);
      if (!admin?.images?.length) continue;

      merged.push({
        key: primaryKey,                            // ✅ key 넣기
        name: primaryKey,                           // ✅ name도 넣기
        displayName: [quality, bed, deck].filter(Boolean).join("_"), // ✅ 타이틀 보이게
        rawType: "",
        description: "",
        images: [],
        cabins: [],
        adminImages: admin.images,
        adminTitle: admin.title || "",
      });
    }


    return merged;

  }, [trip, assets]);

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
  function makeUtsCabinKey(uts) {
    const firstCab =
      Array.isArray(uts?.cabins) && uts.cabins.length > 0 ? uts.cabins[0] : null;

    const quality = norm(firstCab?.quality) || "";
    const deck = norm(firstCab?.deckCode) || "";
    const bed = norm(firstCab?.bedType) || "";

    // bed가 비어 있을 수 있음(SUITE)
    return [quality, deck, bed].filter(Boolean).join("__");
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
                <img src={d.url} alt={d.title} loading="lazy" />
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

          const priceInfo = findCabinTypeLowestPrice(cabType.key || cabType.name);


          const currentIndex = indices[i] || 0;

          const desc =
            cabType?.adminDescription ||
            cabType?.description ||
            "설명 없음";

          return (
            <div
              key={cabType.key || i}

              className="cabin-card"
              style={{ marginBottom: "50px" }}
            >
              <h3>{cabType.adminTitle || cabType.displayName || cabType.name}</h3>


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
