export const DELIVERY_LOCATIONS = [
  {
    id: "cairo",
    name: "Cairo",
    governorate: "Cairo",
    lat: 30.0444,
    lng: 31.2357,
    shippingCost: 0,
    deliveryDays: "1–2",
    freeShippingMin: 50,
  },
  {
    id: "giza",
    name: "Giza",
    governorate: "Giza",
    lat: 30.0131,
    lng: 31.2089,
    shippingCost: 3.99,
    deliveryDays: "2–3",
    freeShippingMin: 75,
  },
  {
    id: "alexandria",
    name: "Alexandria",
    governorate: "Alexandria",
    lat: 31.2001,
    lng: 29.9187,
    shippingCost: 4.99,
    deliveryDays: "2–4",
    freeShippingMin: 75,
  },
  {
    id: "mansoura",
    name: "Mansoura",
    governorate: "Dakahlia",
    lat: 31.0409,
    lng: 31.3785,
    shippingCost: 5.99,
    deliveryDays: "3–5",
    freeShippingMin: 100,
  },
  {
    id: "tanta",
    name: "Tanta",
    governorate: "Gharbia",
    lat: 30.7865,
    lng: 31.0004,
    shippingCost: 5.99,
    deliveryDays: "3–5",
    freeShippingMin: 100,
  },
  {
    id: "aswan",
    name: "Aswan",
    governorate: "Aswan",
    lat: 24.0889,
    lng: 32.8998,
    shippingCost: 7.99,
    deliveryDays: "4–6",
    freeShippingMin: 120,
  },
];

export const DEFAULT_LOCATION_ID = "cairo";

export const COUNTRIES = [{ id: "eg", name: "Egypt" }];

const GOVERNORATE_ALIASES = {
  "cairo governorate": "Cairo",
  cairo: "Cairo",
  giza: "Giza",
  "giza governorate": "Giza",
  alexandria: "Alexandria",
  "alexandria governorate": "Alexandria",
  dakahlia: "Dakahlia",
  "ad dakahliyah": "Dakahlia",
  gharbia: "Gharbia",
  "al gharbiyah": "Gharbia",
  aswan: "Aswan",
  "aswan governorate": "Aswan",
};

export const getLocationById = (id, locations = DELIVERY_LOCATIONS) =>
  locations.find((loc) => loc.id === id) ??
  locations.find((loc) => loc.id === DEFAULT_LOCATION_ID);

export const getShippingCost = (location, subtotal) => {
  if (!location) return 0;
  if (subtotal >= location.freeShippingMin) return 0;
  return location.shippingCost;
};

const toRadians = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const findNearestLocation = (lat, lng, locations = DELIVERY_LOCATIONS) => {
  let nearest = locations[0];
  let minDistance = Infinity;

  for (const loc of locations) {
    const distance = haversineKm(lat, lng, loc.lat, loc.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = loc;
    }
  }

  return nearest;
};

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const resolveGovernorate = (value = "") => {
  const normalized = normalizeText(value);
  return GOVERNORATE_ALIASES[normalized] ?? value;
};

export const matchLocationFromText = (
  { cityArea = "", governorate = "" },
  locations = DELIVERY_LOCATIONS,
) => {
  const cityNorm = normalizeText(cityArea);
  const govNorm = normalizeText(resolveGovernorate(governorate));

  const byCity = locations.find(
    (loc) =>
      cityNorm.includes(normalizeText(loc.name)) ||
      normalizeText(loc.name).includes(cityNorm),
  );
  if (byCity) return byCity;

  const byGov = locations.find(
    (loc) =>
      govNorm.includes(normalizeText(loc.governorate)) ||
      normalizeText(loc.governorate).includes(govNorm),
  );
  if (byGov) return byGov;

  return getLocationById(DEFAULT_LOCATION_ID, locations);
};
