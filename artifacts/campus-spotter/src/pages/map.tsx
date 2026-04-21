import { useEffect, useRef } from "react";
import L from "leaflet";
import { useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";

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
      const marker = L.marker([sighting.latitude, sighting.longitude])
        .bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-lg m-0">${sighting.university}</h3>
            <p class="text-sm text-gray-500 m-0 mt-1">Spotted on ${date}</p>
            ${sighting.notes ? `<p class="text-sm mt-2">${sighting.notes}</p>` : ''}
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
