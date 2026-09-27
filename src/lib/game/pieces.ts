// The piece pool for mess.
//
// A piece is a number √n, the hypotenuse of a right triangle with whole-number
// legs a, b ≥ 1 (a² + b² = n). A zero-length leg isn't a triangle, so 0² + 2²
// doesn't count and there is no piece "2".
//
// Movement:
//  - unequal legs (a ≠ b) jump like a knight: a one way, b the other
//    (√5 = 1,2 is exactly the knight);
//  - equal legs (a = a) jump a squares in a straight line: up, down, left or
//    right (√2 steps 1, √8 jumps 2, ...).
// If n splits into legs in more than one way (√50 = 1,7 or 5,5 on big boards),
// the piece gets every split. A piece is only allowed in the game if it has at
// least one move from EVERY square of an empty board.
//
// The king is "1". It isn't a triangle, so it gets its own rule: one step in
// any of the 8 directions, like a chess king.

export const BOARD_SIZE = 8;
export const KING = 1;

export type Vec = readonly [dx: number, dy: number];

export interface PieceDef {
  /** The number under the root. */
  n: number;
  /** How it's written on the piece: "√5", or "2" for √4. */
  label: string;
  /** Distinct leg pairs [a, b] with 1 ≤ a ≤ b and a² + b² = n. */
  legs: [number, number][];
  /** Every jump vector the piece can make. */
  vectors: Vec[];
}

export function labelFor(n: number): string {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? String(r) : `√${n}`;
}

/** Jump vectors for a set of legs: knight-style for a ≠ b, straight lines for a = b. */
export function movesFromLegs(legs: [number, number][]): Vec[] {
  const seen = new Set<string>();
  const out: Vec[] = [];
  for (const [a, b] of legs) {
    const shapes = a === b ? [[a, 0], [0, a]] : [[a, b], [b, a]];
    for (const [p, q] of shapes) {
      for (const sp of [1, -1]) {
        for (const sq of [1, -1]) {
          const v: Vec = [p * sp || 0, q * sq || 0]; // `|| 0` turns -0 into 0
          const key = `${v[0]},${v[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push(v);
          }
        }
      }
    }
  }
  return out;
}

function onBoard(x: number, y: number, size: number) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

/** True if the piece has at least one move from every square of an empty board. */
function movableEverywhere(vectors: Vec[], size: number): boolean {
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (!vectors.some(([dx, dy]) => onBoard(x + dx, y + dy, size))) return false;
    }
  }
  return true;
}

/** Every legal non-king piece for a board of the given size, sorted by n. */
export function computePool(size = BOARD_SIZE): PieceDef[] {
  const maxLeg = size - 1;
  const legsByN = new Map<number, [number, number][]>();
  for (let a = 1; a <= maxLeg; a++) {
    for (let b = a; b <= maxLeg; b++) {
      const n = a * a + b * b;
      if (!legsByN.has(n)) legsByN.set(n, []);
      legsByN.get(n)!.push([a, b]);
    }
  }

  const pool: PieceDef[] = [];
  for (const [n, legs] of [...legsByN].sort((x, y) => x[0] - y[0])) {
    const vectors = movesFromLegs(legs);
    if (movableEverywhere(vectors, size)) {
      pool.push({ n, label: labelFor(n), legs, vectors });
    }
  }
  return pool;
}

export const POOL: PieceDef[] = computePool();

const KING_STEPS: Vec[] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

export const KING_DEF: PieceDef = { n: KING, label: "1", legs: [], vectors: KING_STEPS };

const DEFS = new Map<number, PieceDef>([[KING, KING_DEF], ...POOL.map((d) => [d.n, d] as const)]);

export function pieceDef(n: number): PieceDef {
  const def = DEFS.get(n);
  if (!def) throw new Error(`√${n} is not a mess piece`);
  return def;
}
