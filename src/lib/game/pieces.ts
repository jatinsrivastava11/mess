// The piece pool for mess.
//
// A piece is a number √n. It jumps to any square (dx, dy) with dx² + dy² = n,
// i.e. n is the squared hypotenuse and |dx|, |dy| are the triangle's legs.
// If n can be split into two squares in more than one way (25 = 3²+4² = 0²+5²),
// the piece gets every split. A piece is only allowed in the game if it has at
// least one move from EVERY square of an empty board.
//
// The king is "1" (√1). It is special: it steps one square in any of the
// 8 directions, like a chess king, instead of only orthogonally.

export const BOARD_SIZE = 8;
export const KING = 1;

export type Vec = readonly [dx: number, dy: number];

export interface PieceDef {
  /** The number under the root. */
  n: number;
  /** How it's written on the piece: "√5", or "2" for √4. */
  label: string;
  /** Distinct leg pairs [a, b] with a ≤ b and a² + b² = n. */
  legs: [number, number][];
  /** Every jump vector the piece can make. */
  vectors: Vec[];
}

export function labelFor(n: number): string {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? String(r) : `√${n}`;
}

/** All (dx, dy) sign/swap variants of each leg pair, without duplicates. */
function vectorsFromLegs(legs: [number, number][]): Vec[] {
  const seen = new Set<string>();
  const out: Vec[] = [];
  for (const [a, b] of legs) {
    for (const [p, q] of [[a, b], [b, a]]) {
      for (const sp of [1, -1]) {
        for (const sq of [1, -1]) {
          const v: Vec = [p * sp, q * sq];
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
  for (let a = 0; a <= maxLeg; a++) {
    for (let b = a; b <= maxLeg; b++) {
      if (a === 0 && b === 0) continue;
      const n = a * a + b * b;
      if (!legsByN.has(n)) legsByN.set(n, []);
      legsByN.get(n)!.push([a, b]);
    }
  }

  const pool: PieceDef[] = [];
  for (const [n, legs] of [...legsByN].sort((x, y) => x[0] - y[0])) {
    if (n === KING) continue;
    const vectors = vectorsFromLegs(legs);
    if (movableEverywhere(vectors, size)) {
      pool.push({ n, label: labelFor(n), legs, vectors });
    }
  }
  return pool;
}

export const POOL: PieceDef[] = computePool();

export const KING_DEF: PieceDef = {
  n: KING,
  label: "1",
  legs: [[0, 1], [1, 1]],
  vectors: vectorsFromLegs([[0, 1], [1, 1]]),
};

const DEFS = new Map<number, PieceDef>([[KING, KING_DEF], ...POOL.map((d) => [d.n, d] as const)]);

export function pieceDef(n: number): PieceDef {
  const def = DEFS.get(n);
  if (!def) throw new Error(`√${n} is not a mess piece`);
  return def;
}
