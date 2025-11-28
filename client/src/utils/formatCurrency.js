// src/utils/formatCurrency.js

// amount: 숫자 또는 숫자형 문자열
// currency: "USD", "SAR" 등 ISO 통화코드
export function formatCurrency(amount, currency = "USD") {
    if (amount === null || amount === undefined || amount === "") return "";

    const num = Number(amount);
    if (isNaN(num)) return String(amount);

    const symbols = {
        USD: "$",
        SAR: "SAR", // ⭐ Almonda 전용
        EUR: "€",
        GBP: "£",
        JPY: "¥",
        KRW: "₩",
    };

    const symbol = symbols[currency] || currency; // 모르는 통화면 코드 그대로 사용

    return `${symbol} ${num.toLocaleString()}`;
}
