/*
 * Runtime configuration for the Arjean Amiscosa Financial funnel.
 * Edit the values below, commit, and Cloudflare redeploys automatically.
 *
 * SECURITY NOTE
 * The Supabase publishable key below is a PUBLIC key and is meant to ship in
 * the browser. It is only safe because Row Level Security is enabled on every
 * table and the anon role is granted INSERT only (see supabase/schema.sql).
 * Never put a secret key or the database password in this file.
 */
window.APP_CONFIG = {
  /* ---------- Supabase ---------- */
  supabaseUrl: "https://wnyjqgmqfsodwxwjuzcr.supabase.co",
  supabaseAnonKey: "sb_publishable_U3NyUm9dNXZ7pWkv5bCXFg_dhDon6BQ",

  /* ---------- Brand ---------- */
  brandName: "Arjean Amiscosa",
  brandInitials: "AA",
  brandTagline: "FINANCIAL ROADMAP",
  advisorFirstName: "Arjean",

  /* ---------- Booking ---------- */
  /* Paste a Calendly / Google Calendar appointment / Zcal link here. */
  /* Leave it blank and the results page shows an "I will email you" message. */
  bookingUrl: "",

  /* ---------- Formatting ---------- */
  locale: "en-PH",
  currencySymbol: "₱",

  /* ---------- Behaviour ---------- */
  /* Show the raw score number on the results screen. */
  showScore: true,
  /* Minimum age accepted by the lead form. */
  minAge: 18,
  maxAge: 75
};
