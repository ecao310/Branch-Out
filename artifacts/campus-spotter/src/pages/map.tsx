import { useEffect, useRef } from "react";
import L from "leaflet";
import { useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const { data: sightings } = useListSightings({}, {
    query: { queryKey: getListSightingsQueryKey({}) }
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
    if (!markersRef.current || !sightings) return;
    const markers = markersRef.current;
    markers.clearLayers();
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
      markers.addLayer(marker);
    });
  }, [sightings]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 z-0" />
    </div>
  );
}