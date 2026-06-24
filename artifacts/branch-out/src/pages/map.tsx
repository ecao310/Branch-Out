import { useEffect, useRef } from "react";
import L from "leaflet";
import { useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

// School colors map - official colors for common universities
const SCHOOL_COLORS: Record<string, { bg: string; text: string }> = {
  "Stanford":              { bg: "#8C1515", text: "#ffffff" },
  "California (Berkeley)": { bg: "#003262", text: "#FDB515" },
  "UCLA":                  { bg: "#2D68C4", text: "#F2A900" },
  "Michigan":              { bg: "#00274C", text: "#FFCB05" },
  "USC":                   { bg: "#990000", text: "#FFC72C" },
  "Cornell":               { bg: "#B31B1B", text: "#ffffff" },
  "Purdue":                { bg: "#CEB888", text: "#000000" },
  "UCSF":                  { bg: "#052049", text: "#9ECEEE" },
  "UC Irvine":             { bg: "#0064A4", text: "#FFD200" },
  "UCSD":                  { bg: "#00629B", text: "#C69214" },
  "Arizona State":         { bg: "#8C1D40", text: "#FFC627" },
  "Arizona":               { bg: "#AB0520", text: "#0C234B" },
  "North Carolina":        { bg: "#4B9CD3", text: "#ffffff" },
  "Duke":                  { bg: "#003087", text: "#ffffff" },
  "Notre Dame":            { bg: "#0C2340", text: "#AE9142" },
  "Ohio State":            { bg: "#BA0C2F", text: "#666666" },
  "Texas":                 { bg: "#BF5700", text: "#ffffff" },
  "Florida":               { bg: "#0021A5", text: "#FA4616" },
  "Georgia":               { bg: "#BA0C2F", text: "#000000" },
  "Alabama":               { bg: "#9E1B32", text: "#ffffff" },
  "LSU":                   { bg: "#461D7C", text: "#FDD023" },
  "Penn State":            { bg: "#041E42", text: "#ffffff" },
  "Wisconsin":             { bg: "#C5050C", text: "#ffffff" },
  "Minnesota":             { bg: "#7A0019", text: "#FFCC33" },
  "Iowa":                  { bg: "#FFCD00", text: "#000000" },
  "Nebraska":              { bg: "#E41C38", text: "#ffffff" },
  "Louisville":            { bg: "#AD0000", text: "#ffffff" },
  "UMass Amherst":         { bg: "#881C1C", text: "#ffffff" },
  "West Virginia":         { bg: "#002855", text: "#EAAA00" },
};

function getSchoolStyle(university: string): { bg: string; text: string } {
  if (SCHOOL_COLORS[university]) return SCHOOL_COLORS[university];
  // Generate a consistent color from the university name
  let hash = 0;
  for (let i = 0; i < university.length; i++) {
    hash = university.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 65%, 35%)`, text: "#ffffff" };
}

function createSchoolIcon(university: string): L.DivIcon {
  const letter = university.trim()[0]?.toUpperCase() ?? "?";
  const { bg, text } = getSchoolStyle(university);
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${bg};
        color: ${text};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        font-family: Georgia, serif;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.3);
      ">
        <span style="transform: rotate(45deg); display: block;">${letter}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

export default function MapPage() {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Record<number, L.Marker>>({});

  // Refetch sightings when a specific sighting is selected to ensure data is fresh
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const id = Number(params.get("selected"));
      if (Number.isInteger(id) && id > 0) {
        console.log("🔄 Invalidating sightings query for selectedSightingId:", id);
        queryClient.invalidateQueries({ queryKey: getListSightingsQueryKey({}) });
      }
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener("popstate", handleUrlChange);
    // Also call once on mount to handle direct navigation
    handleUrlChange();

    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [queryClient]);

  const { data: sightings } = useListSightings({}, {
    query: { queryKey: getListSightingsQueryKey({}) }
  });

  // Get the selected sighting ID from URL
  const getSelectedId = () => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("selected"));
    return Number.isInteger(id) && id > 0 ? id : undefined;
  };

  const selectedId = getSelectedId();

  // Fetch a single sighting if selected but not in the list
  const { data: selectedSighting } = useQuery({
    queryKey: ["sighting", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await fetch(`/api/sightings/${selectedId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedId && (!sightings || !sightings.find(s => s.id === selectedId)),
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([37.7749, -122.4194], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const markers = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersRef.current = markers;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current || !sightings || !mapInstanceRef.current) return;
    const markers = markersRef.current;
    const map = mapInstanceRef.current;
    markers.clearLayers();
    const markerById: Record<number, L.Marker> = {};

    // Recalculate selectedSightingId from current URL
    const params = new URLSearchParams(window.location.search);
    const selectedId = Number(params.get("selected"));
    const currentSelectedSightingId = Number.isInteger(selectedId) && selectedId > 0 ? selectedId : undefined;

    console.log("📍 Creating markers. Total sightings:", sightings.length);
    console.log("🎯 Looking for selectedSightingId:", currentSelectedSightingId);

    sightings.forEach(sighting => {
      if (sighting.latitude == null || sighting.longitude == null) return;
      const date = new Date(sighting.createdAt).toLocaleDateString();
      const { bg, text } = getSchoolStyle(sighting.university);
      const marker = L.marker([sighting.latitude, sighting.longitude], {
        icon: createSchoolIcon(sighting.university)
      }).bindPopup(`
        <div style="font-family: Georgia, serif; min-width: 160px;">
          <div style="
            background: ${bg};
            color: ${text};
            margin: -13px -20px 10px -20px;
            padding: 10px 16px;
            border-radius: 4px 4px 0 0;
            font-weight: bold;
            font-size: 15px;
          ">${sighting.university}</div>
          <p style="margin: 0; font-size: 12px; color: #888;">Spotted ${date}</p>
          ${sighting.spotterName ? `<p style="margin: 6px 0 0; font-size: 13px;">by <strong>${sighting.spotterName}</strong></p>` : ''}
          ${sighting.notes ? `<p style="margin: 6px 0 0; font-size: 13px; font-style: italic;">"${sighting.notes}"</p>` : ''}
        </div>
      `);
      markerById[sighting.id] = marker;
      markers.addLayer(marker);
    });

    markerByIdRef.current = markerById;
    console.log("✅ Marker map created. Sighting IDs available:", Object.keys(markerById).map(Number));

    // Check if we have a separately fetched selected sighting
    if (selectedId && selectedSighting && selectedSighting.latitude != null && selectedSighting.longitude != null) {
      console.log("🎯 Found separately fetched selected sighting:", selectedSighting.id);
      const { bg, text } = getSchoolStyle(selectedSighting.university);
      const selectedMarker = L.marker([selectedSighting.latitude, selectedSighting.longitude], {
        icon: createSchoolIcon(selectedSighting.university)
      }).bindPopup(`
        <div style="font-family: Georgia, serif; min-width: 160px;">
          <div style="
            background: ${bg};
            color: ${text};
            margin: -13px -20px 10px -20px;
            padding: 10px 16px;
            border-radius: 4px 4px 0 0;
            font-weight: bold;
            font-size: 15px;
          ">${selectedSighting.university}</div>
          <p style="margin: 0; font-size: 12px; color: #888;">Spotted ${new Date(selectedSighting.createdAt).toLocaleDateString()}</p>
          ${selectedSighting.spotterName ? `<p style="margin: 6px 0 0; font-size: 13px;">by <strong>${selectedSighting.spotterName}</strong></p>` : ''}
          ${selectedSighting.notes ? `<p style="margin: 6px 0 0; font-size: 13px; font-style: italic;">"${selectedSighting.notes}"</p>` : ''}
        </div>
      `);
      markerByIdRef.current[selectedSighting.id] = selectedMarker;
      markers.addLayer(selectedMarker);
      map.setView([selectedSighting.latitude, selectedSighting.longitude], 17);
      setTimeout(() => {
        selectedMarker.openPopup();
        console.log("📬 Popup opened for fetched sighting");
      }, 100);
    } else if (currentSelectedSightingId && markerById[currentSelectedSightingId]) {
      console.log("🎯 Found selected marker! Zooming and opening popup.");
      const selectedMarker = markerById[currentSelectedSightingId];
      const latLng = selectedMarker.getLatLng();
      console.log("📌 Marker location:", latLng);
      map.setView(latLng, 17);
      // Use a small timeout to ensure the popup renders properly
      setTimeout(() => {
        selectedMarker.openPopup();
        console.log("📬 Popup opened");
      }, 100);
    } else {
      console.log("❌ Selected marker NOT found. selectedSightingId:", currentSelectedSightingId, "Available IDs:", Object.keys(markerById));
    }
  }, [sightings, selectedSighting]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 z-0" />
    </div>
  );
}