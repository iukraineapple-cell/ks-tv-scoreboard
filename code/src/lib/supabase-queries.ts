import { requireSupabase } from "./supabase";

export interface UserProfile {
  id: number;
  auth_user_id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_payment_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchData {
  id: number;
  user_id: number;
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
  is_active: boolean;
  is_visible: boolean;
  half_time_offset: number;
  show_notification: boolean;
  current_notification_text: string | null;
  show_lineups: boolean;
  timer_start_timestamp?: number;
  timer_server_time?: number;
  created_at: string;
  updated_at: string;
}

export interface MatchPlayerData {
  id: number;
  match_id: number;
  team: number;
  player_name: string;
  player_number: number | null;
  is_starter: boolean;
  is_on_field: boolean;
  position: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MatchEventData {
  id: number;
  match_id: number;
  event_type: string;
  player_name: string;
  team: number;
  minute: number;
  description: string | null;
  substituted_player_name: string | null;
  is_visible?: boolean;
  is_broadcast?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentData {
  id: number;
  user_id: number;
  amount: number;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  confirmed_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

// User Queries
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user profile:", error);
  }
  return data || null;
}

// Match Queries
export async function getUserMatches(): Promise<MatchData[]> {
  const supabase = requireSupabase();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
  return data || [];
}

export async function getMatchById(matchId: number | string): Promise<MatchData | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("Error fetching match by id:", error);
    return null;
  }
  return data;
}

export async function createMatch(matchData: {
  team1_name: string;
  team2_name: string;
  timer_duration: number;
  design_theme: string;
}): Promise<{ success: boolean; match?: MatchData; error?: string }> {
  const supabase = requireSupabase();
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: "Користувача не знайдено" };

  if (!profile.is_payment_confirmed && !profile.is_admin) {
    return { success: false, error: "Для створення табло необхідно оплатити доступ" };
  }

  const { data, error } = await supabase
    .from("matches")
    .insert({
      user_id: profile.id,
      team1_name: matchData.team1_name,
      team2_name: matchData.team2_name,
      timer_duration: matchData.timer_duration,
      design_theme: matchData.design_theme,
      team1_score: 0,
      team2_score: 0,
      current_time: 0,
      is_timer_running: false,
      current_half: 1,
      is_active: true,
      is_visible: true,
      half_time_offset: 0,
      show_notification: false,
      show_lineups: false
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating match:", error);
    return { success: false, error: error.message };
  }
  return { success: true, match: data };
}

export async function deleteMatch(matchId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (error) {
    console.error("Error deleting match:", error);
    return false;
  }
  return true;
}

export async function updateMatchScore(matchId: number, team1_score: number, team2_score: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ team1_score, team2_score, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating score:", error);
  return !error;
}

export async function updateMatchTimer(
  matchId: number,
  params: {
    current_time?: number;
    is_timer_running?: boolean;
    timer_start_timestamp?: number | null;
    timer_server_time?: number | null;
    timer_duration?: number;
  }
): Promise<boolean> {
  const supabase = requireSupabase();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.current_time !== undefined) updateData.current_time = params.current_time;
  if (params.is_timer_running !== undefined) updateData.is_timer_running = params.is_timer_running;
  if (params.timer_start_timestamp !== undefined) updateData.timer_start_timestamp = params.timer_start_timestamp;
  if (params.timer_server_time !== undefined) updateData.timer_server_time = params.timer_server_time;
  if (params.timer_duration !== undefined) updateData.timer_duration = params.timer_duration;

  const { error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) console.error("Error updating timer:", error);
  return !error;
}

export async function updateMatchVisibility(matchId: number, is_visible: boolean): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ is_visible, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating visibility:", error);
  return !error;
}

export async function updateMatchTeam(
  matchId: number,
  data: { team1_name?: string; team2_name?: string; team1_logo_url?: string | null; team2_logo_url?: string | null }
): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating team info:", error);
  return !error;
}

export async function updateMatchHalf(matchId: number, current_half: number, half_time_offset?: number): Promise<boolean> {
  const supabase = requireSupabase();
  const updateData: Record<string, unknown> = { current_half, updated_at: new Date().toISOString() };
  if (half_time_offset !== undefined) updateData.half_time_offset = half_time_offset;

  const { error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) console.error("Error updating half:", error);
  return !error;
}

export async function updateMatchNotification(matchId: number, show_notification: boolean, current_notification_text?: string | null): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ show_notification, current_notification_text: current_notification_text ?? null, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating notification:", error);
  return !error;
}

export async function updateMatchLineups(matchId: number, show_lineups: boolean): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ show_lineups, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating lineups visibility:", error);
  return !error;
}

export async function updateMatchSettings(matchId: number, settings: { design_theme?: string; timer_duration?: number }): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) console.error("Error updating settings:", error);
  return !error;
}

// Player Queries
export async function getMatchPlayers(matchId: number | string): Promise<MatchPlayerData[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("match_players")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching players:", error);
    return [];
  }
  return data || [];
}

export async function addPlayer(matchId: number, player: {
  team: number;
  player_name: string;
  player_number?: number | null;
  is_starter: boolean;
  is_on_field: boolean;
  position?: string | null;
}): Promise<MatchPlayerData | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("match_players")
    .insert({ match_id: matchId, ...player })
    .select()
    .single();

  if (error) {
    console.error("Error adding player:", error);
    return null;
  }
  return data;
}

export async function updatePlayer(playerId: number, updates: Partial<MatchPlayerData>): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("match_players")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", playerId);

  if (error) console.error("Error updating player:", error);
  return !error;
}

export async function deletePlayer(playerId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("match_players")
    .delete()
    .eq("id", playerId);

  if (error) console.error("Error deleting player:", error);
  return !error;
}

export async function clearMatchPlayers(matchId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("match_players")
    .delete()
    .eq("match_id", matchId);

  if (error) console.error("Error clearing players:", error);
  return !error;
}

export async function batchAddPlayers(matchId: number, players: Omit<MatchPlayerData, "id" | "match_id">[]): Promise<boolean> {
  const supabase = requireSupabase();
  const rows = players.map(p => ({ match_id: matchId, ...p }));
  const { error } = await supabase.from("match_players").insert(rows);
  if (error) console.error("Error batch adding players:", error);
  return !error;
}

// Event Queries
export async function getMatchEvents(matchId: number | string): Promise<MatchEventData[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }
  return data || [];
}

export async function addEvent(matchId: number, event: {
  event_type: string;
  player_name: string;
  team: number;
  minute: number;
  description?: string | null;
  substituted_player_name?: string | null;
  is_visible?: boolean;
  is_broadcast?: boolean;
}): Promise<MatchEventData | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("match_events")
    .insert({ match_id: matchId, ...event })
    .select()
    .single();

  if (error) {
    console.error("Error adding event:", error);
    return null;
  }
  return data;
}

export async function deleteEvent(eventId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", eventId);

  if (error) console.error("Error deleting event:", error);
  return !error;
}

export async function updateEventBroadcast(eventId: number, is_broadcast: boolean): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("match_events")
    .update({ is_broadcast, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) console.error("Error updating event broadcast:", error);
  return !error;
}

// Payment Queries
export async function createPayment(params: {
  amount: number;
  payment_method?: string;
  transaction_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = requireSupabase();
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: "Користувача не знайдено" };

  const { error } = await supabase
    .from("payments")
    .insert({
      user_id: profile.id,
      amount: params.amount,
      status: "pending",
      payment_method: params.payment_method || "Monobank",
      transaction_id: params.transaction_id || null
    });

  if (error) {
    console.error("Error creating payment:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Admin Queries
export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
  return data || [];
}

export async function getAllPayments(): Promise<PaymentData[]> {
  const supabase = requireSupabase();
  const { data: payments, error } = await supabase
    .from("payments")
    .select("*, users:user_id (email, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all payments:", error);
    return [];
  }

  return (payments || []).map((p: any) => ({
    ...p,
    user_email: p.users?.email || "",
    user_name: p.users?.name || ""
  }));
}

export async function getAllMatches(): Promise<MatchData[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all matches:", error);
    return [];
  }
  return data || [];
}

export async function confirmPayment(paymentId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const profile = await getCurrentUserProfile();
  if (!profile) return false;

  // 1. Get payment to find user_id
  const { data: payment } = await supabase
    .from("payments")
    .select("user_id")
    .eq("id", paymentId)
    .single();

  if (!payment) return false;

  // 2. Update payment status
  const { error: pErr } = await supabase
    .from("payments")
    .update({ status: "confirmed", confirmed_by_admin_id: profile.id, updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (pErr) {
    console.error("Error confirming payment:", pErr);
    return false;
  }

  // 3. Confirm user payment
  const { error: uErr } = await supabase
    .from("users")
    .update({ is_payment_confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", payment.user_id);

  if (uErr) console.error("Error updating user payment status:", uErr);
  return !uErr;
}

export async function toggleUserStatus(userId: number, currentPaymentConfirmed: boolean): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("users")
    .update({ is_payment_confirmed: !currentPaymentConfirmed, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) console.error("Error toggling user status:", error);
  return !error;
}

export async function deleteUser(userId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) console.error("Error deleting user:", error);
  return !error;
}

export async function deletePayment(paymentId: number): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) console.error("Error deleting payment:", error);
  return !error;
}
