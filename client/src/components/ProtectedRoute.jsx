import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const rawUser = localStorage.getItem("scubanetUser");
  const user = rawUser ? JSON.parse(rawUser) : null;

  // 1️⃣ 로그인 안 된 경우
  if (!user) {
    alert("로그인이 필요합니다.");
    return <Navigate to="/auth/login" replace />;
  }

  // 2️⃣ 권한 체크
  if (allowedRole && user.role !== allowedRole) {
    alert("접근 권한이 없습니다.");
    return <Navigate to="/" replace />;
  }

  // 3️⃣ 통과
  return children;
}

export default ProtectedRoute;