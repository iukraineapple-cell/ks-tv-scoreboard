import { useEffect, useState } from "react";
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
  show_lineups: boolean;
}

interface Player {
  id: number;
  match_id: number;
  team: number;
  player_name: string;
  player_number?: number;
  is_starter: boolean;
  is_on_field: boolean;
  position?: string;
}

export default function LineupsPage() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match_id");
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedPlayers, setAnimatedPlayers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!matchId) {
      setError("Match ID required");
      setLoading(false);
      return;
    }

    fetchMatch();
    fetchPlayers();
    const interval = setInterval(() => {
      fetchMatch();
      fetchPlayers();
    }, 2000);
    return () => clearInterval(interval);
  }, [matchId]);

  // Trigger animation when lineups are first shown or players change
  useEffect(() => {
    if (match && match.show_lineups && players.length > 0 && !loading) {
      // Reset animation state and start animation after delay
      setAnimatedPlayers(new Set());
      
      // Start animation after 1000ms delay to ensure page loads properly
      setTimeout(() => {
        startPlayerAnimation();
      }, 1000);
    }
  }, [match?.show_lineups, players.length, loading]);

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();

      if (data.success) {
        const newMatch = data.data;
        
        // Check if show_lineups changed from false to true
        if (match && !match.show_lineups && newMatch.show_lineups) {
          // Reset animation state and start animation after delay
          setAnimatedPlayers(new Set());
          
          // Start animation after 500ms delay to ensure page loads
          setTimeout(() => {
            startPlayerAnimation();
          }, 500);
        }
        
        setMatch(newMatch);
      } else {
        setError("Match not found");
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      setError("Error loading match");
    } finally {
      setLoading(false);
    }
  };

  const startPlayerAnimation = () => {
    // Get all players sorted by team and position
    const allPlayers = players.slice().sort((a, b) => {
      if (a.team !== b.team) return a.team - b.team;
      if (a.is_on_field !== b.is_on_field) return b.is_on_field ? 1 : -1;
      return (a.player_number || 999) - (b.player_number || 999);
    });

    // Animate players one by one with delay
    allPlayers.forEach((player, index) => {
      setTimeout(() => {
        setAnimatedPlayers(prev => new Set([...prev, player.id]));
      }, index * 100); // 100ms delay between each player
    });

    // Animation completes after all players are shown
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}/players`);
      const data = await response.json();
      
      if (data.success) {
        setPlayers(data.data);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  if (error || !match || !match.is_visible || !match.show_lineups) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  // Get players for each team and limit to prevent overflow
  const team1Starters = players.filter(p => p.team === 1 && p.is_on_field).slice(0, 11);
  const team1Subs = players.filter(p => p.team === 1 && !p.is_on_field).slice(0, 9);
  const team2Starters = players.filter(p => p.team === 2 && p.is_on_field).slice(0, 11);
  const team2Subs = players.filter(p => p.team === 2 && !p.is_on_field).slice(0, 9);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Full Screen 1920x1080 Fixed Layout */}
      <div className="w-screen h-screen bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl overflow-hidden">
        
        {/* Compact Header */}
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
          
          <div className="absolute top-3 right-4 px-3 py-1 rounded-lg shadow-lg">
            <div className="text-white font-bold text-sm tracking-wider">
    <img 
      src="https://i.ibb.co/FqgtH9xv/IMG-1751-1.png" 
      alt="KS TV Logo" 
      className="object-contain h-20 w-auto"
    />
            </div>
          </div>
        </div>

        {/* Main Content - Fixed Grid Layout */}
        <div className="grid grid-cols-2 gap-8 px-8 py-6 h-[calc(100vh-120px)]">
          
          {/* Team 1 */}
          <div className="bg-gradient-to-br from-black/40 via-gray-900/50 to-black/40 rounded-2xl p-6 border-2 border-white/20 shadow-2xl flex flex-col">
            
            {/* Team Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="w-16 h-16 rounded-full  flex items-center justify-center border-3 border-white/30 shadow-lg overflow-hidden">
                  {match.team1_logo_url ? (
                    <img src={match.team1_logo_url} alt={match.team1_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-lg">{match.team1_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{match.team1_name}</h2>
              </div>
            </div>

            {/* Team Content */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              
              {/* Starting XI */}
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
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-black font-black text-sm shadow-md">
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

              {/* Substitutes */}
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
          <div className="bg-gradient-to-br from-black/40 via-gray-900/50 to-black/40 rounded-2xl p-6 border-2 border-white/20 shadow-2xl flex flex-col">
            
            {/* Team Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-3 border-white/30 shadow-lg overflow-hidden">
                  {match.team2_logo_url ? (
                    <img src={match.team2_logo_url} alt={match.team2_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-lg">{match.team2_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{match.team2_name}</h2>
              </div>
  
            </div>

            {/* Team Content */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              
              {/* Starting XI */}
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

              {/* Substitutes */}
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

        {/* Bottom Stats Bar */}
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
            transform: translateY(30px) scale(0.9) rotateX(15deg);
            filter: blur(4px);
          }
          50% {
            opacity: 0.7;
            transform: translateY(-5px) scale(1.05) rotateX(-2deg);
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
            filter: blur(0px);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(59, 130, 246, 0.3);
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards,
                     glow-pulse 2s ease-in-out 0.8s;
        }
        
        .player-card {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform-origin: center;
          backface-visibility: hidden;
          perspective: 1000px;
        }
        
        .player-card.opacity-0 {
          opacity: 0;
          transform: translateY(30px) scale(0.9);
        }
        
        .player-card:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
