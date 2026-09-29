// Evaluation weights used by the bot. Overwritten by `npm run train:bot`.
import { type Weights, mobilityWeights } from "./evaluate";

export const TRAINED_WEIGHTS: Weights = mobilityWeights();
