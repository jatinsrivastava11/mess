// POST /api/games/:code  { action: "join" | "move" | "resign" | "flag", from?, to?, ply? }
import { CODE_PATTERN, colorOf, flagDoc, joinDoc, moveDoc, resignDoc } from "@/lib/online/game-doc";
import { HttpError, readJson, reply, replyError, requireUid, updateGame, usernameOf } from "@/lib/online/server";

const isSquare = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 64;

export async function POST(req: Request, ctx: RouteContext<"/api/games/[code]">) {
  try {
    const uid = await requireUid(req);
    const code = (await ctx.params).code.toUpperCase();
    if (!CODE_PATTERN.test(code)) throw new HttpError(404, "No game with that code.");
    const body = await readJson(req);
    const name = body.action === "join" ? await usernameOf(uid) : null;

    let color: string | null = null;
    const out = await updateGame(code, (doc, now) => {
      switch (body.action) {
        case "join": {
          const result = joinDoc(doc, uid, now, name);
          color = colorOf(result.doc ?? doc, uid);
          return result;
        }
        case "move": {
          const { from, to, ply } = body;
          if (!isSquare(from) || !isSquare(to) || !Number.isInteger(ply)) throw new HttpError(400, "Bad move.");
          return moveDoc(doc, uid, from, to, ply as number, now);
        }
        case "resign":
          return resignDoc(doc, uid, now);
        case "flag":
          return flagDoc(doc, uid, now);
        default:
          throw new HttpError(400, "Unknown action.");
      }
    });

    if (out.error) return reply({ error: out.error }, out.httpStatus ?? 400);
    return reply({ ok: true, color });
  } catch (err) {
    return replyError(err);
  }
}
