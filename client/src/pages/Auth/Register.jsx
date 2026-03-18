import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    role: "general", // general | instructor
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    nationality: "Korea",

    organization: "",
    certificationLevel: "",
    experienceYears: "",
    intro: "",

    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  const isInstructor = form.role === "instructor";

  const isFormValid = useMemo(() => {
    const basicValid =
      form.name.trim() &&
      form.email.trim() &&
      form.password.trim() &&
      form.confirmPassword.trim() &&
      form.phone.trim() &&
      form.nationality.trim() &&
      form.agreeTerms &&
      form.agreePrivacy;

    const passwordValid =
      form.password.length >= 8 && form.password === form.confirmPassword;

    const instructorValid = isInstructor
      ? form.organization.trim() &&
      form.certificationLevel.trim() &&
      form.experienceYears.trim()
      : true;

    return basicValid && passwordValid && instructorValid;
  }, [form, isInstructor]);

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "이름을 입력해주세요.";
    if (!form.email.trim()) nextErrors.email = "이메일을 입력해주세요.";
    if (!form.password.trim()) nextErrors.password = "비밀번호를 입력해주세요.";
    if (form.password && form.password.length < 8) {
      nextErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    if (!form.phone.trim()) nextErrors.phone = "연락처를 입력해주세요.";
    if (!form.nationality.trim()) nextErrors.nationality = "국적을 입력해주세요.";

    if (isInstructor) {
      if (!form.organization.trim()) {
        nextErrors.organization = "소속을 입력해주세요.";
      }
      if (!form.certificationLevel.trim()) {
        nextErrors.certificationLevel = "자격 등급 또는 강사 레벨을 입력해주세요.";
      }
      if (!form.experienceYears.trim()) {
        nextErrors.experienceYears = "경력을 입력해주세요.";
      }
    }

    if (!form.agreeTerms) {
      nextErrors.agreeTerms = "이용약관에 동의해주세요.";
    }
    if (!form.agreePrivacy) {
      nextErrors.agreePrivacy = "개인정보 수집 및 이용에 동의해주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    // ✅ 아직은 UI 단계이므로 실제 API 전송 대신 다음 단계 연결용 콘솔만 남김
    console.log("회원가입 UI 제출 데이터:", form);

    alert(
      isInstructor
        ? "강사회원 가입 신청 UI가 정상 동작했습니다. 다음 단계에서 API와 관리자 승인 흐름을 연결합니다."
        : "일반회원 가입 UI가 정상 동작했습니다. 다음 단계에서 API를 연결합니다."
    );

    navigate("/auth/login");
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <h1>회원가입</h1>
          <p>스쿠버넷 트래블 회원으로 가입하고 예약을 시작해보세요.</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <section className="register-section">
            <h2>회원 유형</h2>
            <div className="role-selector">
              <label className={`role-option ${form.role === "general" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="general"
                  checked={form.role === "general"}
                  onChange={handleChange}
                />
                <span>일반회원</span>
              </label>

              <label className={`role-option ${form.role === "instructor" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="instructor"
                  checked={form.role === "instructor"}
                  onChange={handleChange}
                />
                <span>강사회원 신청</span>
              </label>
            </div>

            {form.role === "instructor" && (
              <p className="role-help">
                강사회원은 가입 후 관리자 승인 절차를 거쳐 활성화됩니다.
              </p>
            )}
          </section>

          <section className="register-section">
            <h2>기본 정보</h2>

            <div className="form-grid">
              <div className="form-field">
                <label>이름 *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="이름을 입력하세요"
                />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>

              <div className="form-field">
                <label>이메일 *</label>
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
                <label>비밀번호 *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="8자 이상 입력"
                />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>

              <div className="form-field">
                <label>비밀번호 확인 *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                {errors.confirmPassword && (
                  <p className="field-error">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="form-field">
                <label>연락처 *</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                />
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>

              <div className="form-field">
                <label>국적 *</label>
                <input
                  type="text"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  placeholder="예: Korea"
                />
                {errors.nationality && <p className="field-error">{errors.nationality}</p>}
              </div>
            </div>
          </section>

          {isInstructor && (
            <section className="register-section">
              <h2>강사 정보</h2>

              <div className="form-grid">
                <div className="form-field">
                  <label>소속 *</label>
                  <input
                    type="text"
                    name="organization"
                    value={form.organization}
                    onChange={handleChange}
                    placeholder="소속 센터, 팀, 브랜드명"
                  />
                  {errors.organization && (
                    <p className="field-error">{errors.organization}</p>
                  )}
                </div>

                <div className="form-field">
                  <label>자격 등급 / 강사 레벨 *</label>
                  <input
                    type="text"
                    name="certificationLevel"
                    value={form.certificationLevel}
                    onChange={handleChange}
                    placeholder="예: PADI IDC Staff Instructor"
                  />
                  {errors.certificationLevel && (
                    <p className="field-error">{errors.certificationLevel}</p>
                  )}
                </div>

                <div className="form-field">
                  <label>경력(년) *</label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={form.experienceYears}
                    onChange={handleChange}
                    placeholder="예: 5"
                    min="0"
                  />
                  {errors.experienceYears && (
                    <p className="field-error">{errors.experienceYears}</p>
                  )}
                </div>

                <div className="form-field full-width">
                  <label>소개</label>
                  <textarea
                    name="intro"
                    value={form.intro}
                    onChange={handleChange}
                    rows="4"
                    placeholder="강사 활동 소개, 주 활동 지역, 운영 중인 투어 등이 있으면 적어주세요."
                  />
                </div>
              </div>
            </section>
          )}

          <section className="register-section">
            <h2>약관 동의</h2>

            <div className="terms-box">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={form.agreeTerms}
                  onChange={handleChange}
                />
                <span>[필수] 이용약관에 동의합니다.</span>
              </label>
              {errors.agreeTerms && <p className="field-error">{errors.agreeTerms}</p>}

              <div className="terms-content">
                스쿠버넷 트래블은 리브어보드 및 리조트 여행 예약 서비스를 제공합니다.
                회원은 정확한 정보를 입력해야 하며, 허위 정보 입력 또는 서비스 운영을
                방해하는 행위를 해서는 안 됩니다. 회사는 운영상 필요에 따라 서비스의
                일부를 변경하거나 중단할 수 있습니다.
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="agreePrivacy"
                  checked={form.agreePrivacy}
                  onChange={handleChange}
                />
                <span>[필수] 개인정보 수집 및 이용에 동의합니다.</span>
              </label>
              {errors.agreePrivacy && <p className="field-error">{errors.agreePrivacy}</p>}

              <div className="terms-content">
                회원가입을 위해 이름, 이메일, 비밀번호, 연락처, 국적을 수집하며,
                서비스 제공과 고객 응대 목적으로 사용됩니다. 회원 탈퇴 시까지
                보관되며, 관련 법령에 따라 일정 기간 보관될 수 있습니다.
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="agreeMarketing"
                  checked={form.agreeMarketing}
                  onChange={handleChange}
                />
                <span>[선택] 마케팅 정보 수신에 동의합니다.</span>
              </label>

              <div className="terms-content">
                이벤트, 할인 프로모션, 신규 여행 상품 안내를 이메일 또는 문자로 받을 수
                있습니다. 이 동의는 언제든지 철회할 수 있습니다.
              </div>
            </div>
          </section>

          <div className="register-actions">
            <button type="submit" className="submit-btn" disabled={!isFormValid}>
              {isInstructor ? "강사회원 가입 신청" : "회원가입"}
            </button>
          </div>

          <div className="register-footer">
            이미 계정이 있으신가요? <Link to="/auth/login">로그인</Link>
          </div>
        </form>
      </div>
    </div>
  );
}