import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Trophy, Clock, Sparkles, AlertCircle, Play, Shield } from "lucide-react";
import { createMatch } from "@/lib/supabase-queries";

export default function CreateMatch() {
  const { user: mochaUser, appUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    team1_name: "",
    team2_name: "",
    timer_duration: 2700, // Default 45 mins
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
      setError("Будь ласка, введіть назви обох команд");
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (appUser && !appUser.is_payment_confirmed && !appUser.is_admin) {
    return (
      <div className="min-h-screen bg-[#06080F] text-white flex items-center justify-center px-6">
        <div className="glass-panel border border-amber-500/30 p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <Trophy className="h-12 w-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Потрібна активація підписки</h2>
          <p className="text-xs text-slate-300">Створення нових табло доступне після оплати доступу.</p>
          <Link
            to="/payment"
            className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            Оплатити доступ (500 ₴)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 py-12 px-6 font-display">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-white mb-8 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Повернутися до кабінету</span>
        </Link>

        <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/[0.08] shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Створення нового матчу</h1>
              <p className="text-xs text-slate-400">Заповніть назви команд і отримайте готове OBS табло</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Match Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">Швидкі пресети формату гри</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, timer_duration: 2700 }))}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                    formData.timer_duration === 2700
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="text-white font-black">⚽ Великий футбол 11х11</div>
                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">2 тайми по 45 хвилин</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, timer_duration: 1200 }))}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                    formData.timer_duration === 1200
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="text-white font-black">⚡ Футзал / Міні-футбол</div>
                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">2 тайми по 20 хвилин</div>
                </button>
              </div>
            </div>

            {/* Team Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Команда 1 (Господарі)</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Карпати Львів"
                  value={formData.team1_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, team1_name: e.target.value }))}
                  className="glass-input rounded-2xl px-4 py-3 text-sm w-full outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Команда 2 (Гості)</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Динамо Київ"
                  value={formData.team2_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, team2_name: e.target.value }))}
                  className="glass-input rounded-2xl px-4 py-3 text-sm w-full outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 active:scale-95"
            >
              {loading ? "Створення табло..." : "Створити табло та перейти в пульт"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
