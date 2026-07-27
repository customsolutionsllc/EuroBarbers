// Shared helper for staff (barber) username-based login.
// Barbers sign in with a username instead of an email. Internally each barber
// auth account is created with a synthetic email of `<username>@<domain>`, so
// the login form and the account-creation server action must agree on this.

export const STAFF_EMAIL_DOMAIN = "staff.eurobarbers.com";

/** Normalize a username to its synthetic login email. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
}

/** True when the input already looks like an email address. */
export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

/** Valid usernames: letters, numbers, dot, dash, underscore (3–30 chars). */
export function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{3,30}$/.test(value.trim().toLowerCase());
}
