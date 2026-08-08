import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { getMatchById, getMatchPlayers, MatchData, MatchPlayerData } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";

export default function LineupsPage() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match") || searchParams.get("match_id");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<MatchPlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchAndPlayers = useCallback(async () => {
    if (!matchId) return;
    try {
      const [m, p] = await Promise.all([
        getMatchById(matchId),
        getMatchPlayers(matchId)
      ]);

      if (m) {
        setMatch(m);
        setError(null);
      } else {
        setError("Match not found");
      }
      setPlayers(p);
    } catch (err) {
      console.error("Error fetching lineups:", err);
      setError("Error loading lineups");
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

    fetchMatchAndPlayers();
    const interval = setInterval(fetchMatchAndPlayers, 3000);

    let channel: any;
    if (supabase) {
      channel = supabase
        .channel(`lineups_${matchId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          () => fetchMatchAndPlayers()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` },
          () => fetchMatchAndPlayers()
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, fetchMatchAndPlayers]);

  if (loading || error || !match || !match.show_lineups) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  const team1Starters = players.filter(p => p.team === 1 && p.is_on_field);
  const team1Subs = players.filter(p => p.team === 1 && !p.is_on_field);
  const team2Starters = players.filter(p => p.team === 2 && p.is_on_field);
  const team2Subs = players.filter(p => p.team === 2 && !p.is_on_field);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-8 font-display select-none overflow-hidden">
      {/* Broadcast Lineup Presentation Graphic */}
      <div className="w-full max-w-5xl bg-[#07090F]/95 backdrop-blur-3xl border border-white/20 rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white pointer-events-auto animate-goal-flash">
        {/* Header with Teams & Title */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-2xl font-black tracking-wider uppercase text-white font-display">
              ОФІЦІЙНІ СКЛАДИ КОМАНД
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            <span>KS TV MATCH CENTER</span>
          </div>
        </div>

        {/* Two-Column Lineup Display */}
        <div className="grid grid-cols-2 gap-8">
          {/* Team 1 Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-blue-500/40">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                style={{ backgroundColor: match.team1_color || '#2563eb' }}
              >
                {match.team1_name ? match.team1_name.slice(0, 1) : '1'}
              </div>
              <h3 className="text-lg font-black text-white truncate">{match.team1_name}</h3>
            </div>

            {/* Starters */}
            <div className="space-y-1.5 max-h-72 overflow-hidden">
              {team1Starters.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 font-mono font-bold text-blue-400">{p.player_number || '-'}</span>
                    <span className="font-semibold text-white">{p.player_name}</span>
                  </div>
                  {p.position && <span className="text-[10px] text-slate-400 font-mono">{p.position}</span>}
                </div>
              ))}
            </div>

            {/* Substitutes */}
            {team1Subs.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Запасні:</div>
                <div className="text-xs text-slate-300 truncate">
                  {team1Subs.map(s => s.player_name).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Team 2 Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-amber-500/40">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                style={{ backgroundColor: match.team2_color || '#d97706' }}
              >
                {match.team2_name ? match.team2_name.slice(0, 1) : '2'}
              </div>
              <h3 className="text-lg font-black text-white truncate">{match.team2_name}</h3>
            </div>

            {/* Starters */}
            <div className="space-y-1.5 max-h-72 overflow-hidden">
              {team2Starters.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 font-mono font-bold text-amber-400">{p.player_number || '-'}</span>
                    <span className="font-semibold text-white">{p.player_name}</span>
                  </div>
                  {p.position && <span className="text-[10px] text-slate-400 font-mono">{p.position}</span>}
                </div>
              ))}
            </div>

            {/* Substitutes */}
            {team2Subs.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Запасні:</div>
                <div className="text-xs text-slate-300 truncate">
                  {team2Subs.map(s => s.player_name).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
