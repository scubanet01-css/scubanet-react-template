// src/utils/currencyUtils.js
export function isAlmondaBoat(boat) {
    if (!boat) return false;

    const id = Number(boat.id);
    const name = (boat.name || "").trim().toLowerCase();

    return id === 625 || name === "almonda";
}

export function getCurrencyForTrip(trip, defaultCurrency = "USD") {
    if (!trip?.boat) return defaultCurrency;
    return isAlmondaBoat(trip.boat) ? "SAR" : defaultCurrency;
}
