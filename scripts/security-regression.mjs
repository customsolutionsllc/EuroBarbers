// Run only against a disposable local database with migrations 0001–0009 applied.
// SECURITY_TEST_DATABASE_URL=postgresql://.../eurobarbers_security_test node scripts/security-regression.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const connectionString = process.env.SECURITY_TEST_DATABASE_URL;
if (!connectionString) throw new Error("Set SECURITY_TEST_DATABASE_URL to a disposable local *_test database.");
const target = new URL(connectionString);
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) {
  throw new Error("Refusing to test a non-local or non-test database.");
}
const db = new pg.Client({ connectionString });
await db.connect();
let checks = 0;
const ids = Object.fromEntries(["service", "barber", "otherBarber", "staff", "otherStaff", "unlinked", "admin", "noProfile"].map((key) => [key, randomUUID()]));
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
async function denied(sql, args, message) {
  await db.query("savepoint expected_denial");
  try {
    await assert.rejects(db.query(sql, args), message);
    checks++;
  } finally {
    await db.query("rollback to savepoint expected_denial");
    await db.query("release savepoint expected_denial");
  }
}
async function asRole(role, user = "") {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
  await db.query(`set local role ${role}`);
}

try {
  await db.query("begin");
  await db.query("insert into shop_settings(id) values(true) on conflict do nothing");
  await db.query("update shop_settings set walk_in_checkin_open=true, timezone='America/New_York', max_days_ahead=60, min_notice_minutes=30");
  await db.query("insert into services(id,slug,name,price_cents,duration_minutes,buffer_after_minutes) values($1,$2,'Security check',1000,30,5)", [ids.service, ids.service]);
  await db.query("insert into barbers(id,slug,name) values($1::uuid,$1::text,'Review barber'),($2::uuid,$2::text,'Other review barber')", [ids.barber, ids.otherBarber]);
  await db.query("insert into barber_services(barber_id,service_id) values($1,$3),($2,$3)", [ids.barber, ids.otherBarber, ids.service]);
  await db.query("insert into barber_availability(barber_id,day_of_week,start_time,end_time) select $1,d,'10:00','19:00' from generate_series(0,6) d", [ids.barber]);
  for (const id of [ids.staff, ids.otherStaff, ids.unlinked, ids.admin, ids.noProfile]) await db.query("insert into auth.users(id) values($1)", [id]);
  await db.query("insert into profiles(id,role,barber_id) values($1,'barber',$2),($3,'barber',$4),($5,'barber',null),($6,'admin',null)", [ids.staff, ids.barber, ids.otherStaff, ids.otherBarber, ids.unlinked, ids.admin]);

  await asRole("service_role");
  const args = [ids.service, `Review-${ids.service}`, "Customer", "6145550171", "saved@example.invalid"];
  const joinSql = "select join_walk_in_queue($2,$3,$4,$5,$1,null,true,false) as result";
  const queue = (await db.query(joinSql, args)).rows[0].result;
  await db.query("select join_walk_in_queue($2,$3,$4,'forged@example.invalid',$1,null,true,true)", args.slice(0,4));
  await asRole("anon");
  check((await db.query("select id from walk_in_queue where id=$1", [queue.queue_id])).rowCount, 0);
  check((await db.query("select id from check_ins where id=$1", [queue.check_in_id])).rowCount, 0);
  await denied("select take_next_customer($1)", [ids.barber], /permission denied/);
  await denied("select update_walk_in_status($1,'completed',null)", [queue.queue_id], /permission denied/);
  await denied("select upsert_customer('Forged','Person','1234567',null,true,true,'forged')", [], /permission denied/);
  await denied(joinSql, args, /permission denied/);
  await denied("select * from lobby_queue_view", [], /does not exist/);
  await denied("select * from get_lobby_queue('incorrect-token')", [], /INVALID_TOKEN/);

  for (const user of [ids.unlinked, ids.noProfile]) {
    await asRole("authenticated", user);
    check((await db.query("select id from walk_in_queue where id=$1", [queue.queue_id])).rowCount, 0);
    await denied("select take_next_customer($1)", [ids.barber], /NOT_AUTHORIZED/);
    await denied("select update_walk_in_status($1,'next',null)", [queue.queue_id], /NOT_AUTHORIZED/);
  }
  await asRole("authenticated", ids.staff);
  await denied("select update_walk_in_status($1,'in_chair',$2)", [queue.queue_id, ids.otherBarber], /NOT_AUTHORIZED/);
  const claimed = (await db.query("select update_walk_in_status($1,'next',$2) as result", [queue.queue_id, ids.barber])).rows[0].result;
  check(claimed.served_by_barber_id, ids.barber);
  check((await db.query("select phone from get_staff_queue() where id=$1", [queue.queue_id])).rows[0].phone, null);
  await asRole("authenticated", ids.otherStaff);
  await denied("select update_walk_in_status($1,'completed',null)", [queue.queue_id], /NOT_AUTHORIZED/);
  check((await db.query("select id from walk_in_queue where id=$1", [queue.queue_id])).rowCount, 0);
  await asRole("authenticated", ids.admin);
  check((await db.query("select email,sms_marketing_consent from customers where id=$1", [queue.customer_id])).rows[0], { email: "saved@example.invalid", sms_marketing_consent: false });
  check((await db.query("select update_walk_in_status($1,'completed',null) as result", [queue.queue_id])).rows[0].result.status, "completed");

  await asRole("service_role");
  const create = "select create_appointment($1,$2,'Booking','Review','6145550172',null,$3,false,false,null) as result";
  const dates = (await db.query("select (((now() at time zone 'America/New_York')::date+1)+time '23:45') at time zone 'America/New_York' as overnight, (((now() at time zone 'America/New_York')::date+1)+time '18:25') at time zone 'America/New_York' as valid, now()+interval '70 days' as distant")).rows[0];
  await denied(create, [ids.service, ids.barber, dates.overnight], /OUTSIDE_HOURS/);
  await denied(create, [ids.service, null, dates.overnight], /NO_BARBER_AVAILABLE/);
  await denied(create, [ids.service, ids.barber, dates.distant], /TOO_FAR_AHEAD/);
  check((await db.query("select * from get_available_slots($1,null,current_date+70)", [ids.service])).rowCount, 0);
  const booking = (await db.query(create, [ids.service, ids.barber, dates.valid])).rows[0].result;
  check(booking.status, "confirmed");
  check(new Date(booking.ends_at).getTime() - dates.valid.getTime(), 35 * 60 * 1000);
  await denied(create, [ids.service, ids.barber, dates.valid], /SLOT_TAKEN/);
  console.log(`PASS ${checks} database security regressions; all fixture changes rolled back.`);
} finally {
  await db.query("rollback");
  await db.end();
}
