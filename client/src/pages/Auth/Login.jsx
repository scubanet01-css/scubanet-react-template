import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const res = await axios.post("/api/auth/login", {
        email: form.email,
        password: form.password,
      });

      const user = res.data?.user;

      if (!user) {
        alert("로그인 응답이 올바르지 않습니다.");
        return;
      }

      localStorage.setItem("scubanetUser", JSON.stringify(user));

      alert(res.data.message || "로그인되었습니다.");

      if (user.role === "admin") {
        navigate("/admin");
        return;
      }

      if (user.role === "instructor") {
        navigate("/instructor");
        return;
      }

      // 일반회원
      navigate("/triplist"); // 🔥 변경
    } catch (err) {
      console.error("로그인 실패:", err);
      console.error("응답 데이터:", err.response?.data);

      const message =
        err.response?.data?.message || "로그인 중 오류가 발생했습니다.";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>로그인</h1>
          <p>스쿠버넷 트래블 계정으로 로그인하세요.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label>비밀번호</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="login-footer">
            계정이 없으신가요? <Link to="/auth/register">회원가입</Link>
          </div>
        </form>
      </div>
    </div>
  );
}