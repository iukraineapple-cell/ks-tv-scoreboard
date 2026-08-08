import { useAuth } from "@/lib/auth";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ArrowLeft, Users, CreditCard, Trophy, Shield, CheckCircle, 
  Trash2, UserCheck, UserX, LogOut, BarChart3, Trash 
} from "lucide-react";
import {
  getAllUsers,
  getAllPayments,
  getAllMatches,
  confirmPayment as apiConfirmPayment,
  toggleUserStatus as apiToggleUserStatus,
  deleteUser as apiDeleteUser,
  deletePayment as apiDeletePayment,
  deleteMatch as apiDeleteMatch,
  UserProfile,
  PaymentData,
  MatchData
} from "@/lib/supabase-queries";

export default function Admin() {
  const { appUser, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'matches'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [u, p, m] = await Promise.all([
        getAllUsers(),
        getAllPayments(),
        getAllMatches()
      ]);
      setUsers(u);
      setPayments(p);
      setMatches(m);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending) {
      if (!appUser || !appUser.is_admin) {
        navigate("/dashboard");
        return;
      }
      fetchAllData();
    }
  }, [isPending, appUser, navigate, fetchAllData]);

  const handleConfirmPayment = async (paymentId: number) => {
    const ok = await apiConfirmPayment(paymentId);
    if (ok) fetchAllData();
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    const ok = await apiToggleUserStatus(userId, currentStatus);
    if (ok) fetchAllData();
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Видалити користувача?")) return;
    const ok = await apiDeleteUser(userId);
    if (ok) fetchAllData();
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm("Видалити платіж?")) return;
    const ok = await apiDeletePayment(paymentId);
    if (ok) fetchAllData();
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm("Видалити табло?")) return;
    const ok = await apiDeleteMatch(matchId);
    if (ok) fetchAllData();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!appUser || !appUser.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Shield className="h-7 w-7 text-red-500" />
            <h1 className="text-xl font-bold">Панель Адміністратора</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Вийти</span>
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-all ${
              activeTab === 'users' ? 'border-red-500 text-red-400 bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Користувачі ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-all ${
              activeTab === 'payments' ? 'border-red-500 text-red-400 bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            <span>Оплати ({payments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-all ${
              activeTab === 'matches' ? 'border-red-500 text-red-400 bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span>Табло ({matches.length})</span>
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                  <th className="p-4">Ім'я / Email</th>
                  <th className="p-4">Статус Оплати</th>
                  <th className="p-4">Роль</th>
                  <th className="p-4">Дата реєстрації</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.is_payment_confirmed ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}>
                        {u.is_payment_confirmed ? 'Оплачено' : 'Очікує'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${u.is_admin ? 'text-red-400' : 'text-slate-400'}`}>
                        {u.is_admin ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_payment_confirmed)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                        title={u.is_payment_confirmed ? "Скасувати оплату" : "Підтвердити оплату"}
                      >
                        {u.is_payment_confirmed ? <UserX className="h-4 w-4 text-amber-400" /> : <UserCheck className="h-4 w-4 text-green-400" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-red-400"
                        title="Видалити"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                  <th className="p-4">Користувач</th>
                  <th className="p-4">Сума</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Дата</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{p.user_name || `User #${p.user_id}`}</div>
                      <div className="text-xs text-slate-400">{p.user_email}</div>
                    </td>
                    <td className="p-4 font-bold text-yellow-400">{p.amount} ₴</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {p.status !== 'confirmed' && (
                        <button
                          onClick={() => handleConfirmPayment(p.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                        >
                          Підтвердити
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                  <th className="p-4">ID / Команди</th>
                  <th className="p-4">Рахунок</th>
                  <th className="p-4">Дата</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {matches.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">#{m.id} {m.team1_name} vs {m.team2_name}</div>
                      <div className="text-xs text-slate-400">User ID: {m.user_id}</div>
                    </td>
                    <td className="p-4 font-bold text-yellow-400">{m.team1_score} : {m.team2_score}</td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(m.created_at).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
