import destinationMap from "../data/destination-map.json";

export function getCountryList() {
    return Object.keys(destinationMap);
}

export function getDestinationList(country) {
    if (!country || !destinationMap[country]) return [];
    return Object.keys(destinationMap[country]);
}

export function getBoatsByDestination(trips, country, destination) {
    return trips
        .filter((t) => {
            const port = t.departurePort?.name || "";
            const product = t.product?.name || "";

            return (
                destinationMap[country] &&
                destinationMap[country][destination] &&
                destinationMap[country][destination].some((x) => port.includes(x))
            );
        })
        .map((t) => t.boat?.name)
        .filter(Boolean);
}
