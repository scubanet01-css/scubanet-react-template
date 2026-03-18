import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import axios from "axios";

function formatPhone(value) {
  const numbers = value.replace(/[^0-9]/g, "").slice(0, 11);

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  }
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    instructorCardFile: null,

    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;

    if (type === "file") {
      const file = files && files[0];

      if (!file) {
        setForm((prev) => ({
          ...prev,
          [name]: null,
        }));
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      // 파일 타입 체크
      if (!allowedTypes.includes(file.type)) {
        alert("JPG, PNG, PDF 파일만 업로드 가능합니다.");
        e.target.value = ""; // 파일 선택 초기화
        return;
      }

      // 파일 크기 체크
      if (file.size > maxSize) {
        alert("파일 크기는 10MB 이하만 가능합니다.");
        e.target.value = "";
        return;
      }

      setForm((prev) => ({
        ...prev,
        [name]: file,
      }));

      return;
    }

    if (name === "phone") {
      setForm((prev) => ({
        ...prev,
        phone: formatPhone(value),
      }));
      return;
    }

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
      isValidEmail(form.email.trim()) &&
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
      form.experienceYears !== "" &&
      form.instructorCardFile
      : true;

    return basicValid && passwordValid && instructorValid;
  }, [form, isInstructor]);

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "이름을 입력해주세요.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!isValidEmail(form.email.trim())) {
      nextErrors.email = "올바른 이메일 형식을 입력해주세요.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    } else if (form.password.length < 8) {
      nextErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "연락처를 입력해주세요.";
    } else {
      const onlyNumbers = form.phone.replace(/[^0-9]/g, "");
      if (onlyNumbers.length < 10) {
        nextErrors.phone = "올바른 연락처를 입력해주세요.";
      }
    }

    if (!form.nationality.trim()) {
      nextErrors.nationality = "국적을 입력해주세요.";
    }

    if (isInstructor) {
      if (!form.organization.trim()) {
        nextErrors.organization = "소속을 입력해주세요.";
      }

      if (!form.certificationLevel.trim()) {
        nextErrors.certificationLevel = "자격 등급 또는 강사 레벨을 입력해주세요.";
      }

      if (form.experienceYears === "") {
        nextErrors.experienceYears = "경력을 입력해주세요.";
      } else if (Number(form.experienceYears) < 0) {
        nextErrors.experienceYears = "경력은 0 이상이어야 합니다.";
      }

      if (!form.instructorCardFile) {
        nextErrors.instructorCardFile = "강사 C카드 사본을 업로드해주세요.";
      } else {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "application/pdf",
        ];

        if (!allowedTypes.includes(form.instructorCardFile.type)) {
          nextErrors.instructorCardFile =
            "JPG, PNG 또는 PDF 파일만 업로드할 수 있습니다.";
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (form.instructorCardFile.size > maxSize) {
          nextErrors.instructorCardFile =
            "파일 크기는 10MB 이하로 업로드해주세요.";
        }
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
      const formData = new FormData();

      formData.append("role", form.role);
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("confirmPassword", form.confirmPassword);
      formData.append("phone", form.phone);
      formData.append("nationality", form.nationality);

      formData.append("organization", form.organization || "");
      formData.append("certificationLevel", form.certificationLevel || "");
      formData.append("experienceYears", form.experienceYears || "");
      formData.append("intro", form.intro || "");

      formData.append("agreeTerms", String(form.agreeTerms));
      formData.append("agreePrivacy", String(form.agreePrivacy));
      formData.append("agreeMarketing", String(form.agreeMarketing));

      if (form.instructorCardFile) {
        formData.append("instructorCardFile", form.instructorCardFile);
      }

      const res = await axios.post("/api/auth/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(res.data.message || "회원가입이 완료되었습니다.");
      navigate("/auth/login");
    } catch (err) {
      console.error("회원가입 실패:", err);

      const message =
        err.response?.data?.message || "회원가입 중 오류가 발생했습니다.";

      alert(message);
    }
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
              <label
                className={`role-option ${form.role === "general" ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="role"
                  value="general"
                  checked={form.role === "general"}
                  onChange={handleChange}
                />
                <span>일반회원</span>
              </label>

              <label
                className={`role-option ${form.role === "instructor" ? "active" : ""}`}
              >
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

            {isInstructor && (
              <p className="role-help">
                강사회원은 가입 신청 후 관리자 승인 절차를 거쳐 활성화됩니다.
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
                {errors.nationality && (
                  <p className="field-error">{errors.nationality}</p>
                )}
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

                <div className="form-field full-width">
                  <label>강사 C카드 사본 업로드 *</label>
                  <div className="file-upload-box">
                    <input
                      type="file"
                      name="instructorCardFile"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleChange}
                    />
                    <p className="file-help">
                      강사회원 승인 심사를 위해 강사 자격을 확인할 수 있는 C카드
                      사본을 업로드해주세요. (JPG, PNG, PDF / 최대 10MB)
                    </p>

                    {form.instructorCardFile && (
                      <div className="file-name">
                        선택된 파일: {form.instructorCardFile.name}
                      </div>
                    )}
                  </div>

                  {errors.instructorCardFile && (
                    <p className="field-error">{errors.instructorCardFile}</p>
                  )}
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
              {errors.agreePrivacy && (
                <p className="field-error">{errors.agreePrivacy}</p>
              )}

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
                이벤트, 할인 프로모션, 신규 여행 상품 안내를 이메일 또는 문자로
                받을 수 있습니다. 이 동의는 언제든지 철회할 수 있습니다.
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