import { useEffect, useRef } from "react";
import L from "leaflet";
import { useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

// Flower colors map - representative bloom colors for common wildflowers
const FLOWER_COLORS: Record<string, { bg: string; text: string }> = {
  "Black-eyed Susan":  { bg: "#F2B705", text: "#3a2d00" },
  "Bluebell":          { bg: "#5B6EE1", text: "#ffffff" },
  "Bluebonnet":        { bg: "#2D3A8C", text: "#ffffff" },
  "Buttercup":         { bg: "#F7D002", text: "#3a2d00" },
  "California Poppy":  { bg: "#F28C0F", text: "#ffffff" },
  "Cardinal Flower":   { bg: "#C1121F", text: "#ffffff" },
  "Chicory":           { bg: "#7B9AE0", text: "#ffffff" },
  "Columbine":         { bg: "#6A4C93", text: "#ffffff" },
  "Coneflower":        { bg: "#C45BAA", text: "#ffffff" },
  "Cornflower":        { bg: "#3D5ADF", text: "#ffffff" },
  "Cosmos":            { bg: "#E26DA5", text: "#ffffff" },
  "Dandelion":         { bg: "#FFD500", text: "#3a2d00" },
  "Evening Primrose":  { bg: "#F6E05E", text: "#3a2d00" },
  "Fireweed":          { bg: "#D6336C", text: "#ffffff" },
  "Forget-me-not":     { bg: "#7BAFD4", text: "#ffffff" },
  "Foxglove":          { bg: "#B5179E", text: "#ffffff" },
  "Goldenrod":         { bg: "#E8A800", text: "#3a2d00" },
  "Indian Paintbrush": { bg: "#E63916", text: "#ffffff" },
  "Iris":              { bg: "#5F4B8B", text: "#ffffff" },
  "Lupine":            { bg: "#5C6BC0", text: "#ffffff" },
  "Marigold":          { bg: "#F77F00", text: "#ffffff" },
  "Milkweed":          { bg: "#E59BB5", text: "#3a2d00" },
  "Morning Glory":     { bg: "#6A5ACD", text: "#ffffff" },
  "Phlox":             { bg: "#D988C4", text: "#ffffff" },
  "Poppy":             { bg: "#E03131", text: "#ffffff" },
  "Primrose":          { bg: "#F4C95D", text: "#3a2d00" },
  "Queen Anne's Lace": { bg: "#F1F1E6", text: "#3a2d00" },
  "Sunflower":         { bg: "#F4B400", text: "#3a2d00" },
  "Trillium":          { bg: "#F5F5F5", text: "#3a2d00" },
  "Violet":            { bg: "#7048E8", text: "#ffffff" },
  "Wild Aster":        { bg: "#9775FA", text: "#ffffff" },
  "Wild Bergamot":     { bg: "#B36AE2", text: "#ffffff" },
  "Wild Geranium":     { bg: "#D6699E", text: "#ffffff" },
  "Wild Rose":         { bg: "#F06595", text: "#ffffff" },
  "Yarrow":            { bg: "#FBEEC1", text: "#3a2d00" },
};

function getFlowerStyle(species: string): { bg: string; text: string } {
  if (FLOWER_COLORS[species]) return FLOWER_COLORS[species];
  // Generate a consistent color from the species name
  let hash = 0;
  for (let i = 0; i < species.length; i++) {
    hash = species.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 70%, 50%)`, text: "#ffffff" };
}

function createFlowerIcon(species: string): L.DivIcon {
  const { bg, text } = getFlowerStyle(species);
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
        font-size: 15px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.6);
      ">
        <span style="transform: rotate(45deg); display: block;">&#127802;</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function popupHtml(s: { species: string; createdAt: string | Date; spotterName?: string | null; notes?: string | null; photoUrl?: string | null }): string {
  const { bg, text } = getFlowerStyle(s.species);
  const date = new Date(s.createdAt).toLocaleDateString();
  return `
    <div style="font-family: Georgia, serif; min-width: 160px;">
      <div style="
        background: ${bg};
        color: ${text};
        margin: -13px -20px 10px -20px;
        padding: 10px 16px;
        border-radius: 4px 4px 0 0;
        font-weight: bold;
        font-size: 15px;
      ">${s.species}</div>
      ${s.photoUrl ? `<img src="${s.photoUrl}" alt="${s.species}" style="width:100%;height:110px;object-fit:cover;border-radius:4px;margin-bottom:8px;" onerror="this.style.display='none'" />` : ''}
      <p style="margin: 0; font-size: 12px; color: #888;">Spotted ${date}</p>
      ${s.spotterName ? `<p style="margin: 6px 0 0; font-size: 13px;">by <strong>${s.spotterName}</strong></p>` : ''}
      ${s.notes ? `<p style="margin: 6px 0 0; font-size: 13px; font-style: italic;">"${s.notes}"</p>` : ''}
    </div>
  `;
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
    const map = L.map(mapRef.current).setView([42.3736, -71.1097], 12);
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
    const selectedIdNum = Number(params.get("selected"));
    const currentSelectedSightingId = Number.isInteger(selectedIdNum) && selectedIdNum > 0 ? selectedIdNum : undefined;

    sightings.forEach(sighting => {
      if (sighting.latitude == null || sighting.longitude == null) return;
      const marker = L.marker([sighting.latitude, sighting.longitude], {
        icon: createFlowerIcon(sighting.species)
      }).bindPopup(popupHtml(sighting));
      markerById[sighting.id] = marker;
      markers.addLayer(marker);
    });

    markerByIdRef.current = markerById;

    // Check if we have a separately fetched selected sighting
    if (selectedIdNum && selectedSighting && selectedSighting.latitude != null && selectedSighting.longitude != null) {
      const selectedMarker = L.marker([selectedSighting.latitude, selectedSighting.longitude], {
        icon: createFlowerIcon(selectedSighting.species)
      }).bindPopup(popupHtml(selectedSighting));
      markerByIdRef.current[selectedSighting.id] = selectedMarker;
      markers.addLayer(selectedMarker);
      map.setView([selectedSighting.latitude, selectedSighting.longitude], 17);
      setTimeout(() => {
        selectedMarker.openPopup();
      }, 100);
    } else if (currentSelectedSightingId && markerById[currentSelectedSightingId]) {
      const selectedMarker = markerById[currentSelectedSightingId];
      const latLng = selectedMarker.getLatLng();
      map.setView(latLng, 17);
      // Use a small timeout to ensure the popup renders properly
      setTimeout(() => {
        selectedMarker.openPopup();
      }, 100);
    }
  }, [sightings, selectedSighting]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 z-0" />
    </div>
  );
}
