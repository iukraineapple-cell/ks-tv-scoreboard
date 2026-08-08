import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Plus, Settings, LogOut, CreditCard, Shield, Trophy, Trash2 } from "lucide-react";
import { getUserMatches, deleteMatch as apiDeleteMatch, MatchData } from "@/lib/supabase-queries";

export default function Dashboard() {
  const { user: mochaUser, appUser, logout, isPending, refreshAppUser } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
      return;
    }

    if (mochaUser) {
      refreshAppUser();
      fetchMatches();
    }
  }, [mochaUser, isPending, navigate]);

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const data = await getUserMatches();
      setMatches(data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це табло? Ця дія незворотна.")) {
      return;
    }

    try {
      const success = await apiDeleteMatch(matchId);
      if (success) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
        setFeedback({ type: "success", message: "Табло успішно видалено" });
      } else {
        setFeedback({ type: "error", message: "Помилка видалення табло" });
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      setFeedback({ type: "error", message: "Помилка видалення табло" });
    }
  };

  if (isPending || loadingMatches) {
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
          <h1 className="text-2xl font-semibold mb-4">Налаштування акаунту...</h1>
          <p className="text-gray-300 mb-6">Створення вашого профілю користувача в базі даних</p>
          <button
            onClick={() => refreshAppUser()}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Оновити
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 text-center text-white font-medium ${
            feedback.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-4 underline">
            Закрити
          </button>
        </div>
      )}

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
              <span className="text-sm text-gray-300">Вітаємо, {appUser.name || appUser.email}</span>
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
        {!appUser.is_payment_confirmed && !appUser.is_admin ? (
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
        {(appUser.is_payment_confirmed || appUser.is_admin) && (
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
        {(appUser.is_payment_confirmed || appUser.is_admin) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${match.design_theme === "classic" ? "bg-green-400" : "bg-purple-400"}`}></div>
                      <span className="text-sm text-gray-300 capitalize">{match.design_theme}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(match.created_at).toLocaleDateString("uk-UA")}
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
                      onClick={() => handleDeleteMatch(match.id)}
                      className="flex items-center justify-center space-x-2 w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Видалити</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {matches.length === 0 && (
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
