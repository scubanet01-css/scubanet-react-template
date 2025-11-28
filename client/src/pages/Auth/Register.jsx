import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AuthForm.css";
import axios from "axios";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [diveLevel, setDiveLevel] = useState("diver");
  const [certNumber, setCertNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ 새 회원 객체 생성
    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role: diveLevel === "instructor" ? "instructor" : "user",
      certNumber: diveLevel === "instructor" ? certNumber : "",
      approved: diveLevel === "diver" ? true : false, // 다이버는 즉시 승인
    };

    console.log("회원가입 정보:", newUser);

    try {
      // ✅ 서버에 저장 (테스트용으로는 localStorage 사용 가능)
      // 서버가 없다면, 임시로 localStorage에 저장해 로그인에서 불러올 수 있게 함.
      const existingUsers = JSON.parse(localStorage.getItem("users")) || [];
      localStorage.setItem("users", JSON.stringify([...existingUsers, newUser]));

    if (diveLevel === "diver") {
      alert("회원가입이 완료되었습니다!");
    } else {
      alert(
        "강사로 회원가입이 완료되었습니다.\n강사 혜택은 관리자 승인 후 이용 가능합니다."
      );
    }
    navigate("/login");
    } catch (err) {
      console.error("❌ 회원가입 오류:", err);
      alert("회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="auth-container">
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <label>이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label>다이브 레벨</label>
        <select
          value={diveLevel}
          onChange={(e) => setDiveLevel(e.target.value)}
          required
        >
          <option value="diver">일반 다이버</option>
          <option value="instructor">강사 / 트레이너 / 코스디렉터</option>
        </select>

        {diveLevel === "instructor" && (
          <>
            <label>강사 자격증 번호</label>
            <input
              type="text"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              placeholder="예: PADI-123456"
              required
            />

            <label>자격증 이미지 업로드</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setLicenseFile(e.target.files[0])}
              required
            />
          </>
        )}

        <button type="submit">회원가입</button>
      </form>

      <p>
        이미 회원이신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}

export default Register;
