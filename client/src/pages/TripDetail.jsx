// ✅ TripDetail.jsx (UTS 단독 기준 안정 버전)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TripImageGallery from "../components/TripImageGallery";
import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";

import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";

function TripDetail() {
  const { id: tripId } = useParams(); // ✅ UTS id는 "INQ_23260" 같은 문자열
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ 객실(=cabinType)별 이미지 인덱스
  const [indices, setIndices] = useState([]);

  const refs = {
    overview: useRef(null),
    cabins: useRef(null),
    price: useRef(null),
  };

  const scrollTo = (key) => refs[key]?.current?.scrollIntoView({ behavior: "smooth" });

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
  // ✅ UTS Trip 데이터 로딩 (boats.json/boats-details.json 제거)
  // ===============================
  useEffect(() => {
    async function loadData() {
      try {
        const tripRes = await fetch("/data/uts-trips.json").then((r) => r.json());
        const trips = Array.isArray(tripRes) ? tripRes : tripRes?.data || [];

        const foundTrip = trips.find((t) => String(t.id) === String(tripId));
        setTrip(foundTrip || null);

        // ✅ 객실 타입 목록(중복 제거) 기반으로 indices 초기화
        const cabinTypes = buildCabinTypes(foundTrip);
        setIndices(Array(cabinTypes.length).fill(0));
      } catch (e) {
        console.error("🚨 TripDetail load error:", e);
        setTrip(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [tripId]);

  // ===============================
  // ✅ UTS cabins -> "객실 타입" 단위로 묶기 (name/type 기준)
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
          images: [],
          cabins: [],
        });
      }

      const bucket = map.get(key);
      bucket.cabins.push(cab);

      // 이미지 합치기
      const imgs = Array.isArray(cab?.images) ? cab.images : [];
      for (const img of imgs) {
        if (typeof img === "string" && img.trim()) bucket.images.push({ image: img });
        else if (img?.image) bucket.images.push({ image: img.image });
      }

      // 설명 보강
      if (!bucket.description && cab?.description) bucket.description = cab.description;
    }

    // 이미지 중복 제거
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
  // ✅ 객실 타입의 최저가(UTS cabins[].ratePlans 기반)
  // ===============================
  function findCabinTypeLowestPrice(cabinTypeName) {
    const cabins = Array.isArray(trip?.cabins) ? trip.cabins : [];
    const matched = cabins.filter((c) => String(c?.type || c?.name || "").trim() === String(cabinTypeName).trim());

    let best = null; // { planName, price }
    for (const cab of matched) {
      const rps = Array.isArray(cab?.ratePlans) ? cab.ratePlans : [];
      for (const rp of rps) {
        const price = rp?.price;
        if (price == null) continue;
        if (!best || Number(price) < Number(best.price)) {
          best = { planName: rp?.ratePlanName || rp?.name || "Rate", price };
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

  if (isLoading) return <div className="trip-loading">⏳ 데이터를 불러오는 중...</div>;
  if (!trip) return <div>⚠ 여행 정보를 찾을 수 없습니다.</div>;

  const currency = getCurrencyForTrip(trip);
  const cabinTypes = buildCabinTypes(trip);

  // ===============================
  // ✅ Trip 이미지(UTS images.cover/gallery) -> TripImageGallery 포맷으로 변환
  // ===============================
  const cover = trip?.images?.cover || "";
  const gallery = Array.isArray(trip?.images?.gallery) ? trip.images.gallery : [];

  const overviewImages = [
    ...(cover ? [{ url: cover, caption: trip?.boatName || "" }] : []),
    ...gallery
      .map((u) => (typeof u === "string" ? u : u?.url || u?.image))
      .filter(Boolean)
      .map((u) => ({ url: u, caption: trip?.boatName || "" })),
  ];

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
      </section>

      {/* ✅ 보트/트립 사진 (UTS) */}
      <section ref={refs.overview} className="trip-section trip-overview">
        <h2>보트사진</h2>
        <TripImageGallery images={overviewImages} layoutImage={null} />
      </section>

      {/* ✅ 객실 섹션 (UTS cabinTypes) */}
      <section ref={refs.cabins} className="trip-section trip-cabins">
        <h2>객실 정보</h2>

        {cabinTypes.map((cabType, i) => {
          const images = Array.isArray(cabType?.images) ? cabType.images : [];
          const priceInfo = findCabinTypeLowestPrice(cabType.name);
          const currentIndex = indices[i] || 0;

          return (
            <div key={cabType.name || i} className="cabin-card" style={{ marginBottom: "50px" }}>
              <h3>{cabType.name}</h3>

              {images.length > 0 ? (
                <div style={{ position: "relative", maxWidth: "600px", display: "inline-block" }}>
                  <img
                    src={images[currentIndex]?.image}
                    alt={`${cabType.name} ${currentIndex + 1}`}
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      height: "340px",
                      objectFit: "cover",
                    }}
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
                <p>등록된 이미지 없음</p>
              )}

              <p style={{ marginTop: "10px" }}>{cabType.description || "설명 없음"}</p>

              {priceInfo ? (
                <p>
                  <strong>{priceInfo.planName}</strong> — {formatCurrency(priceInfo.price, currency)}
                </p>
              ) : (
                <p>가격 정보 없음</p>
              )}
            </div>
          );
        })}
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
