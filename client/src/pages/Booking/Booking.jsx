import React, { useState, useEffect } from 'react';  // ✅ useEffect 포함!
import { useParams, useLocation } from 'react-router-dom';
import SelectCabin from './SelectCabin';
import ConfirmBooking from './ConfirmBooking';
import BookingComplete from './BookingComplete';

function Booking() {
  const { tripId } = useParams(); // ✅ URL 파라미터로부터 tripId 추출
  console.log("🔍 현재 tripId:", tripId);  // ← 이거 추가
  const location = useLocation();
  const { trip, ratePlans, cabins } = location.state || {};

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    tripId,
    trip,
    ratePlans,
    cabins
  });


  useEffect(() => {
    console.log('받은 tripId:', tripId);
    console.log('📦 trip:', trip);
    console.log('📦 ratePlans:', ratePlans);
    console.log("📥 받은 cabins:", bookingData.cabins);
  }, [bookingData]);

  const goNext = () => setStep((prev) => prev + 1);
  const goBack = () => setStep((prev) => prev - 1);


  return (
    <div className="booking-container">
      <h1>예약 진행</h1>

      {step === 1 && (
        <SelectCabin
          bookingData={bookingData}
          setBookingData={setBookingData}
          goNext={goNext}
        />
      )}

      {step === 2 && (
        <ConfirmBooking
          bookingData={bookingData}
          setBookingData={setBookingData}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {step === 3 && <BookingComplete bookingData={bookingData} />}
    </div>
  );
}

function TripList() {
  const [selectedTrip, setSelectedTrip] = useState(null);

  return (
    <>
      {trips.map((trip) => (
        <div key={trip.id} className="trip-card">
          <h3>{trip.boat.name}</h3>
          <p>{trip.startDate} ~ {trip.endDate}</p>
          <p>USD {trip.price}</p>

          <button onClick={() => navigate(`/booking/${trip.id}`, { state: { trip } })}>
            예약하기
          </button>
          <button onClick={() => setSelectedTrip(trip)}>상세보기</button>
        </div>
      ))}

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          boatDetail={boatDetails.find(b => b.id === selectedTrip.boat?.id)}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </>
  );
}

export default Booking;
