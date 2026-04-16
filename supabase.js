/* ═══════════════════════════════════════════════════════════
   SUPABASE INITIALIZATION & CONFIG
═══════════════════════════════════════════════════════════ */

// Initialize Supabase client
const SUPABASE_URL = "https://zvermhsaarqxfpatwqed.supabase.co";
const SUPABASE_KEY = "sb_publishable_YJ-5VnC0x-rhS2GJ011QDg_BtGRYeaa";

// Create Supabase client
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Export for use in app
window.supabaseClient = supabaseClient;

/* ═══════════════════════════════════════════════════════════
   DATABASE FUNCTIONS
═══════════════════════════════════════════════════════════ */

// Users table - stores user accounts
async function createUserAccount(username, name, phone, passwordHash) {
  const { data, error } = await supabaseClient
    .from("users")
    .insert([{ username, name, phone, password_hash: passwordHash }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getUserByUsername(username) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("username", username)
    .single();
  
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

async function getUserByPhone(phone) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();
  
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

// Contacts table
async function addContact(userId, name, phone) {
  const { data, error } = await supabaseClient
    .from("contacts")
    .insert([{ user_id: userId, name, phone }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getContactsByUser(userId) {
  const { data, error } = await supabaseClient
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteContact(contactId) {
  const { error } = await supabaseClient
    .from("contacts")
    .delete()
    .eq("id", contactId);
  
  if (error) throw new Error(error.message);
}

// Call history table
async function addCallHistory(userId, number, direction, duration) {
  const { data, error } = await supabaseClient
    .from("call_history")
    .insert([{ user_id: userId, number, direction, duration, timestamp: new Date() }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getCallHistory(userId, limit = 100) {
  const { data, error } = await supabaseClient
    .from("call_history")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  
  if (error) throw new Error(error.message);
  return data || [];
}

async function clearCallHistory(userId) {
  const { error } = await supabaseClient
    .from("call_history")
    .delete()
    .eq("user_id", userId);
  
  if (error) throw new Error(error.message);
}

/* ═══════════════════════════════════════════════════════════
   REALTIME NOTIFICATIONS
═══════════════════════════════════════════════════════════ */

function subscribeToIncomingCalls(phoneNumber, callback) {
  const subscription = supabaseClient
    .channel(`calls:${phoneNumber}`)
    .on("broadcast", { event: "incoming_call" }, (payload) => {
      callback(payload.payload);
    })
    .subscribe();
  
  return subscription;
}

async function notifyIncomingCall(toPhone, fromPhone, callType) {
  const { error } = await supabaseClient
    .channel(`calls:${toPhone}`)
    .send({
      type: "broadcast",
      event: "incoming_call",
      payload: { fromPhone, callType, timestamp: new Date() }
    });
  
  if (error) console.error("Error sending notification:", error);
}

/* ═══════════════════════════════════════════════════════════
   PRESENCE - For online status
═══════════════════════════════════════════════════════════ */

function subscribeToPresence(phoneNumber, callback) {
  const subscription = supabaseClient
    .channel(`presence:${phoneNumber}`)
    .on("presence", { event: "sync" }, () => {
      const presence = subscription.presenceState();
      callback(presence);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await subscription.track({ phoneNumber, online: true });
      }
    });
  
  return subscription;
}
