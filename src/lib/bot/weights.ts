// Evaluation weights used by the bot, learned by self-play (scripts/train-bot.ts).
// Texel tuning on 22065 positions from 3000 self-play games.
// Validation vs the untrained starting guess: 57.8% at depth 2,
// 58.3% at depth 3 (200 games each, boards unseen in training).
// Regenerate with: npm run train:bot
import type { Weights } from "./evaluate";

export const TRAINED_WEIGHTS: Weights = {
  "values": {
    "2": 87,
    "5": 191,
    "8": 99,
    "10": 158,
    "13": 150,
    "17": 134,
    "18": 112,
    "20": 123,
    "25": 109,
    "32": 134
  },
  "mobility": 4.1,
  "kingDanger": 6.2,
  "mopUp": 12
};
