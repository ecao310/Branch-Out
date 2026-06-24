import React from "react";
import { useGetSightingStats, getGetSightingStatsQueryKey, useGetRecentSightings, getGetRecentSightingsQueryKey, useListSightings, getListSightingsQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, User } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type SpotterStat = { spotterName: string | null; count: number };

function useSpotterStats() {
  return useQuery<SpotterStat[]>({
    queryKey: ["spotter-stats"],
    queryFn: async () => {
      const res = await fetch("/api/sightings/spotter-stats");
      if (!res.ok) throw new Error("Failed to fetch spotter stats");
      return res.json();
    },
  });
}

export default function StatsPage() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetSightingStats({
    query: { queryKey: getGetSightingStatsQueryKey() }
  });

  const { data: recent, isLoading: recentLoading } = useGetRecentSightings({
    query: { queryKey: getGetRecentSightingsQueryKey() }
  });

  // Full sightings list (used for leaderboard calculations and client-side batching)
  const { data: allSightings } = useListSightings({}, { query: { queryKey: getListSightingsQueryKey({}) } });

  const { data: spotters, isLoading: spottersLoading } = useSpotterStats();

  const handleSelectRecent = (id: number) => {
    console.log("👆 Clicked recent activity icon for sighting ID:", id);
    setLocation(`/map?selected=${id}`);
  };

  const maxCount = stats?.length ? Math.max(...stats.map(s => s.count)) : 1;
  const maxSpotterCount = spotters?.length ? Math.max(...spotters.map(s => s.count)) : 1;

  // batching state for categories
  const BATCH = 10;
  const [speciesVisible, setSpeciesVisible] = React.useState(BATCH);
  const [spottersVisible, setSpottersVisible] = React.useState(BATCH);

  // Leaderboard calculations
  const leaderboard = React.useMemo(() => {
    const sightings = allSightings || [];

    // helper: find most recent sighting id for a spotter
    const mostRecentIdFor = (name?: string | null) => {
      if (!name) return undefined;
      const s = sightings.filter(x => x.spotterName === name).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return s[0]?.id;
    };

    const topSpotter = spotters?.[0]?.spotterName ?? null;

    // hottest streak: count sightings per spotter in last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const counts24: Record<string, number> = {};
    sightings.forEach(s => {
      if (new Date(s.createdAt).getTime() >= cutoff && s.spotterName) {
        counts24[s.spotterName] = (counts24[s.spotterName] || 0) + 1;
      }
    });
    const hottestSpotter = Object.keys(counts24).sort((a, b) => counts24[b] - counts24[a])[0] ?? null;

    // longest streak: compute longest consecutive-day streak per spotter
    const bySpot: Record<string, Record<string, number>> = {};
    sightings.forEach(s => {
      if (!s.spotterName) return;
      const createdAt = new Date(s.createdAt);
      if (Number.isNaN(createdAt.getTime())) return;

      const day = createdAt.toISOString().slice(0, 10);
      bySpot[s.spotterName] = bySpot[s.spotterName] || {};

      const previousEarliest = bySpot[s.spotterName][day];
      if (previousEarliest === undefined || createdAt.getTime() < previousEarliest) {
        bySpot[s.spotterName][day] = createdAt.getTime();
      }
    });

    type StreakInfo = {
      longest: number;
      lastDayEarliest: number;
    };

    const longestStreakBySpot: Record<string, StreakInfo> = {};
    for (const [name, dayMap] of Object.entries(bySpot)) {
      const days = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b));
      let longest = 0;
      let current = 0;
      let currentLastDayEarliest = Number.POSITIVE_INFINITY;
      let bestLastDayEarliest = Number.POSITIVE_INFINITY;
      let prevDayStart: number | null = null;

      for (const [day, earliestTime] of days) {
        const dt = new Date(day + "T00:00:00Z");
        const dayStart = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());

        if (prevDayStart === null || dayStart !== prevDayStart + 24 * 60 * 60 * 1000) {
          current = 1;
          currentLastDayEarliest = earliestTime;
        } else {
          current += 1;
          currentLastDayEarliest = earliestTime;
        }

        if (
          current > longest ||
          (current === longest && currentLastDayEarliest < bestLastDayEarliest)
        ) {
          longest = current;
          bestLastDayEarliest = currentLastDayEarliest;
        }

        prevDayStart = dayStart;
      }

      longestStreakBySpot[name] = {
        longest,
        lastDayEarliest: bestLastDayEarliest,
      };
    }

    const longestSpotter = Object.keys(longestStreakBySpot)
      .sort((a, b) => {
        const aInfo = longestStreakBySpot[a];
        const bInfo = longestStreakBySpot[b];
        if (bInfo.longest !== aInfo.longest) return bInfo.longest - aInfo.longest;
        return aInfo.lastDayEarliest - bInfo.lastDayEarliest;
      })[0] ?? null;

    return {
      topSpotter,
      hottestSpotter,
      longestSpotter,
      longestStreak: longestSpotter ? longestStreakBySpot[longestSpotter].longest : 0,
      mostRecentIdFor,
    };
  }, [allSightings, spotters]);


  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stats</h1>
          <p className="text-muted-foreground mt-2">Which wildflowers are blooming most?</p>
        </div>

        {/* Top Leaderboard quick links */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Leaderboard</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Top Spotter</p>
                <button
                  className="text-sm font-medium"
                  onClick={() => {
                    const id = leaderboard.mostRecentIdFor(leaderboard.topSpotter);
                    if (id) setLocation(`/map?selected=${id}`);
                  }}
                >
                  {leaderboard.topSpotter ? `${leaderboard.topSpotter} 👑` : "—"}
                </button>
              </div>
              <div />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Hottest Streak (24h)</p>
                <button
                  className="text-sm font-medium"
                  onClick={() => {
                    const id = leaderboard.mostRecentIdFor(leaderboard.hottestSpotter);
                    if (id) setLocation(`/map?selected=${id}`);
                  }}
                >
                  {leaderboard.hottestSpotter ? `${leaderboard.hottestSpotter} 🔥` : "—"}
                </button>
              </div>
              <div />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <button
                  className="text-sm font-medium"
                  onClick={() => {
                    const id = leaderboard.mostRecentIdFor(leaderboard.longestSpotter);
                    if (id) setLocation(`/map?selected=${id}`);
                  }}
                >
                  {leaderboard.longestSpotter ? `${leaderboard.longestSpotter} (${leaderboard.longestStreak}d) 🏆` : "—"}
                </button>
              </div>
              <div />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Top Flowers</h2>
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
                <>
                  {(stats ?? []).slice(0, speciesVisible).map((stat) => {
                    const rank = (stats ?? []).findIndex(s => s.species === stat.species) + 1;
                    return (
                      <div key={stat.species} className="relative">
                        <div className="flex justify-between items-center mb-1 text-sm font-medium z-10 relative px-2">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground w-4">{rank}.</span>
                            {stat.species}
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
                    );
                  })}
                  {(stats?.length ?? 0) > speciesVisible && (
                    <div className="mt-4 flex justify-center">
                      <button onClick={() => setSpeciesVisible(c => Math.min(stats?.length ?? 0, c + BATCH))} className="px-3 py-1 rounded-md bg-primary text-white">See more</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Top Spotters</h2>
            </div>

            <div className="space-y-4">
              {spottersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))
              ) : !spotters?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No named spotters yet. Add your name when logging!
                </div>
              ) : (
                <>
                  {spotters.slice(0, spottersVisible).map((spotter) => {
                    const rank = spotters.findIndex(s => s.spotterName === spotter.spotterName) + 1;
                    return (
                      <div key={spotter.spotterName} className="relative">
                        <div className="flex justify-between items-center mb-1 text-sm font-medium z-10 relative px-2">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground w-4">{rank}.</span>
                            {spotter.spotterName}
                          </span>
                          <span>{spotter.count} {spotter.count === 1 ? "sighting" : "sightings"}</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${(spotter.count / maxSpotterCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {spotters.length > spottersVisible && (
                    <div className="mt-4 flex justify-center">
                      <button onClick={() => setSpottersVisible(c => Math.min(spotters.length, c + BATCH))} className="px-3 py-1 rounded-md bg-primary text-white">See more</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>

        {/* Recent Activity moved to its own tab */}

      </div>
    </div>
  );
}
