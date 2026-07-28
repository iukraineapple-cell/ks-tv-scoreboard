import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Plus, Settings, LogOut, CreditCard, Shield, Trophy, Trash2 } from "lucide-react";

interface AppUser {
  id: number;
  mocha_user_id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_payment_confirmed: boolean;
}

interface Match {
  id: number;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  design_theme: string;
  created_at: string;
}

export default function Dashboard() {
  const { user: mochaUser, logout, isPending } = useAuth();
  const navigate = useNavigate();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
      return;
    }

    if (mochaUser) {
      fetchUserData();
      fetchMatches();
    }
  }, [mochaUser, isPending, navigate]);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/users/me");
      const data = await response.json();
      setAppUser(data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch("/api/matches/my");
      const data = await response.json();
      if (data.success) {
        setMatches(data.data);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const deleteMatch = async (matchId: number) => {
    if (!confirm('Ви впевнені, що хочете видалити це табло? Ця дія незворотна.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
        showFeedback('success', 'Табло успішно видалено');
      } else {
        showFeedback('error', 'Помилка видалення табло');
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      showFeedback('error', 'Помилка видалення табло');
    }
  };

  const showFeedback = (_type: 'success' | 'error', message: string) => {
    // Simple feedback - could be enhanced with toast notifications
    alert(message);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-semibold mb-4">Помилка завантаження</h1>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <nav className="border-b border-white/20 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <h1 className="text-2xl font-bold">KS TV</h1>
              {appUser.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span>Адмін панель</span>
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Вітаємо, {appUser.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Вийти</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Payment Status */}
        {!appUser.is_payment_confirmed ? (
          <div className="bg-yellow-600/20 border border-yellow-400 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-semibold">Щоб створити своє табло, потрібно оплатити доступ</h2>
                  <p className="text-gray-300">Статус: Очікує підтвердження оплати</p>
                </div>
              </div>
              <Link
                to="/payment"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Оплатити
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-green-600/20 border border-green-400 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h2 className="text-xl font-semibold">Акаунт активований</h2>
            </div>
          </div>
        )}

        {/* Create Match Button */}
        {appUser.is_payment_confirmed && (
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Мої табло</h2>
            <Link
              to="/create-match"
              className="flex items-center space-x-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              <span>Створити табло</span>
            </Link>
          </div>
        )}

        {/* Matches Grid */}
        {appUser.is_payment_confirmed && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${match.design_theme === 'classic' ? 'bg-green-400' : 'bg-purple-400'}`}></div>
                      <span className="text-sm text-gray-300 capitalize">{match.design_theme}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(match.created_at).toLocaleDateString('uk-UA')}
                    </span>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="text-center">
                        <h3 className="font-semibold text-lg mb-1">{match.team1_name}</h3>
                        <div className="text-3xl font-bold text-yellow-400">{match.team1_score}</div>
                      </div>
                      <div className="text-gray-400 text-xl">:</div>
                      <div className="text-center">
                        <h3 className="font-semibold text-lg mb-1">{match.team2_name}</h3>
                        <div className="text-3xl font-bold text-yellow-400">{match.team2_score}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      to={`/match/${match.id}`}
                      className="flex items-center justify-center space-x-2 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Керувати</span>
                    </Link>
                    
                    
                    
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="flex items-center justify-center space-x-2 w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Видалити</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {matches.length === 0 && appUser.is_payment_confirmed && (
              <div className="col-span-full text-center py-12">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-300">Поки що немає табло</h3>
                <p className="text-gray-400 mb-6">Створіть своє перше табло для спортивних трансляцій</p>
                <Link
                  to="/create-match"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5" />
                  <span>Створити табло</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
