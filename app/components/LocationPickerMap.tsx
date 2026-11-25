"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  value: string;
  onChange: (googleMapsUrl: string, detectedAddress?: string) => void;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
}

// พิกัดเริ่มต้น: Paphos, Cyprus
const DEFAULT_CENTER: [number, number] = [34.7754, 32.4218];

export default function LocationPickerMap({
  value,
  onChange,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);

  const updateLocationRef = useRef<
    (lat: number, lng: number, addressText?: string, zoomLevel?: number) => void
  >(() => {});

  // ค่าเริ่มต้นเป็นโหมด "street" (แผนที่ถนน) ให้ดูง่ายเหมือนภาพตัวอย่าง
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState("");

  // แปลงพิกัดเป็นชื่อที่อยู่ (Reverse Geocoding)
  const fetchAddressFromCoords = async (
    lat: number,
    lng: number
  ): Promise<string | undefined> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en,th",
          },
        }
      );
      const data = await res.json();
      return data?.display_name || undefined;
    } catch {
      return undefined;
    }
  };

  // อัปเดตหมุดและส่งลิงก์ Google Maps กลับไปที่ฟอร์มหลัก
  const updateLocation = (
    lat: number,
    lng: number,
    addressText?: string,
    zoomLevel = 16
  ) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));
    const googleMapsLink = `https://www.google.com/maps?q=${fixedLat},${fixedLng}`;

    setCoords({ lat: fixedLat, lng: fixedLng });
    setErrorMsg("");
    onChange(googleMapsLink, addressText);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([fixedLat, fixedLng]);
      mapInstanceRef.current.setView([fixedLat, fixedLng], zoomLevel);
    }
  };

  updateLocationRef.current = updateLocation;

  // โหลดแผนที่ Leaflet ฝั่ง Client
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      const customIcon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const map = L.map(mapContainerRef.current, {
        maxZoom: 20,
      }).setView(DEFAULT_CENTER, 13);
      mapInstanceRef.current = map;

      // เลเยอร์แผนที่ถนน (โทนสีและป้ายถนนอ่านง่าย)
      const streetLayer = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          attribution: "Map tiles",
          maxNativeZoom: 20,
          maxZoom: 20,
        }
      );

      // เลเยอร์ภาพถ่ายดาวเทียมสำรอง
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxNativeZoom: 18,
          maxZoom: 20,
        }
      );

      streetLayerRef.current = streetLayer;
      satelliteLayerRef.current = satelliteLayer;

      streetLayer.addTo(map);

      const marker = L.marker(DEFAULT_CENTER, {
        draggable: true,
        icon: customIcon,
      }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        const detectedAddress = await fetchAddressFromCoords(pos.lat, pos.lng);
        updateLocationRef.current(
          pos.lat,
          pos.lng,
          detectedAddress,
          map.getZoom()
        );
      });

      map.on("click", async (e: any) => {
        const detectedAddress = await fetchAddressFromCoords(
          e.latlng.lat,
          e.latlng.lng
        );
        updateLocationRef.current(
          e.latlng.lat,
          e.latlng.lng,
          detectedAddress,
          map.getZoom()
        );
      });
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // สลับมุมมอง Map / Satellite
  const handleSwitchMapStyle = (style: "street" | "satellite") => {
    setMapStyle(style);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (style === "street") {
      if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current);
      if (streetLayerRef.current) streetLayerRef.current.addTo(map);
    } else {
      if (streetLayerRef.current) map.removeLayer(streetLayerRef.current);
      if (satelliteLayerRef.current) satelliteLayerRef.current.addTo(map);
    }
  };

  // ทำความสะอาดคำค้นหาให้หาเจอง่ายขึ้น
  const normalizeSearchQuery = (raw: string) => {
    return raw
      .replace(/^\s*\d+(\/\d+)?\s*/, "")
      .replace(
        /\b(ถนน|ถ\.|ซอย|ซ\.|หมู่|ม\.|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด)\s*/g,
        " "
      )
      .replace(/\b(District|Province|Subdistrict)\b/gi, " ")
      .replace(/\b\d{5}\b/g, "")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // ค้นหาสถานที่แบบทั่วโลก
  const handleSearch = async () => {
    const cleaned = normalizeSearchQuery(searchQuery);
    if (!cleaned) return;

    setIsSearching(true);
    setErrorMsg("");
    setSearchResults([]);

    try {
      const q = encodeURIComponent(cleaned);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`,
        {
          headers: {
            "Accept-Language": "en,th",
          },
        }
      );
      const data: NominatimPlace[] = await res.json();

      if (data && data.length > 0) {
        const first = data[0];
        updateLocation(
          parseFloat(first.lat),
          parseFloat(first.lon),
          first.display_name,
          data.length === 1 ? 16 : 15
        );

        if (data.length > 1) {
          setSearchResults(data);
        }
      } else {
        setErrorMsg(
          "Location not found. Try street/area name or drag the pin on the map."
        );
      }
    } catch {
      setErrorMsg("Search failed. Please drag the pin on the map directly.");
    } finally {
      setIsSearching(false);
    }
  };

  // ดึงตำแหน่ง GPS ปัจจุบันของผู้ใช้
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Your browser does not support GPS location.");
      return;
    }

    setIsLocating(true);
    setErrorMsg("");
    setSearchResults([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const detectedAddress = await fetchAddressFromCoords(lat, lng);
        updateLocation(lat, lng, detectedAddress, 17);
        setIsLocating(false);
      },
      () => {
        setErrorMsg(
          "Unable to get current location. Please allow location access or pin on the map."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* ย่อขนาดกล่อง Attribution ของ Leaflet ให้เล็กลงและจางลงเล็กน้อย */}
      <style jsx global>{`
        .leaflet-control-attribution {
          font-size: 9px !important;
          line-height: 1.2 !important;
          padding: 1px 4px !important;
          opacity: 0.65;
          transition: opacity 0.2s ease;
        }
        .leaflet-control-attribution:hover {
          opacity: 1;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Search street, area, or complex (e.g. Coral Bay Ave, Paphos)"
          className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
        >
          {isSearching ? "Searching..." : "Find on Map"}
        </button>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
        >
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
      </div>

      {/* รายการสถานที่ที่ค้นหาเจอ */}
      {searchResults.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-xs max-h-40 overflow-y-auto">
          {searchResults.map((item, idx) => (
            <button
              key={`${item.lat}-${item.lon}-${idx}`}
              type="button"
              onClick={() => {
                updateLocation(
                  parseFloat(item.lat),
                  parseFloat(item.lon),
                  item.display_name,
                  16
                );
                setSearchResults([]);
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              📍 {item.display_name}
            </button>
          ))}
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      {/* กล่องแสดงแผนที่ + ปุ่มสลับ Map / Satellite */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200">
        <div className="absolute top-2.5 right-2.5 z-[400] flex rounded-lg bg-white/95 p-0.5 shadow-md border border-gray-200">
          <button
            type="button"
            onClick={() => handleSwitchMapStyle("street")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              mapStyle === "street"
                ? "bg-[#006AFF] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMapStyle("satellite")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              mapStyle === "satellite"
                ? "bg-[#006AFF] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Satellite
          </button>
        </div>

        <div ref={mapContainerRef} className="h-80 sm:h-96 w-full z-0" />
      </div>

      {/* แสดงสถานะพิกัดและปุ่มเช็กใน Google Maps */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          {coords
            ? `Pinned: ${coords.lat}, ${coords.lng} (Drag pin or click map to adjust)`
            : "Click on the map or drag the pin to mark the exact location"}
        </span>

        {(value || coords) && (
          <a
            href={
              value ||
              `https://www.google.com/maps?q=${coords?.lat},${coords?.lng}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            Preview in Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}