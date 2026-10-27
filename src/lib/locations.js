import { BASE_API_URL } from "./api";
import {
  COUNTRIES,
  DEFAULT_LOCATION_ID,
  DELIVERY_LOCATIONS as FALLBACK_LOCATIONS,
  findNearestLocation,
  getLocationById as getFallbackLocationById,
  getShippingCost,
  matchLocationFromText,
  resolveGovernorate,
} from "../data/locations";

let cachedLocations = null;

export const fetchDeliveryLocations = async () => {
  if (cachedLocations) return cachedLocations;

  try {
    const response = await fetch(`${BASE_API_URL}/api/locations`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      cachedLocations = data;
      return cachedLocations;
    }
  } catch (error) {
    console.warn("Using fallback delivery locations:", error.message);
  }

  cachedLocations = FALLBACK_LOCATIONS;
  return cachedLocations;
};

export const getLocationById = (id, locations = cachedLocations ?? FALLBACK_LOCATIONS) =>
  locations.find((loc) => loc.id === id) ??
  locations.find((loc) => loc.id === DEFAULT_LOCATION_ID);

export {
  COUNTRIES,
  DEFAULT_LOCATION_ID,
  FALLBACK_LOCATIONS as DELIVERY_LOCATIONS,
  findNearestLocation,
  getShippingCost,
  matchLocationFromText,
  resolveGovernorate,
  getFallbackLocationById,
};
