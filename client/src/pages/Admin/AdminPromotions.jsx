import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminPromotions.css";

const EMPTY_FORM = {
    title: "",
    description: "",
    targetBookingType: "general",
    discountType: "percent",
    discountValue: 5,
    bookingStartDate: "",
    bookingEndDate: "",
    applyScope: "global",
    scopeConfig: {},
    status: "draft",
    isActive: false,
    stackable: false,
    priority: 100,
};

export default function AdminPromotions() {
    const [promotions, setPromotions] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/admin/api/promotions");
            setPromotions(Array.isArray(res.data?.promotions) ? res.data.promotions : []);
        } catch (error) {
            console.error("프로모션 목록 조회 실패:", error);
            alert("프로모션 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleChangeForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleCreatePromotion = async () => {
        if (!form.title || !form.bookingStartDate || !form.bookingEndDate) {
            alert("이벤트명, 시작일, 종료일은 필수입니다.");
            return;
        }

        try {
            setSaving(true);
            await axios.post("/admin/api/promotions", form);
            alert("프로모션이 저장되었습니다.");
            setForm(EMPTY_FORM);
            fetchPromotions();
        } catch (error) {
            console.error("프로모션 생성 실패:", error);
            alert("프로모션 저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleFieldUpdate = async (id, key, value) => {
        const target = promotions.find((item) => item.id === id);
        if (!target) return;

        try {
            const nextPayload = {
                ...target,
                [key]: value,
            };

            await axios.put(`/admin/api/promotions/${id}`, nextPayload);
            fetchPromotions();
        } catch (error) {
            console.error("프로모션 수정 실패:", error);
            alert("프로모션 수정에 실패했습니다.");
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await axios.patch(`/admin/api/promotions/${id}/toggle-active`);
            fetchPromotions();
        } catch (error) {
            console.error("프로모션 활성화 변경 실패:", error);
            alert("활성화 상태 변경에 실패했습니다.");
        }
    };

    return (
        <div className="admin-promotions-page">
            <h1>할인 이벤트 관리</h1>

            <section className="promotion-form-card">
                <h2>새 할인 이벤트 등록</h2>

                <div className="promotion-form-grid">
                    <div className="form-group">
                        <label>이벤트명</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => handleChangeForm("title", e.target.value)}
                            placeholder="예: 봄맞이 일반예약 5% 할인"
                        />
                    </div>

                    <div className="form-group">
                        <label>설명</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => handleChangeForm("description", e.target.value)}
                            placeholder="관리자 내부 설명"
                        />
                    </div>

                    <div className="form-group">
                        <label>적용 대상</label>
                        <select
                            value={form.targetBookingType}
                            onChange={(e) =>
                                handleChangeForm("targetBookingType", e.target.value)
                            }
                        >
                            <option value="general">일반예약</option>
                            <option value="instructor">강사예약</option>
                            <option value="all">전체예약</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>할인 유형</label>
                        <select
                            value={form.discountType}
                            onChange={(e) => handleChangeForm("discountType", e.target.value)}
                        >
                            <option value="percent">퍼센트 할인</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>할인율(%)</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={form.discountValue}
                            onChange={(e) => handleChangeForm("discountValue", e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>예약 시작일</label>
                        <input
                            type="date"
                            value={form.bookingStartDate}
                            onChange={(e) =>
                                handleChangeForm("bookingStartDate", e.target.value)
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>예약 종료일</label>
                        <input
                            type="date"
                            value={form.bookingEndDate}
                            onChange={(e) =>
                                handleChangeForm("bookingEndDate", e.target.value)
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>상태</label>
                        <select
                            value={form.status}
                            onChange={(e) => handleChangeForm("status", e.target.value)}
                        >
                            <option value="draft">draft</option>
                            <option value="approved">approved</option>
                            <option value="disabled">disabled</option>
                            <option value="expired">expired</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>우선순위</label>
                        <input
                            type="number"
                            value={form.priority}
                            onChange={(e) => handleChangeForm("priority", e.target.value)}
                        />
                    </div>

                    <div className="form-check">
                        <label>
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => handleChangeForm("isActive", e.target.checked)}
                            />
                            활성화
                        </label>
                    </div>

                    <div className="form-check">
                        <label>
                            <input
                                type="checkbox"
                                checked={form.stackable}
                                onChange={(e) =>
                                    handleChangeForm("stackable", e.target.checked)
                                }
                            />
                            중복 할인 허용
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button onClick={handleCreatePromotion} disabled={saving}>
                        {saving ? "저장 중..." : "이벤트 저장"}
                    </button>
                </div>
            </section>

            <section className="promotion-list-card">
                <h2>등록된 할인 이벤트</h2>

                {loading ? (
                    <p>불러오는 중...</p>
                ) : promotions.length === 0 ? (
                    <p>등록된 프로모션이 없습니다.</p>
                ) : (
                    <div className="promotion-table-wrap">
                        <table className="promotion-table">
                            <thead>
                                <tr>
                                    <th>이벤트명</th>
                                    <th>대상</th>
                                    <th>할인율</th>
                                    <th>예약기간</th>
                                    <th>상태</th>
                                    <th>활성</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promotions.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="text"
                                                value={item.title || ""}
                                                onChange={(e) =>
                                                    handleFieldUpdate(item.id, "title", e.target.value)
                                                }
                                            />
                                        </td>

                                        <td>
                                            <select
                                                value={item.targetBookingType || "general"}
                                                onChange={(e) =>
                                                    handleFieldUpdate(
                                                        item.id,
                                                        "targetBookingType",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="general">일반예약</option>
                                                <option value="instructor">강사예약</option>
                                                <option value="all">전체예약</option>
                                            </select>
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                value={item.discountValue ?? 5}
                                                onChange={(e) =>
                                                    handleFieldUpdate(
                                                        item.id,
                                                        "discountValue",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <div className="date-range-inline">
                                                <input
                                                    type="date"
                                                    value={item.bookingStartDate || ""}
                                                    onChange={(e) =>
                                                        handleFieldUpdate(
                                                            item.id,
                                                            "bookingStartDate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <span>~</span>
                                                <input
                                                    type="date"
                                                    value={item.bookingEndDate || ""}
                                                    onChange={(e) =>
                                                        handleFieldUpdate(
                                                            item.id,
                                                            "bookingEndDate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        </td>

                                        <td>
                                            <select
                                                value={item.status || "draft"}
                                                onChange={(e) =>
                                                    handleFieldUpdate(item.id, "status", e.target.value)
                                                }
                                            >
                                                <option value="draft">draft</option>
                                                <option value="approved">approved</option>
                                                <option value="disabled">disabled</option>
                                                <option value="expired">expired</option>
                                            </select>
                                        </td>

                                        <td>
                                            <button
                                                className={item.isActive ? "active-btn on" : "active-btn"}
                                                onClick={() => handleToggleActive(item.id)}
                                            >
                                                {item.isActive ? "ON" : "OFF"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}