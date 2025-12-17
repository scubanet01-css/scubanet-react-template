import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import TripList from './pages/TripList';
import TripDetail from './pages/TripDetail';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Booking from './pages/Booking/Booking';
import ConfirmBooking from './pages/Booking/ConfirmBooking';
import MyBooking from './pages/Booking/MyBooking';
import PaymentPage from './pages/Booking/PaymentPage';
import ProtectedRoute from './components/ProtectedRoute';
import LogoutButton from "./components/LogoutButton";
import SpecialTripsPage from "./pages/SpecialTripsPage";


import InstructorList from './pages/Instructor/InstructorList';
import InstructorBooking from './pages/Instructor/InstructorBooking';
import InstructorConfirm from './pages/Instructor/InstructorConfirm';
import InstructorMyBooking from './pages/Instructor/InstructorMyBooking';

import AdminBoatAssets from "./pages/Admin/AdminBoatAssets";

import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <header>
          <h1>ScubaNet Travel</h1>
          <nav style={{ display: "flex", gap: "12px" }}>
            <Link to="/">홈</Link>
            <LogoutButton />
          </nav>
        </header>

        <Routes>

          {/* 일반 사용자 */}
          <Route path="/" element={<Home />} />
          <Route path="/triplist" element={<TripList />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          <Route path="/specialtrips" element={<SpecialTripsPage />} />


          {/* 예약 절차 */}
          <Route path="/booking/:tripId" element={<Booking />} />
          <Route path="/booking/confirm" element={<ConfirmBooking />} />
          <Route path="/booking/summary" element={<MyBooking />} />
          <Route path="/booking/payment" element={<PaymentPage />} />

          {/* 인증 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Instructor List (강사 홈) */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorList />
              </ProtectedRoute>
            }
          />

/* 강사 예약(요금/객실 선택) */
          <Route
            path="/instructor/:id"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorBooking />
              </ProtectedRoute>
            }
          />

/* 강사 예약 확정 */
          <Route
            path="/instructor/:id/confirm"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorConfirm />
              </ProtectedRoute>
            }
          />

/* 강사 예약 내역 */
          <Route
            path="/instructor/my-booking"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorMyBooking />
              </ProtectedRoute>
            }
          />

/* 강사 결제 */
          <Route
            path="/instructor/payment"
            element={
              <ProtectedRoute allowedRole="instructor">
                <PaymentPage />
              </ProtectedRoute>
            }
          />


        </Routes>
        {/* 관리자 - 보트 자산 관리 */}
        <Route
          path="/admin/boats/assets"
          element={<AdminBoatAssets />}
        />

      </Router>
    </AuthProvider>
  );
}

export default App;
