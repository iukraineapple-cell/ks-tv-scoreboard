import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { getMatchById, getMatchEvents, MatchData, MatchEventData } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";

export default function EventsPage() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match") || searchParams.get("match_id");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [events, setEvents] = useState<MatchEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  const fetchData = useCallback(async () => {
    if (!matchId) return;
    try {
      const [m, evs] = await Promise.all([
        getMatchById(matchId),
        getMatchEvents(matchId)
      ]);

      if (m) {
        setMatch(m);
        setError(null);
      } else {
        setError("Match not found");
      }

      const broadcastEvents = evs
        .filter(ev => Boolean(ev.is_broadcast))
        .sort((a, b) => {
          if (a.minute !== b.minute) return b.minute - a.minute;
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

      setEvents(broadcastEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Error loading data");
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

    fetchData();
    const interval = setInterval(fetchData, 3000);

    // Supabase Realtime subscription
    let channel: any;
    if (supabase) {
      channel = supabase
        .channel(`events_${matchId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
          () => fetchData()
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, fetchData]);

  useEffect(() => {
    if (events.length > 1) {
      const interval = setInterval(() => {
        setCurrentEventIndex((prev) => (prev + 1) % events.length);
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setCurrentEventIndex(0);
    }
  }, [events.length]);

  const getEventEmoji = (eventType: string) => {
    switch (eventType) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔄';
      default: return '📝';
    }
  };

  const getEventText = (event: MatchEventData) => {
    switch (event.event_type) {
      case 'goal': return 'ГОООЛ!';
      case 'yellow_card': return 'ЖОВТА!';
      case 'red_card': return 'ЧЕРВОНА!';
      case 'substitution': return 'ЗАМІНА!';
      default: return 'ПОДІЯ';
    }
  };

  const getEventDescription = (event: MatchEventData) => {
    switch (event.event_type) {
      case 'substitution':
        return `${event.player_name} ↔ ${event.substituted_player_name || 'Гравець'}`;
      default:
        return event.description || event.player_name;
    }
  };

  if (loading || error || !match || !match.is_visible || events.length === 0) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  const safeIndex = currentEventIndex < events.length ? currentEventIndex : 0;
  const currentEvent = events[safeIndex];
  const teamLogo = currentEvent.team === 1 ? match.team1_logo_url : match.team2_logo_url;
  const teamName = currentEvent.team === 1 ? match.team1_name : match.team2_name;

  return (
    <div className="fixed top-32 right-8 z-50 pointer-events-none">
      <div className="event-notification animate-in slide-in-from-right-5 fade-in duration-700">
        <div style={{ position: 'relative' }}>
          {/* Main Event Card */}
          <div className="bg-gradient-to-br from-slate-950/95 via-blue-950/95 to-indigo-950/95 backdrop-blur-xl border-2 border-white/20 rounded-3xl shadow-2xl" style={{ width: '420px', minHeight: '210px', padding: '2rem' }}>
            
            {/* Event Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
                  {teamLogo ? (
                    <img src={teamLogo} alt={teamName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xl">{teamName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                
                <div className="text-5xl animate-bounce">
                  {getEventEmoji(currentEvent.event_type)}
                </div>
              </div>
              
              <div className="bg-orange-500 text-black font-black text-2xl px-4 py-2 rounded-xl shadow-lg">
                {currentEvent.minute}'
              </div>
            </div>

            {/* Event Content */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-black text-white mb-2 tracking-wider">
                  {getEventText(currentEvent)}
                </div>
                
                <div className="text-xl font-bold text-blue-200 leading-tight">
                  {getEventDescription(currentEvent)}
                </div>
              </div>
            </div>

            {/* Indicator */}
            {events.length > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                {events.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === safeIndex ? 'bg-orange-500 scale-125' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="absolute -left-1 top-8 bottom-8 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-orange-500 rounded-full"></div>
          <div className="absolute -right-1 top-8 bottom-8 w-1 bg-gradient-to-b from-orange-500 via-purple-500 to-blue-500 rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-from-right-5 {
          from {
            opacity: 0;
            transform: translateX(1.25rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-in { animation-fill-mode: both; }
        .slide-in-from-right-5 { animation-name: slide-in-from-right-5; }
        .fade-in { animation-name: fade-in; }
        .duration-700 { animation-duration: 0.7s; }
      `}</style>
    </div>
  );
}
