import React from "react";
import { useListSightings } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentPage() {
  const [, setLocation] = useLocation();
  const { data: allSightings, isLoading } = useListSightings();

  // client-side batching
  const BATCH = 10;
  const [visibleCount, setVisibleCount] = React.useState(BATCH);

  const sightings = (allSightings || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visible = sightings.slice(0, visibleCount);

  const loadMore = () => setVisibleCount(c => Math.min(sightings.length, c + BATCH));

  const handleSelect = (id: number) => setLocation(`/map?selected=${id}`);

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Activity</h1>
          <p className="text-muted-foreground mt-2">Latest sightings across campus.</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : sightings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground col-span-2">No recent activity.</div>
            ) : (
              visible.map(sighting => (
                <div key={sighting.id} className="flex gap-4 items-start">
                  <button
                    type="button"
                    onClick={() => handleSelect(sighting.id)}
                    className="bg-primary/10 p-2 rounded-full text-primary shrink-0 hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label={`Show ${sighting.university} sighting on map`}
                  >
                    <MapPin className="h-5 w-5" />
                  </button>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      <span className="font-bold">{sighting.spotterName ?? "Someone"}</span>
                      {" spotted "}
                      <span className="font-bold">{sighting.university}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(sighting.createdAt), { addSuffix: true })}</p>
                    {sighting.notes && (
                      <p className="text-sm mt-2 text-foreground/80 bg-muted/50 p-2 rounded-md">"{sighting.notes}"</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {sightings.length > visible.length && (
            <div className="mt-6 flex justify-center">
              <button onClick={loadMore} className="px-4 py-2 rounded-md bg-primary text-white">See more</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
