import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import SelectCabin from "./SelectCabin";
import ConfirmBooking from "./ConfirmBooking";
import BookingComplete from "./BookingComplete";

function Booking() {
  const { tripId } = useParams();
  const location = useLocation();

  // ✅ state로 넘어온 trip 기준
  const { trip, ratePlans, cabins } = location.state || {};

  // ✅ 핵심: state.cabins가 없으면 trip.cabins를 기본값으로 사용
  const initialCabins = cabins || trip?.cabins || [];
  const initialRatePlans = ratePlans || trip?.ratePlans || [];

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    tripId,
    trip,
    ratePlans: initialRatePlans,
    cabins: initialCabins,
  });

  useEffect(() => {
    console.log("📦 [Booking] tripId =", tripId);
    console.log("📦 [Booking] trip =", trip);
    console.log("📦 [Booking] trip.spaces =", trip?.spaces);
    console.log("📦 [Booking] trip.cabins =", trip?.cabins);
    console.log("📦 [Booking] bookingData.cabins =", bookingData.cabins);
    console.log("📦 [Booking] first cabin =", bookingData.cabins?.[0]);
  }, [tripId, trip, bookingData]);

  if (!trip) {
    return <p>잘못된 접근입니다. trip 정보가 없습니다.</p>;
  }

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

export default Booking;