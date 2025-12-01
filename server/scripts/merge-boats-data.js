// 1️⃣ Node.js 모듈
const fs = require('fs');
const path = require('path');

// 2️⃣ JSON 파일 경로 (우리가 저장하는 위치)
const DATA_DIR = "/var/www/scubanet/data";

// 3️⃣ JSON 읽기
const boatsData = JSON.parse(fs.readFileSync(`${DATA_DIR}/boats.json`, 'utf-8'));
const boatsDetailsData = JSON.parse(fs.readFileSync(`${DATA_DIR}/boats-details.json`, 'utf-8'));
const availabilityData = JSON.parse(fs.readFileSync(`${DATA_DIR}/availability-detailed.json`, 'utf-8'));

console.log('✅ 파일 읽기 완료');
console.log('boats:', boatsData.data.length);
console.log('boatsDetails:', boatsDetailsData.data.length);
console.log('availability:', availabilityData.data.length);

// 4️⃣ boats + boats-details 병합
const mergedBoats = boatsData.data.map(boat => {
  const details = boatsDetailsData.data.find(detail => detail.id === boat.id) || {};

  return {
    id: boat.id,
    name: boat.name,
    fleet: boat.fleet || null,
    currency: boat.currency || 'USD',
    countries: boat.countries || [],
    maxSpaces: boat.maxSpaces || null,
    deckPlan: boat.deckPlan || [],
    description: details.boatDescription || boat.description || '',
    specs: {
      length: details.length || null,
      width: details.width || null,
      maxGuests: boat.maxSpaces || null,
      yearBuilt: details.yearBuilt || null,
      wifi: details.wifi || false,
      nitrox: details.nitrox || false,
      description: details.boatDescription || ''
    },
    cabins: boat.cabins || [],
    media: boat.media || [],
    availability: boat.availabilities || [],
    reviews: [],
    includes: [],
    excludes: []
  };
});

console.log('✅ boats + boats-details 병합 완료:', mergedBoats.length);

// 5️⃣ availability 병합
mergedBoats.forEach(boat => {
  const boatTrips = availabilityData.data.filter(trip => trip.boatId === boat.id);

  boat.availability = boatTrips.map(trip => ({
    tripId: trip.id,
    startDate: trip.startDate,
    endDate: trip.endDate,
    productName: trip.productName,
    availability: trip.availability,
    price: trip.price,
    seatsLeft: trip.seatsLeft
  }));
});

console.log('✅ availability 병합 완료');

// 6️⃣ 병합 결과 저장
const outputFile = `${DATA_DIR}/boats-merged.json`;
fs.writeFileSync(outputFile, JSON.stringify({ data: mergedBoats }, null, 2), 'utf-8');

console.log('🎉 병합된 JSON 파일 저장 완료:', outputFile);
