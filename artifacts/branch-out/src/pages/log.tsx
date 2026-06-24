import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCreateSighting, getListSightingsQueryKey, getGetRecentSightingsQueryKey, getGetSightingStatsQueryKey } from "@workspace/api-client-react";
import { FLOWERS as STATIC_SPECIES } from "@/lib/flowers";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import L from "leaflet";

const SPOTTER_NAME_KEY = "branch-out-name";
const SPECIES_QUERY_KEY = ["species"];

function useSpecies() {
  return useQuery<string[]>({
    queryKey: SPECIES_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/species");
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: STATIC_SPECIES,
  });
}

const formSchema = z.object({
  spotterName: z.string().optional(),
  species: z.string().min(1, "Please select a flower"),
  photoUrl: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationMapProps {
  coords: { lat: number; lng: number };
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
}

function LocationMap({ coords, onCoordsChange }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      zoomControl: true,

      // IMPORTANT FIX
      scrollWheelZoom: "center",
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Only commit coordinates after ALL movement finishes
    map.on("moveend", () => {
      const center = map.getCenter();

      prevCoordsRef.current = {
        lat: center.lat,
        lng: center.lng,
      };

      onCoordsChange({
        lat: center.lat,
        lng: center.lng,
      });
    });

    // Allow mouse clicks as well as drag/pan to choose a new location.
    map.on("click", (event) => {
      const { lat, lng } = event.latlng;
      prevCoordsRef.current = { lat, lng };
      map.panTo([lat, lng]);
      onCoordsChange({ lat, lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // If coords change externally (e.g. re-locate button), pan map there without changing zoom
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const prev = prevCoordsRef.current;

    // Only re-center for EXTERNAL location updates
    if (
      !prev ||
      Math.abs(prev.lat - coords.lat) > 0.00001 ||
      Math.abs(prev.lng - coords.lng) > 0.00001
    ) {
      mapInstanceRef.current.panTo([coords.lat, coords.lng]);
    }

    prevCoordsRef.current = coords;
  }, []);

  return (
    <div
      style={{
        position: "relative",
        height: "220px",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
      }}
      className="border border-border"
    >
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />

      {/* Fixed screen-space crosshair */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "32px",
          height: "32px",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "2px",
            background: "#ef4444",
            transform: "translateY(-50%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#ef4444",
            transform: "translateX(-50%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#ef4444",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 3px white, 0 0 0 5px #ef4444",
          }}
        />
      </div>
    </div>
  );
}

export default function LogPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  const { data: species = STATIC_SPECIES } = useSpecies();
  const createSighting = useCreateSighting();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      spotterName: localStorage.getItem(SPOTTER_NAME_KEY) ?? "",
      species: "",
      photoUrl: "",
      notes: "",
    },
  });

  const getLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setLocationError("Unable to retrieve your location. Please allow location access.");
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const onSubmit = (data: FormValues) => {
    const name = data.spotterName?.trim() || null;
    if (name) {
      localStorage.setItem(SPOTTER_NAME_KEY, name);
    } else {
      localStorage.removeItem(SPOTTER_NAME_KEY);
    }

    createSighting.mutate(
      {
        data: {
          species: data.species,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: data.notes || null,
          photoUrl: data.photoUrl?.trim() || null,
          spotterName: name,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Flower logged!",
            description: `Successfully logged a ${data.species} sighting.`,
          });

          queryClient.invalidateQueries({ queryKey: getListSightingsQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetRecentSightingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSightingStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: SPECIES_QUERY_KEY });

          setLocation("/map");
        },
        onError: () => {
          toast({
            title: "Failed to log flower",
            description: "There was an error saving your sighting. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedSpecies = form.watch("species");
  const trimmedSearch = searchValue.trim();
  const isCustomValue =
    trimmedSearch.length > 0 &&
    !species.some((s) => s.toLowerCase() === trimmedSearch.toLowerCase());

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log a Flower</h1>
          <p className="text-muted-foreground mt-2">Spotted a wildflower in bloom? Record it here!</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField
                control={form.control}
                name="spotterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Alex" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Flower Species</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Select flower"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                        <Command>
                          <CommandInput
                            placeholder="Search or type a flower..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {trimmedSearch.length > 0 ? (
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  onClick={() => {
                                    form.setValue("species", trimmedSearch, { shouldValidate: true });
                                    setSearchValue("");
                                    setOpen(false);
                                  }}
                                >
                                  Add "<span className="font-semibold">{trimmedSearch}</span>"
                                </button>
                              ) : (
                                <p className="px-4 py-2 text-sm">No flower found.</p>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {species.map((flower) => (
                                <CommandItem
                                  value={flower}
                                  key={flower}
                                  onSelect={() => {
                                    form.setValue("species", flower, { shouldValidate: true });
                                    setSearchValue("");
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      flower === selectedSpecies ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {flower}
                                </CommandItem>
                              ))}
                              {isCustomValue && (
                                <CommandItem
                                  value={`__add__${trimmedSearch}`}
                                  onSelect={() => {
                                    form.setValue("species", trimmedSearch, { shouldValidate: true });
                                    setSearchValue("");
                                    setOpen(false);
                                  }}
                                >
                                  <span className="text-primary font-medium">Add "{trimmedSearch}"</span>
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <label className="text-sm font-medium leading-none">Location</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 items-center">
                    <Button
                      type="button"
                      variant={coords ? "outline" : "default"}
                      onClick={getLocation}
                      disabled={isLocating}
                      className="flex-1 flex gap-2 items-center justify-center"
                    >
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : coords ? (
                        <MapPin className="h-4 w-4 text-primary" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                      {isLocating ? "Getting location..." : coords ? "Location Acquired" : "Get Current Location"}
                    </Button>
                    {coords && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setCoords(null);
                          setLocationError(null);
                        }}
                        aria-label="Remove location"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {coords && (
                    <>
                      <LocationMap coords={coords} onCoordsChange={setCoords} />
                      <p className="text-xs text-muted-foreground text-center">
                        Drag the map to adjust · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </p>
                    </>
                  )}

                  {locationError && (
                    <p className="text-xs text-destructive text-center">{locationError}</p>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/my-flower.jpg" {...field} />
                    </FormControl>
                    {field.value && /^https?:\/\//.test(field.value) && (
                      <img
                        src={field.value}
                        alt="Flower preview"
                        className="mt-2 w-full h-40 object-cover rounded-md border"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. A whole patch blooming along the creek trail!"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold"
                size="lg"
                disabled={createSighting.isPending}
              >
                {createSighting.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {createSighting.isPending ? "Uploading..." : "Confirm"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
