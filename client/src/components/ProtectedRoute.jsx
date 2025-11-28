import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRole }) {
  const user = JSON.parse(localStorage.getItem('user'));

  // 1️⃣ 로그인 안 된 경우 → 로그인 페이지로 이동
  if (!user) {
    alert('로그인이 필요합니다.');
    return <Navigate to="/login" replace />;
  }

  // 2️⃣ 특정 역할(예: instructor)만 접근 가능
  if (allowedRole && user.role !== allowedRole) {
    alert('이 페이지는 강사 전용입니다.');
    return <Navigate to="/" replace />;
  }

  // 3️⃣ 통과
  return children;
}

export default ProtectedRoute;
