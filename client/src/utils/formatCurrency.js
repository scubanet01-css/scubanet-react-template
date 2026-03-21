// src/utils/formatCurrency.js

export function formatCurrency(amount, currency = "USD") {
    if (amount === null || amount === undefined || amount === "") return "";

    const num = Number(amount);
    if (isNaN(num)) return String(amount);

    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(num);
    } catch (e) {
        // fallback (통화 코드가 이상할 때)
        return `${currency} ${num.toLocaleString()}`;
    }
}