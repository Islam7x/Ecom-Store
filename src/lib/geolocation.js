import {
  DEFAULT_LOCATION_ID,
  findNearestLocation,
  getLocationById,
  matchLocationFromText,
  resolveGovernorate,
  fetchDeliveryLocations,
} from "./locations";

const EGYPT_BOUNDS = {
  minLat: 22,
  maxLat: 32,
  minLng: 25,
  maxLng: 36,
};

const isInEgypt = (lat, lng) =>
  lat >= EGYPT_BOUNDS.minLat &&
  lat <= EGYPT_BOUNDS.maxLat &&
  lng >= EGYPT_BOUNDS.minLng &&
  lng <= EGYPT_BOUNDS.maxLng;

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 300000,
    });
  });

const reverseGeocode = async (lat, lng) => {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not resolve your location. Please enter it manually.");
  }

  return response.json();
};

export const detectDeliveryLocation = async () => {
  const locations = await fetchDeliveryLocations();
  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;

  if (!isInEgypt(latitude, longitude)) {
    throw new Error(
      "Your current location appears to be outside Egypt. Please add an address manually.",
    );
  }

  const nearest = findNearestLocation(latitude, longitude, locations);
  let cityArea = nearest.name;
  let governorate = nearest.governorate;
  let district = "";
  let street = "";

  try {
    const geo = await reverseGeocode(latitude, longitude);
    const address = geo.address ?? {};

    cityArea =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      nearest.name;
    governorate = resolveGovernorate(
      address.state || address.region || nearest.governorate,
    );
    district = address.suburb || address.neighbourhood || address.district || "";
    street = [address.road, address.pedestrian].filter(Boolean).join(", ");
  } catch {
    // Nearest-city fallback is still useful when reverse geocoding fails.
  }

  const matchedLocation =
    matchLocationFromText({ cityArea, governorate }, locations) ?? nearest;

  return {
    locationId: matchedLocation.id,
    location: matchedLocation,
    coords: { lat: latitude, lng: longitude },
    suggestedAddress: {
      country: "Egypt",
      cityArea,
      governorate,
      district,
      street,
    },
  };
};

export const safeDetectDeliveryLocation = async () => {
  try {
    return { success: true, data: await detectDeliveryLocation() };
  } catch (error) {
    const locations = await fetchDeliveryLocations();
    return {
      success: false,
      data: {
        locationId: DEFAULT_LOCATION_ID,
        location: getLocationById(DEFAULT_LOCATION_ID, locations),
      },
      error: error.message || "Unable to detect your location.",
    };
  }
};
