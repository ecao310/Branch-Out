import { useGetSightingStats, getGetSightingStatsQueryKey, useGetRecentSightings, getGetRecentSightingsQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Trophy, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useGetSightingStats({
    query: { queryKey: getGetSightingStatsQueryKey() }
  });

  const { data: recent, isLoading: recentLoading } = useGetRecentSightings({
    query: { queryKey: getGetRecentSightingsQueryKey() }
  });

  // Calculate max count for the bar chart
  const maxCount = stats?.length ? Math.max(...stats.map(s => s.count)) : 1;

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground mt-2">Which university has the widest reach?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Top Universities</h2>
            </div>
            
            <div className="space-y-4">
              {statsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))
              ) : stats?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sightings yet. Be the first to log one!
                </div>
              ) : (
                stats?.map((stat, i) => (
                  <div key={stat.university} className="relative">
                    <div className="flex justify-between items-center mb-1 text-sm font-medium z-10 relative px-2">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        {stat.university}
                      </span>
                      <span>{stat.count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(stat.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Recent Activity</h2>
            </div>
            
            <div className="space-y-6">
              {recentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : recent?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity.
                </div>
              ) : (
                recent?.map(sighting => (
                  <div key={sighting.id} className="flex gap-4 items-start">
                    <div className="bg-primary/10 p-2 rounded-full text-primary shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Spotted <span className="font-bold">{sighting.university}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(sighting.createdAt), { addSuffix: true })}
                      </p>
                      {sighting.notes && (
                        <p className="text-sm mt-2 text-foreground/80 bg-muted/50 p-2 rounded-md">
                          "{sighting.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}