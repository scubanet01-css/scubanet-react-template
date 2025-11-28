import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const users = JSON.parse(localStorage.getItem("users")) || [];

      const foundUser = users.find(
        (u) => u.email === email && u.password === password
      );

      if (foundUser) {
        // ✅ 로그인 성공 → localStorage 저장
        localStorage.setItem("user", JSON.stringify(foundUser));
        localStorage.setItem("role", foundUser.role);
        alert(`${foundUser.name}님 환영합니다!`);

        // ✅ role에 따라 페이지 분기
        if (foundUser.role === "instructor") {
          navigate("/instructor");
        } else {
          navigate("/");
        }
      } else {
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      console.error("❌ 로그인 오류:", err);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h2>로그인</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 10 }}>
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 입력"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#00b386",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
          }}
        >
          로그인
        </button>
      </form>
    </div>
  );
}

export default Login;
