import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Header from "./components/Header";
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
import SpecialTripsPage from "./pages/SpecialTripsPage";

import InstructorList from './pages/Instructor/InstructorList';
import InstructorBooking from './pages/Instructor/InstructorBooking';
import InstructorConfirm from './pages/Instructor/InstructorConfirm';
import InstructorMyBooking from './pages/Instructor/InstructorMyBooking';

import AdminBoatAssets from "./pages/Admin/AdminBoatAssets";
import AdminSpecialTrips from './pages/Admin/AdminSpecialTrips';
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminBookings from "./pages/Admin/AdminBookings";
import AdminUsers from "./pages/Admin/AdminUsers";
import AdminPromotions from "./pages/Admin/AdminPromotions";

import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          {/* 일반 사용자 */}
          <Route path="/" element={<Home />} />
          <Route path="/triplist" element={<TripList />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          <Route path="/specialtrips" element={<SpecialTripsPage />} />

          {/* 예약 절차 */}
          <Route
            path="/booking/:tripId"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/confirm"
            element={
              <ProtectedRoute>
                <ConfirmBooking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/summary"
            element={
              <ProtectedRoute>
                <MyBooking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/summary/:bookingId"
            element={
              <ProtectedRoute>
                <MyBooking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* 인증 */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />

          {/* 강사 홈 */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorList />
              </ProtectedRoute>
            }
          />

          {/* 강사 예약(요금/객실 선택) */}
          <Route
            path="/instructor/:id"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorBooking />
              </ProtectedRoute>
            }
          />

          {/* 강사 예약 확정 */}
          <Route
            path="/instructor/:id/confirm"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorConfirm />
              </ProtectedRoute>
            }
          />

          {/* 강사 예약 내역 */}
          <Route
            path="/instructor/my-booking"
            element={
              <ProtectedRoute allowedRole="instructor">
                <InstructorMyBooking />
              </ProtectedRoute>
            }
          />

          {/* 강사 결제 */}
          <Route
            path="/instructor/payment"
            element={
              <ProtectedRoute allowedRole="instructor">
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* 관리자 대시보드 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* 관리자 예약관리 */}
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminBookings />
              </ProtectedRoute>
            }
          />

          {/* 관리자 프로모션 관리 */}
          <Route
            path="/admin/promotions"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminPromotions />
              </ProtectedRoute>
            }
          />

          {/* 관리자 - 보트 자산 관리 */}
          <Route
            path="/admin/boats/assets"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminBoatAssets />
              </ProtectedRoute>
            }
          />

          {/* 관리자 - 스페셜 트립 관리 */}
          <Route
            path="/admin/special-trips"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminSpecialTrips />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;