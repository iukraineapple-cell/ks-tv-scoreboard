import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { getMatchById, MatchData } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";

export default function Scoreboard() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match") || searchParams.get("match_id");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await getMatchById(matchId);
      if (data) {
        setMatch(data);
        setError(null);
      } else {
        setError("Match not found");
      }
    } catch (err) {
      console.error("Error fetching match:", err);
      setError("Error loading scoreboard");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setError("Match ID required");
      setLoading(false);
      return;
    }

    fetchMatch();
    const interval = setInterval(fetchMatch, 2000);

    // Supabase Realtime subscription for instant updates
    let channel: any;
    if (supabase) {
      channel = supabase
        .channel(`match_${matchId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          (payload: any) => {
            if (payload.new) {
              setMatch(payload.new as MatchData);
            }
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, fetchMatch]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getDisplayTime = (m: MatchData): number => {
    if (m.current_half === 2) {
      return m.current_time + (m.half_time_offset || m.timer_duration);
    }
    return m.current_time;
  };

  const shortName = (name: string) => (name ? name.slice(0, 3).toUpperCase() : "---");

  if (loading || error || !match || !match.is_visible) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-center">
      {/* Scoreboard Overlay */}
      <div className="absolute top-6 flex flex-col items-center">
        <div className="flex items-center bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 rounded-md shadow-2xl border border-white/20 overflow-hidden">
          {/* Left Team */}
          <div className="flex items-center space-x-2 px-4 py-2 min-w-[120px] justify-end">
            {match.team1_logo_url ? (
              <img
                src={match.team1_logo_url}
                alt={match.team1_name}
                className="w-8 h-8 object-cover rounded"
              />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white text-xs font-bold">
                {shortName(match.team1_name)}
              </div>
            )}
            <span className="text-white font-bold text-lg">
              {shortName(match.team1_name)}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center bg-black/80 px-6 py-2 mx-2 rounded-md shadow-inner">
            <span className="text-white font-extrabold text-2xl">
              {match.team1_score}
            </span>
            <span className="text-gray-400 font-bold text-xl mx-2">-</span>
            <span className="text-white font-extrabold text-2xl">
              {match.team2_score}
            </span>
          </div>

          {/* Right Team */}
          <div className="flex items-center space-x-2 px-4 py-2 min-w-[120px] justify-start">
            <span className="text-white font-bold text-lg">
              {shortName(match.team2_name)}
            </span>
            {match.team2_logo_url ? (
              <img
                src={match.team2_logo_url}
                alt={match.team2_name}
                className="w-8 h-8 object-cover rounded"
              />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white text-xs font-bold">
                {shortName(match.team2_name)}
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="relative flex items-center bg-gray-900 px-4 py-2 ml-3 border-l border-white/20">
            <div className="text-white font-mono font-bold text-lg">
              {formatTime(getDisplayTime(match))}
            </div>
            <div className="ml-3 text-blue-400 font-bold text-sm">
              {match.current_half === 1 ? "1T" : "2T"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
