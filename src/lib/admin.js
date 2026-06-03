// Admin emails. RLS policies in supabase/schema.sql must match this list.
// To add an admin: add the email to BOTH this array and the SQL policy.
export const ADMIN_EMAILS = "mulupurisrijith@gmail.com";

export function isAdmin(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS === user.email.toLowerCase();
}
