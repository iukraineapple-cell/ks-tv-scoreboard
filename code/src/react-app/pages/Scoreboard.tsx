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
    const interval = setInterval(fetchMatch, 1500);

    // Supabase Realtime subscription for instant zero-latency updates
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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateCurrentTime = useCallback((m: MatchData): number => {
    if (!m.is_timer_running || !m.timer_start_timestamp || m.timer_server_time === null || m.timer_server_time === undefined) {
      return m.current_time;
    }
    
    const now = Date.now() / 1000;
    const elapsed = now - m.timer_start_timestamp;
    const calculatedTime = Math.round(m.timer_server_time + elapsed);
    
    return Math.min(calculatedTime, m.timer_duration);
  }, []);

  const getDisplayTime = (m: MatchData): number => {
    const currentTime = calculateCurrentTime(m);
    if (m.current_half === 2) {
      return currentTime + (m.half_time_offset || m.timer_duration);
    }
    return currentTime;
  };

  const shortName = (name: string) => {
    if (!name) return "---";
    return name.length > 4 ? name.slice(0, 3).toUpperCase() : name.toUpperCase();
  };

  if (loading || error || !match || !match.is_visible) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  // Positioning classes
  const positionClass = 
    match.scoreboard_position === 'top-left' ? 'top-6 left-6' :
    match.scoreboard_position === 'top-right' ? 'top-6 right-6' :
    match.scoreboard_position === 'bottom-center' ? 'bottom-6 left-1/2 -translate-x-1/2' :
    'top-6 left-1/2 -translate-x-1/2';

  const style = match.scoreboard_style || 'champions';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-display">
      {/* Positioned Overlay Container */}
      <div className={`absolute ${positionClass} flex flex-col items-center pointer-events-auto transition-all duration-300`}>
        
        {/* Style 1: Champions Glass (Ultra-modern luxury) */}
        {style === 'champions' && (
          <div className="flex items-stretch bg-[#080B14]/90 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.15] overflow-hidden text-white">
            {/* Team 1 Section */}
            <div className="flex items-center space-x-2.5 px-4 py-2.5 min-w-[130px] justify-end bg-gradient-to-r from-white/[0.04] to-transparent">
              <span className="font-extrabold text-sm sm:text-base tracking-tight">{shortName(match.team1_name)}</span>
              {match.team1_logo_url ? (
                <img src={match.team1_logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
              ) : (
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shadow"
                  style={{ backgroundColor: match.team1_color || '#2563eb' }}
                >
                  {match.team1_name ? match.team1_name.slice(0, 1) : '1'}
                </div>
              )}
            </div>

            {/* Score Center Console */}
            <div className="flex items-center bg-black/85 px-4 py-2 border-x border-white/[0.1] font-mono font-black text-xl sm:text-2xl tracking-tighter">
              <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{match.team1_score}</span>
              <span className="text-slate-500 mx-2 text-base font-normal">:</span>
              <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">{match.team2_score}</span>
            </div>

            {/* Team 2 Section */}
            <div className="flex items-center space-x-2.5 px-4 py-2.5 min-w-[130px] justify-start bg-gradient-to-l from-white/[0.04] to-transparent">
              {match.team2_logo_url ? (
                <img src={match.team2_logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
              ) : (
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shadow"
                  style={{ backgroundColor: match.team2_color || '#d97706' }}
                >
                  {match.team2_name ? match.team2_name.slice(0, 1) : '2'}
                </div>
              )}
              <span className="font-extrabold text-sm sm:text-base tracking-tight">{shortName(match.team2_name)}</span>
            </div>

            {/* Master Clock & Period Pill */}
            <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-amber-500 text-slate-950 font-black font-mono text-sm border-l border-amber-400/40">
              <span>{formatTime(getDisplayTime(match))}</span>
              <span className="text-[11px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                {match.current_half === 1 ? '1T' : '2T'}
              </span>
            </div>
          </div>
        )}

        {/* Style 2: Premier Pro (Matte contrast) */}
        {style === 'premier' && (
          <div className="flex items-stretch bg-slate-950 rounded-xl shadow-2xl border-2 border-white/20 overflow-hidden text-white font-heading">
            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-900">
              <span className="font-black text-sm">{shortName(match.team1_name)}</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white text-slate-950 font-mono font-black text-xl">
              <span>{match.team1_score} - {match.team2_score}</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-900">
              <span className="font-black text-sm">{shortName(match.team2_name)}</span>
            </div>
            <div className="flex items-center px-3 py-2 bg-blue-600 font-mono font-bold text-xs text-white">
              {formatTime(getDisplayTime(match))}
            </div>
          </div>
        )}

        {/* Style 3: Cyber Neon */}
        {style === 'cyber' && (
          <div className="flex items-stretch bg-[#04060C] rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-500/50 overflow-hidden text-white">
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-950/40">
              <span className="font-black text-sm text-cyan-300">{shortName(match.team1_name)}</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-black font-mono font-black text-2xl text-yellow-400">
              <span>{match.team1_score}:{match.team2_score}</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-amber-950/40">
              <span className="font-black text-sm text-amber-300">{shortName(match.team2_name)}</span>
            </div>
            <div className="flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 font-mono font-black text-sm">
              {formatTime(getDisplayTime(match))}
            </div>
          </div>
        )}

        {/* Dynamic Broadcast Alert Banner (GOAL, VAR, ADDED TIME, CARDS) */}
        {match.show_notification && match.current_notification_text && (
          <div className="mt-2.5 px-5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white font-extrabold text-xs uppercase tracking-widest shadow-[0_10px_25px_rgba(225,29,72,0.6)] animate-goal-flash border border-white/30 text-center">
            {match.current_notification_text}
          </div>
        )}
      </div>
    </div>
  );
}
