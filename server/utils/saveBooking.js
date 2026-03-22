// /server/utils/saveBooking.js
const fs = require("fs");
const path = require("path");

const BOOKINGS_FILE = path.join(__dirname, "../../data/bookings.json");

function ensureBookingsFile() {
    const dir = path.dirname(BOOKINGS_FILE);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(BOOKINGS_FILE)) {
        fs.writeFileSync(BOOKINGS_FILE, "[]", "utf8");
    }
}

function readBookings() {
    ensureBookingsFile();

    try {
        const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("❌ bookings.json 읽기 실패:", err);
        return [];
    }
}

function writeBookings(bookings) {
    ensureBookingsFile();
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function generateBookingId(existingBookings) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `BKG-${y}${m}${d}`;

    const todayBookings = existingBookings.filter(
        (b) => typeof b?.bookingId === "string" && b.bookingId.startsWith(prefix)
    );

    const seq = String(todayBookings.length + 1).padStart(4, "0");
    return `${prefix}-${seq}`;
}

function getTripName(trip) {
    return (
        trip?.product?.name ||
        trip?.title ||
        trip?.tripName ||
        trip?.name ||
        "정보 없음"
    );
}

function getBoatName(trip) {
    return trip?.boat?.name || trip?.boatName || "정보 없음";
}

function getCurrency(trip, fallback = "USD") {
    return trip?.pricing?.currency || trip?.currency || fallback;
}

/**
 * 예약 저장
 * @param {object} params
 * @returns {object} savedBooking
 */
function saveBooking(params) {
    const {
        trip,
        selectedBookings = [],
        guest,
        totalPrice = 0,
        bookingType = "general",
        invoiceFileUrl = null,
        invoiceFilePath = null,
        emailSent = false,
        paymentStatus = "pending",
        bookingStatus = "confirmed",
    } = params || {};

    const bookings = readBookings();
    const bookingId = generateBookingId(bookings);

    const savedBooking = {
        bookingId,
        createdAt: new Date().toISOString(),
        bookingType,

        guest: {
            name: guest?.name || "",
            email: guest?.email || "",
            phone: guest?.phone || "",
        },

        trip: {
            id: trip?.id || null,
            source: trip?.source || null,
            vesselId: trip?.vesselId || null,
            title: getTripName(trip),
            boatName: getBoatName(trip),
            startDate: trip?.startDate || null,
            endDate: trip?.endDate || null,
            nights: trip?.nights || null,
            destination: trip?.destination || null,
            country: trip?.country || null,
        },

        selectedBookings: Array.isArray(selectedBookings)
            ? selectedBookings.map((item) => ({
                cabinId: item?.cabinId || null,
                cabinName: item?.cabinName || "",
                occupancyType: item?.occupancyType || "",
                occupancyValue: item?.occupancyValue || "",
                price: Number(item?.price) || 0,
            }))
            : [],

        totalPrice: Number(totalPrice) || 0,
        currency: getCurrency(trip, "USD"),

        invoiceFileUrl,
        invoiceFilePath,

        emailSent,
        paymentStatus,
        bookingStatus,

        agreements: data?.agreements || null,
        agreementMeta: data?.agreementMeta || null,
    };

    bookings.push(savedBooking);
    writeBookings(bookings);

    console.log(`✅ 예약 저장 완료: ${bookingId}`);

    return savedBooking;
}

module.exports = saveBooking;