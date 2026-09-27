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
  return def.legs.map(([a, b]) => `${a}² + ${b}²`).join(" or ");
}

export function Rules() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <section>
        <h3 className="mb-1 font-semibold">The idea</h3>
        <p>
          Every piece is a square root. It jumps to any square that forms a right triangle with it as the
          <em> hypotenuse</em>. <b>√5</b> jumps 1 one way and 2 the other (1² + 2² = 5), exactly like a knight.
          Perfect squares are written as whole numbers: <b>5</b> is √25 and can jump (3, 4) <em>or</em> (0, 5).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold">Rules</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>8×8 board. Each player gets their king and 7 random pieces on their back row. The two sides are drawn separately.</li>
          <li>White moves first. All pieces <b>jump</b>, so pieces in between never block them.</li>
          <li>Land on an enemy piece to capture it. You can&apos;t land on your own pieces.</li>
          <li>
            The king is <b>1</b> (with the crown). It steps one square in any direction. You may never leave your king under
            attack.
          </li>
          <li><b>Checkmate</b>: the king is attacked and has no escape. That player loses.</li>
          <li><b>Stalemate</b>: the player to move has no legal move but isn&apos;t in check. It&apos;s a draw.</li>
          <li>It is also a draw when only the two kings are left, or after 50 moves each with no capture.</li>
          <li>Resigning loses the game.</li>
        </ul>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">The pieces</h3>
        <p className="mb-3 text-muted">
          Only pieces that can move from <em>every</em> square of the board are allowed, so each leg must be at most 4.
          That leaves these {POOL.length} pieces plus the king.
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
