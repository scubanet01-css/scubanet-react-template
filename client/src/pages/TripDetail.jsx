// ✅ TripDetail.jsx (UTS 적용 안정 버전)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TripImageGallery from "../components/TripImageGallery";
import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";
import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";

function TripDetail() {
  const { id: tripId } = useParams(); // ✅ 문자열 ID 그대로 사용
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [boatDetail, setBoatDetail] = useState(null);
  const [boatBasic, setBoatBasic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [indices, setIndices] = useState([]);

  const refs = {
    overview: useRef(null),
    cabins: useRef(null),
    price: useRef(null),
  };

  const scrollTo = (key) =>
    refs[key]?.current?.scrollIntoView({ behavior: "smooth" });

  const role = localStorage.getItem("role");

  const goBooking = () => {
    if (role === "instructor") {
      navigate(`/instructor/${trip.id}`, { state: { trip } });
    } else {
      navigate(`/booking/${trip.id}`, { state: { trip } });
    }
  };

  // ===============================
  // ✅ UTS 기준 데이터 로딩
  // ===============================
  useEffect(() => {
    async function loadData() {
      try {
        const [utsRes, boatDetailsRes, boatBasicRes] = await Promise.all([
          fetch("/data/uts-trips.json").then((r) => r.json()),
          fetch("/data/boats-details.json").then((r) => r.json()),
          fetch("/data/boats.json").then((r) => r.json()),
        ]);

        const trips = Array.isArray(utsRes) ? utsRes : utsRes.data || [];
        const foundTrip = trips.find(
          (t) => String(t.id) === String(tripId)
        );

        if (!foundTrip) {
          setTrip(null);
          setIsLoading(false);
          return;
        }

        const boatId = foundTrip.boatId || foundTrip.boat?.id;

        const boatDetails = boatDetailsRes.data || boatDetailsRes;
        const boatBasics = boatBasicRes.data || boatBasicRes;

        const foundBoatDetail = boatDetails.find(
          (b) => String(b.id) === String(boatId)
        );

        const foundBoatBasic = boatBasics.find(
          (b) => String(b.id) === String(boatId)
        );

        setTrip(foundTrip);
        setBoatDetail(foundBoatDetail || null);
        setBoatBasic(foundBoatBasic || null);

        // ✅ 객실 이미지 인덱스 초기화 (중복 제거 기준 유지)
        const uniqueNames = [];
        const filtered = (foundBoatBasic?.cabinTypes || []).filter((c) => {
          const key = c.name.trim().toLowerCase();
          if (uniqueNames.includes(key)) return false;
          uniqueNames.push(key);
          return true;
        });
        setIndices(Array(filtered.length).fill(0));
      } catch (e) {
        console.error("🚨 TripDetail UTS 로드 오류:", e);
        setTrip(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [tripId]);

  // ===============================
  // ✅ 객실 가격 (UTS 기준)
  // ===============================
  const findCabinPrice = (cabinName) => {
    if (!trip?.ratePlansRetail?.length) return null;

    for (const plan of trip.ratePlansRetail) {
      for (const type of plan.cabinTypes || []) {
        if (type.name === cabinName && type.occupancy?.[0]?.price) {
          return {
            plan: plan.name,
            price: type.occupancy[0].price,
          };
        }
      }
    }
    return null;
  };

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

  // ✅ 객실 중복 제거 유지
  const uniqueNames = new Set();
  const filteredCabins = (boatBasic?.cabinTypes || []).filter((cab) => {
    const key = cab.name.trim().toLowerCase();
    if (uniqueNames.has(key)) return false;
    uniqueNames.add(key);
    return true;
  });

  return (
    <div className="trip-detail-container">
      <TripSummaryHeader
        trip={trip}
        boatDetail={boatDetail}
        navigate={navigate}
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
      </section>

      {/* ✅ 보트 사진 */}
      <section ref={refs.overview} className="trip-section trip-overview">
        <h2>보트사진</h2>
        <TripImageGallery
          images={(boatDetail?.media || []).map((m) => ({
            url: m.image,
            caption: m.title || boatDetail?.name,
          }))}
          layoutImage={boatDetail?.deckPlans?.[0]?.image}
        />
      </section>

      {/* ✅ 객실 정보 */}
      <section ref={refs.cabins} className="trip-section trip-cabins">
        <h2>객실 정보</h2>

        {filteredCabins.map((cab, i) => {
          const images = cab.media || [];
          const priceInfo = findCabinPrice(cab.name);
          const currentIndex = indices[i] || 0;

          return (
            <div key={i} className="cabin-card" style={{ marginBottom: "50px" }}>
              <h3>{cab.name}</h3>
              <p style={{ color: "#666" }}>
                {cab.deck?.name || ""} · {cab.quantity || 1} Cabins
              </p>

              {images.length > 0 ? (
                <div style={{ position: "relative", maxWidth: "600px" }}>
                  <img
                    src={images[currentIndex].image}
                    alt={cab.name}
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      height: "340px",
                      objectFit: "cover",
                    }}
                  />
                  {images.length > 1 && (
                    <>
                      <button onClick={() => changeImage(i, -1, images.length)} className="arrow-btn left">‹</button>
                      <button onClick={() => changeImage(i, 1, images.length)} className="arrow-btn right">›</button>
                      <div className="index-badge">
                        {currentIndex + 1}/{images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p>등록된 이미지 없음</p>
              )}

              <p style={{ marginTop: "10px" }}>{cab.description || "설명 없음"}</p>

              {priceInfo ? (
                <p>
                  <strong>{priceInfo.plan}</strong> —{" "}
                  {formatCurrency(priceInfo.price, currency)}
                </p>
              ) : (
                <p>가격 정보 없음</p>
              )}
            </div>
          );
        })}
      </section>

      {/* ✅ 상세 가격 */}
      <section ref={refs.price} className="trip-section trip-price">
        <h2>상세가격 (Price details)</h2>
        <TripPriceDetails boatDetail={boatDetail} />
      </section>
    </div>
  );
}

export default TripDetail;
