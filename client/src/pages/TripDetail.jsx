// ✅ TripDetail.jsx (안정 버전)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TripImageGallery from "../components/TripImageGallery";
import TripSummaryHeader from "../components/TripSummaryHeader";
import TripPriceDetails from "../components/TripPriceDetails";
import "./TripDetail.css";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencyForTrip } from "../utils/currencyUtils";


function TripDetail() {
  const { id } = useParams();
  const tripId = parseInt(id, 10);
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [boatDetail, setBoatDetail] = useState(null);
  const [boatBasic, setBoatBasic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [indices, setIndices] = useState([]); // ✅ 각 객실 이미지 인덱스 상태

  const refs = {
    overview: useRef(null),
    cabins: useRef(null),
    price: useRef(null),
  };

  const scrollTo = (key) => refs[key]?.current?.scrollIntoView({ behavior: "smooth" });

  const role = localStorage.getItem("role");

  const goBooking = () => {
    if (role === "instructor") {
      navigate(`/instructor/${trip.id}`, { state: { trip } });
    } else {
      navigate(`/booking/${trip.id}`, { state: { trip } });
    }
  };


  useEffect(() => {
    async function loadData() {
      try {
        const [tripRes, boatDetailsRes, boatBasicRes] = await Promise.all([
          fetch("/data/availability-detailed.json").then((r) => r.json()),
          fetch("/data/boats-details.json").then((r) => r.json()),
          fetch("/data/boats.json").then((r) => r.json()),
        ]);

        const trips = tripRes.data || tripRes;
        const foundTrip = trips.find(
          (t) => String(t.id) === String(tripId) || String(t.tripId) === String(tripId)
        );

        const boatDetails = boatDetailsRes.data || boatDetailsRes;
        const foundBoatDetail = foundTrip
          ? boatDetails.find((b) => String(b.id) === String(foundTrip.boat?.id))
          : null;

        const boatBasics = boatBasicRes.data || boatBasicRes;
        const foundBoatBasic = foundTrip
          ? boatBasics.find((b) => String(b.id) === String(foundTrip.boat?.id))
          : null;

        setTrip(foundTrip || null);
        setBoatDetail(foundBoatDetail || null);
        setBoatBasic(foundBoatBasic || null);

        // ✅ 초기 이미지 인덱스 상태 생성
        const uniqueNames = [];
        const filtered = (foundBoatBasic?.cabinTypes || []).filter((c) => {
          const key = c.name.trim().toLowerCase();
          if (uniqueNames.includes(key)) return false;
          uniqueNames.push(key);
          return true;
        });
        setIndices(Array(filtered.length).fill(0));
      } catch (e) {
        console.error("🚨 데이터 로드 오류:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [tripId]);

  const findCabinPrice = (cabinName) => {
    if (!trip?.ratePlansRetail?.length) return null;
    for (const plan of trip.ratePlansRetail) {
      for (const type of plan.cabinTypes || []) {
        if (type.name === cabinName && type.occupancy?.[0]?.price) {
          return { plan: plan.name, price: type.occupancy[0].price };
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

  // ⭐ Almonda만 SAR 통화 적용 (공통 유틸 사용)
  const currency = getCurrencyForTrip(trip);

  // ✅ 중복 제거
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
          images={
            (boatDetail?.media || [])
              .sort((a, b) => {
                const aBoat = /(boat|exterior|outside)/i.test(a.title || a.image);
                const bBoat = /(boat|exterior|outside)/i.test(b.title || b.image);
                return aBoat === bBoat ? 0 : aBoat ? -1 : 1;
              })
              .map((m) => ({
                url: m.image,
                caption: m.title || boatDetail.name,
              }))
          }
          layoutImage={boatDetail?.deckPlans?.[0]?.image}
        />
      </section>


      {/* ✅ 객실 섹션 */}
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
                <div style={{ position: "relative", maxWidth: "600px", display: "inline-block" }}>
                  <img
                    src={images[currentIndex].image}
                    alt={`${cab.name} ${currentIndex + 1}`}
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      height: "340px",
                      objectFit: "cover",
                    }}
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => changeImage(i, -1, images.length)}
                        className="arrow-btn left"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => changeImage(i, 1, images.length)}
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
                <p>등록된 이미지 없음</p>
              )}

              <p style={{ marginTop: "10px" }}>{cab.description || "설명 없음"}</p>
              {priceInfo ? (
                <p>
                  <strong>{priceInfo.plan}</strong> —
                  {formatCurrency(priceInfo.price, currency)}
                </p>

              ) : (
                <p>가격 정보 없음</p>
              )}
            </div>
          );
        })}
      </section>

      {/* ✅ 상세가격 */}
      <section ref={refs.price} className="trip-section trip-price">
        <h2>상세가격 (Price details)</h2>
        <TripPriceDetails boatDetail={boatDetail} />
      </section>
    </div>
  );
}





// ✅ 꼭 export는 맨 마지막 줄!
export default TripDetail;
