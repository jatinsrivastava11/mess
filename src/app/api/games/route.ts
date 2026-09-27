// POST /api/games  { minutes }  → creates a game and returns its code.
import { randomInt } from "node:crypto";
import { createDoc, isTimeControl, randomCode } from "@/lib/online/game-doc";
import { HttpError, gameRef, readJson, reply, replyError, requireUid } from "@/lib/online/server";

const secureRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const { minutes } = await readJson(req);
    if (!isTimeControl(minutes)) throw new HttpError(400, "Pick a time control.");

    const creatorColor = randomInt(0, 2) === 0 ? "w" : "b";
    // A random code could already be taken; `create` fails in that case, so try a few.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(secureRandom);
      const doc = createDoc({ code, uid, minutes, seed: randomInt(0, 2 ** 32), creatorColor, now: Date.now() });
      try {
        await gameRef(code).create(doc);
        return reply({ code, color: creatorColor });
      } catch (err) {
        if ((err as { code?: number }).code !== 6 /* ALREADY_EXISTS */) throw err;
      }
    }
    throw new HttpError(503, "Couldn't find a free game code. Try again.");
  } catch (err) {
    return replyError(err);
  }
}
