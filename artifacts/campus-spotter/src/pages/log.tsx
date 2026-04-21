import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCreateSighting, getListSightingsQueryKey, getGetRecentSightingsQueryKey, getGetSightingStatsQueryKey } from "@workspace/api-client-react";
import { UNIVERSITIES as STATIC_UNIVERSITIES } from "@/lib/universities";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const SPOTTER_NAME_KEY = "campus-spotter-name";
const UNIVERSITIES_QUERY_KEY = ["universities"];

function useUniversities() {
  return useQuery<string[]>({
    queryKey: UNIVERSITIES_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/universities");
      if (!res.ok) throw new Error("Failed to fetch universities");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: STATIC_UNIVERSITIES,
  });
}

const formSchema = z.object({
  spotterName: z.string().optional(),
  university: z.string().min(1, "Please select a university"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LogPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  const { data: universities = STATIC_UNIVERSITIES } = useUniversities();
  const createSighting = useCreateSighting();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      spotterName: localStorage.getItem(SPOTTER_NAME_KEY) ?? "",
      university: "",
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
          university: data.university,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: data.notes || null,
          spotterName: name,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Sighting logged!",
            description: `Successfully logged sighting for ${data.university}.`,
          });

          queryClient.invalidateQueries({ queryKey: getListSightingsQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetRecentSightingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSightingStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: UNIVERSITIES_QUERY_KEY });

          setLocation("/map");
        },
        onError: () => {
          toast({
            title: "Failed to log sighting",
            description: "There was an error saving your sighting. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedUniversity = form.watch("university");
  const trimmedSearch = searchValue.trim();
  const isCustomValue =
    trimmedSearch.length > 0 &&
    !universities.some((u) => u.toLowerCase() === trimmedSearch.toLowerCase());

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Sighting</h1>
          <p className="text-muted-foreground mt-2">Spot someone wearing college gear? Log it here!</p>
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
                name="university"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>University</FormLabel>
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
                            {field.value || "Select university"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                        <Command>
                          <CommandInput
                            placeholder="Search or type a university..."
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
                                    form.setValue("university", trimmedSearch, { shouldValidate: true });
                                    setSearchValue("");
                                    setOpen(false);
                                  }}
                                >
                                  Add "<span className="font-semibold">{trimmedSearch}</span>"
                                </button>
                              ) : (
                                <p className="px-4 py-2 text-sm">No university found.</p>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {universities.map((university) => (
                                <CommandItem
                                  value={university}
                                  key={university}
                                  onSelect={() => {
                                    form.setValue("university", university, { shouldValidate: true });
                                    setSearchValue("");
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      university === selectedUniversity ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {university}
                                </CommandItem>
                              ))}
                              {isCustomValue && (
                                <CommandItem
                                  value={`__add__${trimmedSearch}`}
                                  onSelect={() => {
                                    form.setValue("university", trimmedSearch, { shouldValidate: true });
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
                <div className="flex flex-col gap-2">
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
                    <p className="text-xs text-muted-foreground text-center">
                      Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                    </p>
                  )}
                  {locationError && (
                    <p className="text-xs text-destructive text-center">{locationError}</p>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Saw a Michigan hat at a coffee shop in Tokyo!"
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
