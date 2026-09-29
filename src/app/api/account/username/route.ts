// POST /api/account/username  { username, check?: true }
//  - check: is this name free? (any signed-in visitor, for the sign-up form)
//  - claim: reserve it for this account and create the profile (email accounts only)
import { usernameKey, usernameProblem } from "@/lib/account/username";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, hasEmailAccount, readJson, reply, replyError, requireUser, userRef, usernameRef } from "@/lib/online/server";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const problem = usernameProblem(username);
    if (problem) throw new HttpError(400, problem);
    const key = usernameKey(username);

    if (body.check) {
      const taken = (await usernameRef(key).get()).exists;
      return reply({ available: !taken });
    }

    // Guests can't hold names, so nobody can squat usernames without an account.
    if (!(await hasEmailAccount(user.uid))) throw new HttpError(403, "Create an account first.");

    await adminDb().runTransaction(async (tx) => {
      const [profile, owner] = await Promise.all([tx.get(userRef(user.uid)), tx.get(usernameRef(key))]);
      if (profile.get("username")) throw new HttpError(409, "You already have a username.");
      if (owner.exists) throw new HttpError(409, "That username is taken.");
      const now = Date.now();
      tx.create(usernameRef(key), { uid: user.uid, createdAt: now });
      tx.set(userRef(user.uid), { username, wins: 0, createdAt: now });
    });
    return reply({ ok: true, username });
  } catch (err) {
    return replyError(err);
  }
}
