const DELIVERY_LOCATIONS = [
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

const DEFAULT_LOCATION_ID = "cairo";

const getLocationById = (id) =>
  DELIVERY_LOCATIONS.find((loc) => loc.id === id) ??
  DELIVERY_LOCATIONS.find((loc) => loc.id === DEFAULT_LOCATION_ID);

const getShippingCost = (location, subtotal) => {
  if (!location) return 0;
  if (subtotal >= location.freeShippingMin) return 0;
  return location.shippingCost;
};

module.exports = {
  DELIVERY_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getLocationById,
  getShippingCost,
};
