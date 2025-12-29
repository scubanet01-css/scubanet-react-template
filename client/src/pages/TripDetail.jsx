// ✅ TripDetail.jsx (UTS + Admin Boat Assets 통합 버전: FIXED)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TripImageGallery from "../components/TripImageGallery";
import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";

import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";

const BOAT_ASSETS_JSON_BASE = "/data/boats-assets"; // 메타데이터 JSON (nginx로 서빙)

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
    adminCabinsExtra: useRef(null),
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
        const tripRes = await fetch("/data/uts-trips.json").then((r) => r.json());
        const trips = Array.isArray(tripRes) ? tripRes : tripRes?.data || [];

        const foundTrip = trips.find((t) => String(t.id) === String(tripId));
        setTrip(foundTrip || null);

        // 객실 타입 목록 기반 indices 초기화 (trip 기반 우선)
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
      if (!vesselId) {
        setBoatAssets(null);
        return;
      }

      setAssetsLoading(true);
      try {
        const url = `${BOAT_ASSETS_JSON_BASE}/${vesselId}.json`;
        console.log("🛳 Trip vesselId:", vesselId);
        console.log("📦 boatAssets URL:", url);

        const res = await fetch(url);

        if (!res.ok) {
          console.warn("⚠ boatAssets JSON not found:", url, res.status);
          setBoatAssets(null);
          return;
        }

        const json = await res.json();
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
      const key = String(cab?.type || cab?.name || "").trim();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          description: cab?.description || "",
          images: [], // UTS fallback images
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

    // 중복 제거
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
  function findCabinTypeLowestPrice(cabinTypeName) {
    const cabins = Array.isArray(trip?.cabins) ? trip.cabins : [];
    const matched = cabins.filter(
      (c) =>
        String(c?.type || c?.name || "").trim() ===
        String(cabinTypeName).trim()
    );

    let best = null; // { planName, price }
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

  function normalizeKey(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]+/g, "");
  }

  // ===============================
  // ✅ 섹션별 데이터 (memo) – boats-assets 구조 반영
  // ===============================
  const vesselId = useMemo(() => getVesselId(trip), [trip]);
  const currency = useMemo(() => getCurrencyForTrip(trip), [trip]);

  // ⭐️ 여기가 핵심: assets 루트 고정
  const assets = useMemo(() => boatAssets?.assets || {}, [boatAssets]);

  /* ===============================
     1) Hero (Admin 우선, 없으면 UTS cover)
  =============================== */
  const heroImageUrl = useMemo(() => {
    if (assets?.hero?.url) return assets.hero.url;
    return trip?.images?.cover || null;
  }, [assets, trip]);

  /* ===============================
     2) Overview Gallery (Hero + UTS gallery)
  =============================== */
  const overviewImages = useMemo(() => {
    const list = [];

    if (heroImageUrl) {
      list.push({ url: heroImageUrl, caption: trip?.boatName || "" });
    }

    const gallery = Array.isArray(trip?.images?.gallery) ? trip.images.gallery : [];
    for (const g of gallery) {
      const url = typeof g === "string" ? g : g?.url || g?.image;
      if (!url) continue;
      if (list.some((x) => x.url === url)) continue;
      list.push({ url, caption: trip?.boatName || "" });
    }

    return list;
  }, [trip, heroImageUrl]);

  /* ===============================
     3) Deck Plans (Admin)
     - 실제 스키마: assets.deckPlans[].image.url
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
     - 실제 스키마: assets.facilities[].images[].url
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

  /* ===============================
     5) Cabins (UTS + Admin merge)
     - 주의: UTS 객실명(Deluxe Twin)과 Admin cabinTypeCode(STANDARD)가 다를 수 있음
     - 따라서:
       A) 일치할 때만 merge (기존 방식)
       B) 불일치로 인해 누락되는 Admin cabin 이미지는 아래 "Admin Cabin Gallery(추가)" 섹션으로 별도 표시
  =============================== */
  const cabinTypes = useMemo(() => {
    const utsCabinTypes = buildCabinTypes(trip);
    const adminCabins = Array.isArray(assets?.cabins) ? assets.cabins : [];

    const adminMap = new Map();
    for (const c of adminCabins) {
      const codeRaw = c?.cabinTypeCode || "";
      const code = normalizeKey(codeRaw);
      if (!code) continue;

      adminMap.set(code, {
        codeRaw,
        title: c?.cabinName || c?.cabinTypeCode || "",
        images: (Array.isArray(c?.images) ? c.images : [])
          .map((img) => ({
            url: img?.url || null,
            title: img?.title || "",
            order: img?.order ?? 9999,
          }))
          .filter((img) => img.url)
          .sort((a, b) => a.order - b.order),
      });
    }

    return utsCabinTypes.map((uts) => {
      const key = normalizeKey(uts.name);
      const admin = adminMap.get(key);

      return {
        ...uts,
        adminImages: admin?.images || [],
        adminTitle: admin?.title || "",
      };
    });
  }, [trip, assets]);

  // ✅ (B) Admin cabinTypeCode가 UTS랑 안 맞아도 보여주기 위한 "추가 섹션" 데이터
  const adminCabinsExtra = useMemo(() => {
    const list = Array.isArray(assets?.cabins) ? assets.cabins : [];
    return list
      .map((c) => ({
        cabinTypeCode: c?.cabinTypeCode || "",
        deckCode: c?.deckCode || "",
        images: (Array.isArray(c?.images) ? c.images : [])
          .map((img) => ({
            url: img?.url || null,
            title: img?.title || "",
            order: img?.order ?? 9999,
          }))
          .filter((img) => img.url)
          .sort((a, b) => a.order - b.order),
      }))
      .filter((x) => x.cabinTypeCode && x.images.length > 0);
  }, [assets]);

  // cabinTypes 길이가 바뀌면 indices도 맞춰줌
  useEffect(() => {
    if (!Array.isArray(cabinTypes)) return;
    setIndices((prev) => {
      const next = Array(cabinTypes.length).fill(0);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i] || 0;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinTypes.length]);

  if (isLoading) return <div className="trip-loading">⏳ 데이터를 불러오는 중...</div>;
  if (!trip) return <div>⚠ 여행 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="trip-detail-container">
      <TripSummaryHeader trip={trip} scrollTo={scrollTo} goBooking={goBooking} />

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

      {/* ✅ 히어로/보트사진 */}
      <section ref={refs.overview} className="trip-section trip-overview">
        <h2>히어로 / 보트사진</h2>
        <TripImageGallery images={overviewImages} layoutImage={null} />
      </section>

      {/* ✅ 덱 플랜 */}
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

      {/* ✅ 객실 섹션 (UTS + Admin merge: 이름이 일치할 때만 merge) */}
      <section ref={refs.cabins} className="trip-section trip-cabins">
        <h2>객실 정보</h2>

        {cabinTypes.map((cabType, i) => {
          const adminImgs = Array.isArray(cabType?.adminImages) ? cabType.adminImages : [];
          const utsImgs = Array.isArray(cabType?.images) ? cabType.images : [];

          const images = adminImgs.length
            ? adminImgs.map((x) => ({ src: x.url, label: x.title || cabType.name }))
            : utsImgs.map((x) => ({ src: x.image, label: cabType.name }));

          const priceInfo = findCabinTypeLowestPrice(cabType.name);
          const currentIndex = indices[i] || 0;

          const desc = cabType?.description || "설명 없음";

          return (
            <div key={cabType.name || i} className="cabin-card" style={{ marginBottom: "50px" }}>
              <h3>{cabType.name}</h3>

              {images.length > 0 ? (
                <div style={{ position: "relative", maxWidth: "600px", display: "inline-block" }}>
                  <img
                    src={images[currentIndex]?.src}
                    alt={`${cabType.name} ${currentIndex + 1}`}
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      height: "340px",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                  />

                  {images.length > 1 && (
                    <>
                      <button onClick={() => changeImage(i, -1, images.length)} className="arrow-btn left">
                        ‹
                      </button>
                      <button onClick={() => changeImage(i, 1, images.length)} className="arrow-btn right">
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
                  <strong>{priceInfo.planName}</strong> — {formatCurrency(priceInfo.price, currency)}
                </p>
              ) : (
                <p style={{ color: "#666" }}>가격 정보 없음</p>
              )}

              {adminImgs.length > 0 && (
                <p style={{ color: "#2a7", marginTop: 6, fontSize: 13 }}>
                  (객실 이미지는 Admin Assets 기준으로 표시 중: 이름 매칭 성공)
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* ✅ 공용시설 */}
      <section ref={refs.facilities} className="trip-section facilities-section">
        <h2>공용 시설</h2>

        {facilities.length > 0 ? (
          facilities.map((facility) => (
            <div key={facility.facilityType} className="facility-group">
              <h3>{facility.title || facility.facilityType}</h3>

              <div className="facility-grid">
                {facility.images.map((img, idx) => (
                  <figure key={idx} className="facility-card">
                    <img src={img.url} alt={img.title || facility.title} loading="lazy" />
                    {img.title && <figcaption>{img.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: "#666" }}>
            등록된 공용시설 이미지가 없습니다. (Admin에서 Facilities 저장 시 표시됩니다.)
          </p>
        )}
      </section>

      {/* ✅ (추가) Admin Cabins 갤러리: UTS 이름과 cabinTypeCode가 달라도 Admin 업로드 이미지가 사라지지 않도록 */}
      {adminCabinsExtra.length > 0 && (
        <section ref={refs.adminCabinsExtra} className="trip-section trip-cabins">
          <h2>객실 이미지 (Admin 업로드 기준)</h2>
          <p style={{ color: "#666", marginTop: -8 }}>
            (UTS 객실명과 Admin cabinTypeCode가 달라서 매칭이 실패하는 경우, 여기에서라도 항상 보여줍니다.)
          </p>

          {adminCabinsExtra.map((c) => (
            <div key={`${c.cabinTypeCode}_${c.deckCode}`} className="facility-group">
              <h3>
                {c.cabinTypeCode} {c.deckCode ? `(${c.deckCode})` : ""}
              </h3>

              <div className="facility-grid">
                {c.images.map((img, idx) => (
                  <figure key={idx} className="facility-card">
                    <img src={img.url} alt={img.title || c.cabinTypeCode} loading="lazy" />
                    {img.title && <figcaption>{img.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ✅ 상세가격 */}
      <section ref={refs.price} className="trip-section trip-price">
        <h2>상세가격 (Price details)</h2>
        <TripPriceDetails trip={trip} />
      </section>
    </div>
  );
}

export default TripDetail;
