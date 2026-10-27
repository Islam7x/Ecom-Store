import { useRef, useState } from "react";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { useDeliveryLocation } from "../context/LocationContext";
import MapLocationModal from "./MapLocationModal";

const LocationSelector = ({ variant = "compact" }) => {
  const { location, setLocation, geoDetecting } = useDeliveryLocation();
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef(null);

  const isCompact = variant === "compact";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border transition-colors ${
          isCompact
            ? "border-transparent px-2 py-1.5 text-sm hover:border-[#e5e1e9] hover:bg-[#f6f2fa]"
            : "w-full border-[#c8c5d3] bg-white px-4 py-3 text-left hover:border-[#1a146b]"
        }`}
        aria-label="Select delivery location"
      >
        {geoDetecting ? (
          <Loader2
            className={`shrink-0 animate-spin text-[#006b5f] ${isCompact ? "h-4 w-4" : "h-5 w-5"}`}
          />
        ) : (
          <MapPin
            className={`shrink-0 text-[#006b5f] ${isCompact ? "h-4 w-4" : "h-5 w-5"}`}
          />
        )}
        <div className={`min-w-0 ${isCompact ? "hidden sm:block" : "flex-1"}`}>
          {isCompact ? (
            <span className="block truncate font-semibold text-[#1b1b21]">
              {location?.name ?? "Select location"}
            </span>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#777682]">
                Deliver to
              </p>
              <p className="truncate font-semibold text-[#1b1b21]">
                {location?.name ?? "Select location"}
                {location?.governorate ? `, ${location.governorate}` : ""}
              </p>
              <p className="text-sm text-[#474651]">
                {location?.shippingCost === 0
                  ? "Free delivery"
                  : `$${Number(location?.shippingCost ?? 0).toFixed(2)} shipping`} · {location?.deliveryDays ?? "1–2"} business days
              </p>
            </>
          )}
        </div>
        <ChevronDown
          className={`shrink-0 text-[#777682] transition-transform ${isCompact ? "h-4 w-4" : "h-5 w-5"}`}
        />
      </button>

      <MapLocationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={(selectedLocation) => setLocation(selectedLocation.id)}
      />
    </div>
  );
};

export default LocationSelector;
