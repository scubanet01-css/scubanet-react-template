// ✅ TripDetail.jsx (UTS + Admin Boat Assets – 캐빈은 Admin 전용)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";

import "./TripDetail.css";

const BOAT_ASSETS_JSON_BASE = "/data/boats-assets"; // nginx가 서빙하는 메타데이터 JSON

function TripDetail() {
  const { id: tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [boatAssets, setBoatAssets] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // ✅ 객실(=Admin cabin 카드)별 이미지 인덱스
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
  // ✅ 1) UTS Trip 데이터 로딩
  // ===============================
  useEffect(() => {
    async function loadTrip() {
      try {
        const tripRes = await fetch("/data/uts-trips.json").then((r) => r.json());
        const trips = Array.isArray(tripRes) ? tripRes : tripRes?.data || [];

        const foundTrip = trips.find((t) => String(t.id) === String(tripId));
        setTrip(foundTrip || null);

        // 캐빈 인덱스는 나중에 Admin cabin 카드 길이에 맞춰 재설정
        setIndices([]);
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
  // ✅ 공통 메모 값
  // ===============================
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

  /* ===============================
     5) Cabins (Admin 전용 – UTS와 완전히 분리)
     - AdminBoatAssets 의 cabins만 사용
     - 가격/좌석 정보는 표시하지 않음
  =============================== */
  const adminCabinCards = useMemo(() => {
    const raw = Array.isArray(assets?.cabins) ? assets.cabins : [];

    return raw
      .map((cabin, idx) => {
        const imgs = Array.isArray(cabin.images)
          ? cabin.images
            .map((img) => ({
              src: img?.url || "",
              label: img?.title || "",
              order: img?.order ?? 9999,
            }))
            .filter((img) => img.src)
            .sort((a, b) => a.order - b.order)
          : [];

        if (!imgs.length) return null;

        // 제목: cabinName이 있으면 그걸 사용, 없으면 타입/덱/베드 합쳐서 만듦
        const title =
          (cabin.cabinName && cabin.cabinName.trim()) ||
          [
            cabin.cabinTypeCode, // DELUXE, JUNIOR_SUITE 등
            cabin.deckCode, // LOWER_DECK, MAIN_DECK ...
            cabin.bedType, // TWIN, DOUBLE ...
          ]
            .filter(Boolean)
            .join(" ");

        // 부제(선택): 덱/베드 정보 간단히 표시
        const subtitleParts = [];
        if (cabin.deckCode)
          subtitleParts.push(
            String(cabin.deckCode).replace(/_/g, " ").toLowerCase()
          );
        if (cabin.bedType)
          subtitleParts.push(
            String(cabin.bedType).replace(/_/g, " ").toLowerCase()
          );
        const subtitle = subtitleParts.join(" · ");

        const description = cabin.description || "";

        return {
          id: `admin-cabin-${idx}`,
          title,
          subtitle,
          images: imgs,
          description,
        };
      })
      .filter(Boolean);
  }, [assets]);

  // ✅ adminCabinCards 길이에 맞춰 이미지 인덱스 배열을 맞춰준다
  useEffect(() => {
    if (!Array.isArray(adminCabinCards)) return;
    setIndices((prev) => {
      const next = Array(adminCabinCards.length).fill(0);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) {
        next[i] = prev[i] || 0;
      }
      return next;
    });
  }, [adminCabinCards.length]);

  const changeImage = (idx, dir, total) => {
    setIndices((prev) => {
      const updated = [...prev];
      updated[idx] = (updated[idx] + dir + total) % total;
      return updated;
    });
  };

  if (isLoading) {
    return <div className="trip-loading">⏳ 데이터를 불러오는 중...</div>;
  }
  if (!trip) {
    return <div>⚠ 여행 정보를 찾을 수 없습니다.</div>;
  }

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

      {/* ✅ 객실 섹션 (Admin 전용 – 가격/좌석 로직 분리) */}
      <section ref={refs.cabins} className="trip-section trip-cabins">
        <h2>객실 정보</h2>

        {adminCabinCards.length === 0 && (
          <p style={{ color: "#666" }}>
            등록된 객실 정보가 없습니다. (Admin에서 객실 이미지를 추가하면 이곳에
            표시됩니다.)
          </p>
        )}

        {adminCabinCards.map((cab, i) => {
          const images = cab.images || [];
          const currentIndex = indices[i] || 0;
          const currentImage = images[currentIndex] || null;

          return (
            <div
              key={cab.id}
              className="cabin-card"
              style={{ marginBottom: "50px" }}
            >
              <h3>{cab.title}</h3>
              {cab.subtitle && (
                <div
                  style={{
                    color: "#666",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  {cab.subtitle}
                </div>
              )}

              {images.length > 0 ? (
                <div
                  style={{
                    position: "relative",
                    maxWidth: "600px",
                    display: "inline-block",
                  }}
                >
                  <img
                    src={encodeURI(currentImage?.src || "")}
                    alt={`${cab.title} ${currentIndex + 1}`}
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

              {/* 이미지 개별 타이틀 (있을 때만) */}
              {currentImage?.label && (
                <p style={{ marginTop: "10px", fontWeight: 500 }}>
                  {currentImage.label}
                </p>
              )}

              {/* 객실 설명 */}
              <p style={{ marginTop: "4px" }}>
                {cab.description || "객실 구조와 위치는 사진을 참고해 주세요."}
              </p>

              {/* 가격 안내는 고정 문구로 */}
              <p style={{ color: "#666", marginTop: 4 }}>
                상세 요금은 예약 단계에서 확인해 주세요.
              </p>

              <p
                style={{
                  color: "#2a7",
                  marginTop: 6,
                  fontSize: 13,
                }}
              >
                (객실 이미지는 Admin Assets 기준으로 표시됩니다)
              </p>
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
            <div key={facility.facilityType} className="facility-group">
              <h3>{facility.title || facility.facilityType}</h3>

              <div className="facility-grid">
                {facility.images.map((img, idx) => (
                  <figure key={idx} className="facility-card">
                    <img
                      src={img.url}
                      alt={img.title || facility.title}
                      loading="lazy"
                    />
                    {img.title && <figcaption>{img.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: "#666" }}>
            등록된 공용시설 이미지가 없습니다. (Admin에서 Facilities 저장 시
            표시됩니다.)
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