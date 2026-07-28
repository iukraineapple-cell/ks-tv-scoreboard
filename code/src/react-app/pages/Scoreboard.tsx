import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";

interface Match {
  id: number;
  team1_name: string;
  team2_name: string;
  team1_logo_url: string | null;
  team2_logo_url: string | null;
  team1_score: number;
  team2_score: number;
  timer_duration: number;
  current_time: number;
  is_timer_running: boolean;
  current_half: number;
  design_theme: string;
  is_visible: boolean;
  half_time_offset: number;
}

export default function Scoreboard() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match_id");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();

      if (data.success) {
        setMatch(data.data);
        setError(null);
      } else {
        setError("Match not found");
      }
    } catch (error) {
      console.error("Error fetching match:", error);
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
    const interval = setInterval(fetchMatch, 1000);
    return () => clearInterval(interval);
  }, [matchId, fetchMatch]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getDisplayTime = (match: Match): number => {
    if (match.current_half === 2) {
      return match.current_time + (match.half_time_offset || match.timer_duration);
    }
    return match.current_time;
  };

  const shortName = (name: string) => name.slice(0, 3).toUpperCase();

  if (loading) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  if (error || !match || !match.is_visible) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-center">
      {/* Табло */}
      <div className="absolute top-6 flex flex-col items-center">
        {/* Main Box */}
        <div className="flex items-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-md shadow-2xl border border-white/20 overflow-hidden">
          {/* Left Team */}
          <div className="flex items-center space-x-2 px-4 py-2 min-w-[120px] justify-end">
            {match.team1_logo_url ? (
              <img
                src={match.team1_logo_url}
                alt={match.team1_name}
                className="w-8 h-8 object-cover"
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
          <div className="flex items-center bg-black/70 px-6 py-2 mx-2 rounded-md shadow-inner">
            <span className="text-white font-extrabold text-2xl">
              {match.team1_score}
            </span>
            <span className="text-gray-300 font-bold text-xl mx-2">-</span>
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
                className="w-8 h-8 object-cover"
              />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white text-xs font-bold">
                {shortName(match.team2_name)}
              </div>
            )}
          </div>

          {/* Timer & KS Logo */}
          <div className="relative flex items-center bg-gray-900 px-4 py-2 ml-3 border-l border-white/20">
            <img
              src="https://ksliga.com/images/ks-logo.png"
              alt="KS Logo"
              className="w-0 h-0 mr-3"
            />
            <div
              className={`text-white font-mono font-bold text-lg ${
                match.is_timer_running ? "animate-pulse" : ""
              }`}
            >
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
