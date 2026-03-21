// src/utils/currencyUtils.js
export function getCurrencyForTrip(trip, defaultCurrency = "USD") {
    return (
        trip?.pricing?.currency ||
        trip?.currency ||
        defaultCurrency
    );
}