// Admin emails. RLS policies in supabase/schema.sql must match this list.
// To add an admin: add the email to BOTH this array and the SQL policy.
export const ADMIN_EMAILS = [
  "mulupurisrijith@gmail.com",
  // 'another-admin@example.com',  // add additional admin emails here
];

export function isAdmin(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
