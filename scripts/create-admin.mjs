// Creates (or updates) the admin auth user and links a profiles row with
// role='admin'. Reads config from env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error("Missing one of SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let userId;
  const existing = await findUserByEmail(email);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Updated existing auth user (${email}).`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created auth user (${email}).`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, role: "admin", barber_id: null, full_name: "Admin" }, { onConflict: "id" });
  if (profileError) throw profileError;

  console.log("Linked admin profile (role=admin).");
  console.log("Admin login is ready.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
