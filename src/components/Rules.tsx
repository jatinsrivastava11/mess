import { type PieceDef, KING_DEF, POOL } from "@/lib/game/pieces";
import { PieceLabel } from "./PieceLabel";

const R = 5; // diagrams show squares up to 5 away

/** Mini grid showing every square a piece can jump to from the centre. */
function MoveDiagram({ def }: { def: PieceDef }) {
  const reach = new Set(def.vectors.map(([dx, dy]) => `${dx},${dy}`));
  const cells = [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const centre = dx === 0 && dy === 0;
      cells.push(
        <span
          key={`${dx},${dy}`}
          className="aspect-square"
          style={{
            background: centre ? "var(--fg)" : reach.has(`${dx},${dy}`) ? "var(--accent)" : (dx + dy) % 2 ? "var(--sq-dark)" : "var(--sq-light)",
            opacity: centre || reach.has(`${dx},${dy}`) ? 1 : 0.35,
          }}
        />,
      );
    }
  }
  return <div className="grid w-full grid-cols-11 overflow-hidden rounded">{cells}</div>;
}

function legsText(def: PieceDef) {
  return def.legs.map(([a, b]) => `${a}² + ${b}²${a === b ? " straight" : ""}`).join(" or ");
}

export function Rules() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <section>
        <h3 className="mb-1 font-semibold">The idea</h3>
        <p>
          Every piece is a square root: the <em>hypotenuse</em> of a right triangle whose two sides are whole numbers
          (at least 1). It jumps like a knight, one side&apos;s length one way and the other side&apos;s the other way.{" "}
          <b>√5</b> jumps 1 and 2 (1² + 2² = 5), exactly the knight. If both sides are equal, the piece jumps that
          many squares in a <b>straight line</b> instead: <b>√2</b> steps 1 up, down, left or right, and <b>√8</b> jumps 2.
          Perfect squares are written as whole numbers, so <b>5</b> is √25 (3² + 4²).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold">Rules</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            8×8 board. Each player fills their back two rows with their king (on the back row) and 15 random pieces. The two
            sides are drawn separately.
          </li>
          <li>White moves first. All pieces <b>jump</b>, so pieces in between never block them.</li>
          <li>Land on an enemy piece to capture it. You can&apos;t land on your own pieces.</li>
          <li>
            The king is <b>1</b> (with the crown). It steps one square in any direction. You may never leave your king under
            attack.
          </li>
          <li><b>Checkmate</b>: the king is attacked and has no escape. That player loses.</li>
          <li><b>Stalemate</b>: the player to move has no legal move but isn&apos;t in check. It&apos;s a draw.</li>
          <li>
            <b>Maths points</b>: after 50 moves each with no capture, each side adds up √n for its pieces on the board (the
            king doesn&apos;t count). The bigger sum wins. A counter appears as the limit gets close.
          </li>
          <li>It&apos;s a draw only if the two kings are the last pieces left, or the maths points are exactly equal.</li>
          <li>Resigning loses the game. Use the flag next to your clock (tap twice).</li>
          <li>
            <b>No move hints</b> after your first game: you calculate every move yourself. Want dots back? Play a{" "}
            <b>Tutorial</b> game against the bot.
          </li>
          <li>
            Press <b>←</b> and <b>→</b> (or ◀ ▶ under the board) to look back through the game. It only changes what you
            see, never the game itself.
          </li>
        </ul>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">The pieces</h3>
        <p className="mb-3 text-muted">
          Only pieces that can move from <em>every</em> square of the board are allowed, so each side must be at most 4.
          That leaves these {POOL.length} pieces plus the king. √3 can&apos;t exist, and 2 = √(0² + 2²) doesn&apos;t count
          because a side of 0 isn&apos;t a triangle.
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {[KING_DEF, ...POOL].map((def) => (
            <div key={def.n} className="rounded-xl border border-panel-border p-2">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-math text-lg font-semibold">
                  <PieceLabel n={def.n} />
                </span>
                <span className="text-[10px] text-muted">{def.n === 1 ? "king" : legsText(def)}</span>
              </div>
              <MoveDiagram def={def} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
