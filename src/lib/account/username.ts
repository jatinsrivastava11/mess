// Username rules, shared by the sign-up form and the server.

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

// Names that could be used to impersonate the site.
const RESERVED = new Set(["admin", "administrator", "mess", "root", "support", "moderator", "mod", "system", "staff", "official", "null", "undefined"]);

/** The lookup key: usernames are unique ignoring case ("Jatin" and "jatin" are the same name). */
export const usernameKey = (name: string) => name.trim().toLowerCase();

/** An error message, or null if the name is allowed. */
export function usernameProblem(raw: string): string | null {
  const name = raw.trim();
  if (!USERNAME_PATTERN.test(name)) return "Use 3–16 letters, numbers or underscores.";
  if (RESERVED.has(usernameKey(name))) return "That name is reserved.";
  return null;
}

/** Client-side password check. Firebase enforces its own minimum on the server too. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Use at least one letter and one number.";
  if (password.length > 128) return "That's too long.";
  return null;
}
