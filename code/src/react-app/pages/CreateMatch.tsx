import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Trophy, Clock, Palette } from "lucide-react";
import { createMatch } from "@/lib/supabase-queries";

export default function CreateMatch() {
  const { user: mochaUser, appUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    team1_name: "",
    team2_name: "",
    timer_duration: 2700, // Default 45 mins (in seconds)
    design_theme: "classic" as "classic" | "dark",
  });

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
    }
  }, [mochaUser, isPending, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team1_name.trim() || !formData.team2_name.trim()) {
      setError("Введіть назви обох команд");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createMatch({
        team1_name: formData.team1_name.trim(),
        team2_name: formData.team2_name.trim(),
        timer_duration: formData.timer_duration,
        design_theme: formData.design_theme,
      });

      if (res.success && res.match) {
        navigate(`/match/${res.match.id}`);
      } else {
        setError(res.error || "Помилка створення табло");
      }
    } catch (err) {
      console.error("Error submitting match form:", err);
      setError("Сталася помилка. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (appUser && !appUser.is_payment_confirmed && !appUser.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center text-white px-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Оплатіть доступ</h2>
          <p className="text-gray-300 mb-6">Створення табло доступне після підтвердження оплати.</p>
          <Link
            to="/payment"
            className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Перейти до оплати
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-300 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Повернутися до кабінету</span>
        </Link>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-8">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Створення табло</h1>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Команда 1 (Господарі)</label>
                <input
                  type="text"
                  required
                  value={formData.team1_name}
                  onChange={(e) => setFormData({ ...formData, team1_name: e.target.value })}
                  placeholder="Наприклад: ФК Динамо"
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Команда 2 (Гості)</label>
                <input
                  type="text"
                  required
                  value={formData.team2_name}
                  onChange={(e) => setFormData({ ...formData, team2_name: e.target.value })}
                  placeholder="Наприклад: ФК Шахтар"
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2 flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span>Тривалість тайму</span>
              </label>
              <select
                value={formData.timer_duration}
                onChange={(e) => setFormData({ ...formData, timer_duration: Number(e.target.value) })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors"
              >
                <option value={900} className="bg-slate-900">15 хвилин</option>
                <option value={1800} className="bg-slate-900">30 хвилин</option>
                <option value={2700} className="bg-slate-900">45 хвилин (Стандарт)</option>
                <option value={3600} className="bg-slate-900">60 хвилин</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2 flex items-center space-x-2">
                <Palette className="h-4 w-4 text-purple-400" />
                <span>Тема оформлення</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, design_theme: "classic" })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.design_theme === "classic"
                      ? "border-blue-400 bg-blue-500/20"
                      : "border-white/10 bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="font-semibold mb-1">Класична</div>
                  <div className="text-xs text-gray-400">Світлий прямокутний оверлей</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, design_theme: "dark" })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.design_theme === "dark"
                      ? "border-purple-400 bg-purple-500/20"
                      : "border-white/10 bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="font-semibold mb-1">Темна</div>
                  <div className="text-xs text-gray-400">Преміум темний оверлей</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 font-semibold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Створення..." : "Створити табло"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
