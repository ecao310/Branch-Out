import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateSighting, getListSightingsQueryKey, getGetRecentSightingsQueryKey, getGetSightingStatsQueryKey } from "@workspace/api-client-react";
import { UNIVERSITIES } from "@/lib/universities";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const formSchema = z.object({
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
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const createSighting = useCreateSighting();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError("Unable to retrieve your location. Please allow location access.");
        setIsLocating(false);
      }
    );
  };

  const onSubmit = (data: FormValues) => {
    if (!coords) {
      toast({
        title: "Location required",
        description: "Please get your current location first.",
        variant: "destructive"
      });
      return;
    }

    createSighting.mutate(
      { 
        data: {
          university: data.university,
          latitude: coords.lat,
          longitude: coords.lng,
          notes: data.notes || null,
        }
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
          
          setLocation("/");
        },
        onError: () => {
          toast({
            title: "Failed to log sighting",
            description: "There was an error saving your sighting. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Sighting</h1>
          <p className="text-muted-foreground mt-2">Spot someone wearing college gear? Log it here!</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="university"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>University</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? UNIVERSITIES.find(
                                  (university) => university === field.value
                                )
                              : "Select university"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search university..." />
                          <CommandList>
                            <CommandEmpty>No university found.</CommandEmpty>
                            <CommandGroup>
                              {UNIVERSITIES.map((university) => (
                                <CommandItem
                                  value={university}
                                  key={university}
                                  onSelect={() => {
                                    form.setValue("university", university);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      university === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {university}
                                </CommandItem>
                              ))}
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
                <FormLabel>Location</FormLabel>
                <div className="flex flex-col gap-2">
                  <Button 
                    type="button" 
                    variant={coords ? "outline" : "default"} 
                    onClick={getLocation}
                    disabled={isLocating}
                    className="w-full flex gap-2 items-center justify-center"
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
                disabled={createSighting.isPending || !coords}
              >
                {createSighting.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {createSighting.isPending ? "Logging..." : "Log Sighting"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}