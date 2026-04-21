import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";
import { UNIVERSITIES } from "@/lib/universities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedUni, setSelectedUni] = useState<string>("all");

  const { data: sightings, isLoading } = useListSightings({}, {
    query: { queryKey: getListSightingsQueryKey({}) }
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
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

    const filteredSightings = selectedUni === "all" 
      ? sightings 
      : sightings.filter(s => s.university === selectedUni);

    filteredSightings.forEach(sighting => {
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
  }, [sightings, selectedUni]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-[400] w-auto sm:w-80 bg-card/90 backdrop-blur-md p-4 rounded-xl shadow-lg border">
        <h2 className="font-bold text-lg mb-2">Filter Sightings</h2>
        <div className="flex gap-2">
          <Select value={selectedUni} onValueChange={setSelectedUni}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Universities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Universities</SelectItem>
              {UNIVERSITIES.map(uni => (
                <SelectItem key={uni} value={uni}>{uni}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedUni !== "all" && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedUni("all")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>{isLoading ? "Loading..." : `${sightings?.length || 0} total sightings`}</span>
        </div>
      </div>
    </div>
  );
}