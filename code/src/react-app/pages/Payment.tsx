import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, CreditCard, Copy, CheckCircle, Clock, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { createPayment } from "@/lib/supabase-queries";

export default function Payment() {
  const { user: mochaUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
    }
  }, [mochaUser, isPending, navigate]);

  const bankDetails = {
    cardNumber: "4441 1110 6432 8952",
    bank: "Monobank",
    recipient: "КАРП'ЮК АНДРІЙ СТЕПАНОВИЧ",
    amount: "500 ₴"
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy error:", err);
    }
  };

  const createPaymentRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createPayment({ amount: 500 });
      if (res.success) {
        setPaymentCreated(true);
      } else {
        setError(res.error || "Помилка створення заявки");
      }
    } catch (err) {
      console.error("Error creating payment:", err);
      setError("Помилка обробки запиту");
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

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!paymentCreated ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/[0.08] shadow-2xl space-y-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <CreditCard className="h-7 w-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Оплата підписки KS TV</h2>
              <div className="text-4xl sm:text-5xl font-black font-mono-tabular text-amber-400 mt-2">500 ₴</div>
              <p className="text-xs text-slate-400 mt-1">4 тижні безлімітного створення та керування табло</p>
            </div>

            {/* Virtual Bank Card Presentation */}
            <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase tracking-widest">
                <span>{bankDetails.bank}</span>
                <span className="text-emerald-400 font-bold">ОФІЦІЙНИЙ РАХУНОК</span>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Номер картки для оплати</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg sm:text-xl font-mono font-bold tracking-wider text-white">
                    {bankDetails.cardNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.cardNumber.replace(/\s/g, ''))}
                    className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-all shadow"
                    title="Скопіювати номер картки"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Отримувач:</div>
                  <div className="font-bold text-white">{bankDetails.recipient}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Сума:</div>
                  <div className="font-black text-amber-400">{bankDetails.amount}</div>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={createPaymentRequest}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Формування заявки..." : "Я здійснив оплату (Підтвердити)"}
            </button>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-emerald-500/30 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Заявку на оплату надіслано!</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Адміністратор перевірить зарахування коштів та активує ваш доступ.
            </p>
            <div className="pt-4">
              <Link
                to="/dashboard"
                className="inline-block px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg"
              >
                Повернутися в кабінет
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
