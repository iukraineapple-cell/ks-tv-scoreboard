import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router";
import { AuthProvider } from "@/lib/auth";

const HomePage = React.lazy(() => import("@/react-app/pages/Home"));
const AuthCallbackPage = React.lazy(() => import("@/react-app/pages/AuthCallback"));
const DashboardPage = React.lazy(() => import("@/react-app/pages/Dashboard"));
const CreateMatchPage = React.lazy(() => import("@/react-app/pages/CreateMatch"));
const MatchControlPage = React.lazy(() => import("@/react-app/pages/MatchControl"));
const PaymentPage = React.lazy(() => import("@/react-app/pages/Payment"));
const AdminPage = React.lazy(() => import("@/react-app/pages/Admin"));
const AdminLoginPage = React.lazy(() => import("@/react-app/pages/AdminLogin"));
const ScoreboardPage = React.lazy(() => import("@/react-app/pages/Scoreboard"));
const LineupsPage = React.lazy(() => import("@/react-app/pages/Lineups"));
const EventsPage = React.lazy(() => import("@/react-app/pages/Events"));
const BroadcastStudioPage = React.lazy(() => import("@/react-app/pages/BroadcastStudio"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-black text-blue-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Сторінку не знайдено</h2>
      <p className="text-slate-400 mb-6 max-w-md">Сторінка, яку ви шукаєте, не існує або була переміщена.</p>
      <Link to="/" className="bg-blue-600 hover:bg-blue-500 font-semibold px-6 py-2.5 rounded-lg transition-colors">
        На головну
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create-match" element={<CreateMatchPage />} />
            <Route path="/match/:id" element={<MatchControlPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
            <Route path="/lineups" element={<LineupsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/studio/:id" element={<BroadcastStudioPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
