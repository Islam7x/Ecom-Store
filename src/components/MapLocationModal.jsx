import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { useDeliveryLocation } from "../context/LocationContext";
import { findNearestLocation } from "../data/locations";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapLocationModal = ({ isOpen, onClose, onConfirm }) => {
  const { location, locations, geoDetecting, detectLocation } =
    useDeliveryLocation();
  const [manualSelection, setManualSelection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pinRef = useRef(null);

  const deliveryLocations = useMemo(
    () => (locations.length > 0 ? locations : []),
    [locations],
  );
  const selectedLocation =
    manualSelection ?? location ?? deliveryLocations[0] ?? null;

  useEffect(() => {
    if (searchQuery.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery,
          )}&countrycodes=eg`,
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Geocoding error", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Location coordinates (Egypt locations)
  const locationCoords = useMemo(
    () => ({
      cairo: [30.0444, 31.2357],
      giza: [30.0131, 31.2089],
      alexandria: [31.2001, 29.9187],
      helwan: [29.8625, 31.3386],
      zagazig: [30.588, 31.5049],
    }),
    [],
  );

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstanceRef.current) return;

    // Create map centered on Egypt
    const map = L.map(mapRef.current).setView([26.8206, 30.8025], 6);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add markers for all locations
    deliveryLocations.forEach((loc) => {
      const coords = [loc.lat, loc.lng];

      const marker = L.marker(coords, {
        title: loc.name,
      })
        .bindPopup(
          `<div class="p-2">
            <p class="font-semibold">${loc.name}</p>
            <p class="text-sm">${loc.governorate}</p>
          </div>`,
        )
        .addTo(map)
        .on("click", () => {
          setManualSelection(loc);
        });

      markersRef.current[loc.id] = marker;
    });

    const onMapClick = (e) => {
      const { lat, lng } = e.latlng;
      const nearest = findNearestLocation(lat, lng);
      setManualSelection(nearest);

      if (pinRef.current) {
        pinRef.current.remove();
      }

      pinRef.current = L.marker([lat, lng], { title: "Selected location" })
        .addTo(map)
        .bindPopup(
          "<div class='p-2'><strong>Your order will be delivered here</strong></div>",
        )
        .openPopup();

      map.setView([lat, lng], map.getZoom());
    };

    map.on("click", onMapClick);

    // Clean up
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("click", onMapClick);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [deliveryLocations, isOpen, locationCoords]);

  // Update marker styles when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (id === selectedLocation.id) {
        marker.setZIndexOffset(1000);
        marker.setIcon(
          L.icon({
            iconUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            shadowUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            shadowSize: [41, 41],
            className: "leaflet-marker-selected",
          }),
        );
        try {
          marker.openPopup();
        } catch (error) {
          console.error(error);
        }
      } else {
        marker.setIcon(new L.Icon.Default());
        try {
          marker.closePopup();
        } catch (error) {
          console.error(error);
        }
      }
    });

    // ensure there's a pin at the selected location
    if (mapInstanceRef.current && selectedLocation) {
      if (pinRef.current) {
        pinRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      } else {
        pinRef.current = L.marker(
          [selectedLocation.lat, selectedLocation.lng],
          {
            title: "Selected location",
          },
        )
          .addTo(mapInstanceRef.current)
          .bindPopup(
            "<div class='p-2'><strong>Your order will be delivered here</strong></div>",
          );
      }
    }
  }, [selectedLocation, userCoords]);

  const handleConfirm = () => {
    onConfirm(selectedLocation);
    onClose();
  };

  const handleUseCurrentLocation = async () => {
    try {
      const result = await detectLocation();
      if (!result) return;
      const { coords, location: matched } = result;
      setUserCoords(coords);
      setManualSelection(matched);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 13);
        if (pinRef.current) pinRef.current.remove();
        pinRef.current = L.marker([coords.lat, coords.lng], {
          title: "Current Location",
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(
            "<div class='p-2'><strong>Your order will be delivered here</strong></div>",
          )
          .openPopup();
      }
    } catch (err) {
      console.error("Error detecting location:", err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: "1200px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#e5e1e9] shrink-0">
            <h2 className="text-lg md:text-2xl font-bold text-[#1a146b]">
              Add new address
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#f6f2fa] rounded-lg transition"
              aria-label="Close"
            >
              <X size={24} className="text-[#474651]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex gap-4 md:gap-6 p-4 md:p-6 flex-col md:flex-row">
            {/* Map Section */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Search Input */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777682]"
                />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSearchQuery(nextValue);
                    if (nextValue.trim() === "") {
                      setSearchResults([]);
                      setIsSearching(false);
                    }
                  }}
                  className="w-full pl-12 pr-4 py-2 md:py-3 rounded-full border border-[#e5e1e9] bg-[#f6f2fa] text-sm md:text-base focus:border-[#1a146b] focus:ring-2 focus:ring-[#1a146b]/10 outline-none transition"
                />
              </div>

              {/* Map Container */}
              <div
                ref={mapRef}
                className="flex-1 rounded-2xl border border-[#e5e1e9] overflow-hidden shadow-md"
                style={{ minHeight: "300px" }}
              />

              {/* Use Current Location Button */}
              <button
                type="button"
                disabled={geoDetecting}
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center justify-center gap-2 py-2 md:py-3 px-4 rounded-lg bg-[#006b5f] text-white font-semibold text-sm md:text-base hover:bg-[#005a52] transition disabled:opacity-70 disabled:cursor-wait"
              >
                {geoDetecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <MapPin size={18} />
                    Use current location
                  </>
                )}
              </button>
            </div>

            {/* Locations List Sidebar */}
            <div className="w-full md:w-80 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-[#e5e1e9] pt-4 md:pt-0 md:pl-6 shrink-0">
              <h3 className="text-xs md:text-sm font-semibold text-[#777682] uppercase flex items-center justify-between">
                <span>
                  {searchQuery.trim() === ""
                    ? "Suggested Locations"
                    : "Search Results"}
                </span>
                {isSearching && (
                  <Loader2 size={14} className="animate-spin text-[#1a146b]" />
                )}
              </h3>
              <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-2">
                {searchQuery.trim() === "" ? (
                  deliveryLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setManualSelection(loc);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView(
                            [loc.lat, loc.lng],
                            12,
                          );
                        }
                      }}
                      className={`w-full text-left p-2 md:p-3 rounded-lg border-2 transition hover:shadow-md text-sm md:text-base ${
                        selectedLocation.id === loc.id
                          ? "border-[#1a146b] bg-[#e2dfff]/40"
                          : "border-[#e5e1e9] hover:border-[#1a146b] hover:bg-[#f9f7ff]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1b1b21]">
                            {loc.name}
                          </p>
                          <p className="text-xs md:text-sm text-[#474651]">
                            {loc.governorate}
                          </p>
                          <p className="text-xs text-[#777682] mt-1">
                            {loc.shippingCost === 0
                              ? "Free delivery"
                              : `$${loc.shippingCost.toFixed(2)} shipping`}{" "}
                            · {loc.deliveryDays}d
                          </p>
                        </div>
                        {selectedLocation.id === loc.id && (
                          <div className="ml-2 h-5 w-5 rounded-full bg-[#1a146b] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, idx) => {
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    const nearest = findNearestLocation(lat, lng);
                    return (
                      <button
                        key={result.place_id || idx}
                        onClick={() => {
                          setManualSelection(nearest);
                          if (mapInstanceRef.current) {
                            if (pinRef.current) pinRef.current.remove();
                            pinRef.current = L.marker([lat, lng], {
                              title: result.name,
                            })
                              .addTo(mapInstanceRef.current)
                              .bindPopup(
                                "<div class='p-2'><strong>Your order will be delivered here</strong></div>",
                              )
                              .openPopup();
                            mapInstanceRef.current.setView([lat, lng], 14);
                          }
                        }}
                        className={`w-full text-left p-2 md:p-3 rounded-lg border-2 transition hover:shadow-md text-sm md:text-base border-[#e5e1e9] hover:border-[#1a146b] hover:bg-[#f9f7ff]`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1b1b21] truncate">
                              {result.name || result.display_name.split(",")[0]}
                            </p>
                            <p className="text-xs md:text-sm text-[#474651] truncate mb-1">
                              {result.display_name}
                            </p>
                            <p className="text-xs font-medium text-[#006b5f] bg-[#e2f5f3] inline-block px-2 py-0.5 rounded-full mt-1">
                              Delivered via {nearest.name}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : !isSearching ? (
                  <div className="text-center py-8 text-[#777682]">
                    No real locations found for "{searchQuery}"
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Footer with Confirm Button */}
          <div className="border-t border-[#e5e1e9] p-4 md:p-6 bg-[#f6f2fa] shrink-0">
            <div className="mb-3 md:mb-4 pb-3 md:pb-4 border-b border-[#e5e1e9]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#777682] mb-2">
                Selected Location
              </p>
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-[#1a146b] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1b1b21] truncate">
                    {selectedLocation.name}
                  </p>
                  <p className="text-sm text-[#474651] truncate">
                    {selectedLocation.governorate}, Egypt
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-lg text-white font-bold hover:shadow-lg transition active:scale-95"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #1a146b 0%, #312e81 100%)",
              }}
            >
              CONFIRM LOCATION
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default MapLocationModal;
