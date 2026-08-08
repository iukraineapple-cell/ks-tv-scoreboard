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
  const [animatedPlayers, setAnimatedPlayers] = useState<Set<number>>(new Set());

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

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

  const startPlayerAnimation = useCallback((playerList: MatchPlayerData[]) => {
    clearTimeouts();
    setAnimatedPlayers(new Set());

    const allPlayers = playerList.slice().sort((a, b) => {
      if (a.team !== b.team) return a.team - b.team;
      if (a.is_on_field !== b.is_on_field) return b.is_on_field ? 1 : -1;
      return (a.player_number || 999) - (b.player_number || 999);
    });

    allPlayers.forEach((player, index) => {
      const t = setTimeout(() => {
        setAnimatedPlayers(prev => new Set([...prev, player.id]));
      }, index * 80);
      timeoutsRef.current.push(t);
    });
  }, []);

  useEffect(() => {
    if (!matchId) {
      setError("Match ID required");
      setLoading(false);
      return;
    }

    fetchMatchAndPlayers();
    const interval = setInterval(fetchMatchAndPlayers, 3000);

    // Supabase Realtime subscription
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
      clearTimeouts();
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, fetchMatchAndPlayers]);

  useEffect(() => {
    if (match?.show_lineups && players.length > 0 && !loading) {
      startPlayerAnimation(players);
    }
  }, [match?.show_lineups, players.length, loading, startPlayerAnimation]);

  if (loading || error || !match || !match.is_visible || !match.show_lineups) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  const team1Starters = players.filter(p => p.team === 1 && p.is_on_field).slice(0, 11);
  const team1Subs = players.filter(p => p.team === 1 && !p.is_on_field).slice(0, 9);
  const team2Starters = players.filter(p => p.team === 2 && p.is_on_field).slice(0, 11);
  const team2Subs = players.filter(p => p.team === 2 && !p.is_on_field).slice(0, 9);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="w-screen h-screen bg-gradient-to-br from-slate-950/95 via-blue-950/95 to-indigo-950/95 backdrop-blur-xl overflow-hidden">
        
        {/* Header */}
        <div className="relative text-white py-6">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-wider flex items-center justify-center space-x-3">
              <span className="text-5xl">⚽</span>
              <span>СКЛАДИ КОМАНД</span>
            </h1>
            <div className="text-lg font-semibold mt-1 opacity-90">
              {match.team1_name} vs {match.team2_name}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-2 gap-8 px-8 py-6 h-[calc(100vh-120px)]">
          
          {/* Team 1 */}
          <div className="bg-gradient-to-br from-black/50 via-gray-900/60 to-black/50 rounded-2xl p-6 border-2 border-white/20 shadow-2xl flex flex-col">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg overflow-hidden bg-white/10">
                  {match.team1_logo_url ? (
                    <img src={match.team1_logo_url} alt={match.team1_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-lg">{match.team1_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{match.team1_name}</h2>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Starters */}
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-green-400 mb-4 text-center bg-green-600/20 py-2 rounded-lg border border-green-500/50">
                  🟢 ОСНОВА
                </h3>
                <div className="grid grid-cols-1 gap-2 flex-1">
                  {team1Starters.map((player) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center space-x-2 bg-gradient-to-r from-green-600/30 to-green-700/30 p-2 rounded-lg border border-green-500/40 shadow-md player-card ${
                        animatedPlayers.has(player.id) ? 'animate-slide-in-up' : 'opacity-0'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                        {player.player_number || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm leading-tight truncate">{player.player_name}</div>
                        <div className="text-green-300 text-xs font-medium truncate">{player.position || 'Гравець'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subs */}
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center bg-yellow-600/20 py-2 rounded-lg border border-yellow-500/50">
                  🟡 ЗАПАС
                </h3>
                <div className="grid grid-cols-1 gap-2 flex-1">
                  {team1Subs.map((player) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center space-x-2 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 p-2 rounded-lg border border-yellow-500/30 shadow-md player-card ${
                        animatedPlayers.has(player.id) ? 'animate-slide-in-up' : 'opacity-0'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-black font-black text-sm shadow-md">
                        {player.player_number || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm leading-tight truncate">{player.player_name}</div>
                        <div className="text-yellow-300 text-xs font-medium truncate">{player.position || 'Гравець'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-gradient-to-br from-black/50 via-gray-900/60 to-black/50 rounded-2xl p-6 border-2 border-white/20 shadow-2xl flex flex-col">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg overflow-hidden bg-white/10">
                  {match.team2_logo_url ? (
                    <img src={match.team2_logo_url} alt={match.team2_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-lg">{match.team2_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{match.team2_name}</h2>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Starters */}
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-green-400 mb-4 text-center bg-green-600/20 py-2 rounded-lg border border-green-500/50">
                  🟢 ОСНОВА
                </h3>
                <div className="grid grid-cols-1 gap-2 flex-1">
                  {team2Starters.map((player) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center space-x-2 bg-gradient-to-r from-green-600/30 to-green-700/30 p-2 rounded-lg border border-green-500/40 shadow-md player-card ${
                        animatedPlayers.has(player.id) ? 'animate-slide-in-up' : 'opacity-0'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                        {player.player_number || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm leading-tight truncate">{player.player_name}</div>
                        <div className="text-green-300 text-xs font-medium truncate">{player.position || 'Гравець'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subs */}
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center bg-yellow-600/20 py-2 rounded-lg border border-yellow-500/50">
                  🟡 ЗАПАС
                </h3>
                <div className="grid grid-cols-1 gap-2 flex-1">
                  {team2Subs.map((player) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center space-x-2 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 p-2 rounded-lg border border-yellow-500/30 shadow-md player-card ${
                        animatedPlayers.has(player.id) ? 'animate-slide-in-up' : 'opacity-0'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-black font-black text-sm shadow-md">
                        {player.player_number || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm leading-tight truncate">{player.player_name}</div>
                        <div className="text-yellow-300 text-xs font-medium truncate">{player.position || 'Гравець'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
          <div className="text-white text-sm font-semibold">
            {team1Starters.length + team2Starters.length} гравців на полі • {team1Subs.length + team2Subs.length} на лаві
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.5s ease-out forwards;
        }
        
        .player-card {
          transition: all 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
