const fs = require("fs");

const inputFile = "availability-basic.json";   // 원본 JSON 파일 이름
const outputFile = "trip-destinations.json";   // 결과 파일 이름

const raw = fs.readFileSync(inputFile, "utf-8");
const json = JSON.parse(raw);

const result = json.data.map(item => ({
    id: item.id,
    startDate: item.startDate,
    endDate: item.endDate,
    fleet: item.fleet?.name,
    boat: item.boat?.name,
    product: item.product?.name,
    departurePort: item.departurePort?.name,
    arrivalPort: item.arrivalPort?.name
}));

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf-8");

console.log("추출 완료 → trip-destinations.json");
