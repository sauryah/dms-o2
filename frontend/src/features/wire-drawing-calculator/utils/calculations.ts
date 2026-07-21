import type { PassData, Statistics, ConsistencyData } from '../types';

export function calculateArea(diameter: number): number {
  return (Math.PI * diameter * diameter) / 4;
}

export function calculateElongation(dBefore: number, dAfter: number): number {
  return ((dBefore * dBefore) / (dAfter * dAfter) - 1) * 100;
}

export function calculateAreaReduction(dBefore: number, dAfter: number): number {
  return (1 - (dAfter * dAfter) / (dBefore * dBefore)) * 100;
}

export function calculateReductionRatio(dBefore: number, dAfter: number): number {
  return (dBefore * dBefore) / (dAfter * dAfter);
}

export function calculateDieFromElongation(dBefore: number, elongation: number): number {
  if (elongation <= -100) return dBefore;
  return dBefore / Math.sqrt(1 + elongation / 100);
}

export function calculateDieFromReduction(dBefore: number, reduction: number): number {
  if (reduction >= 100) return 0;
  return dBefore * Math.sqrt(1 - reduction / 100);
}

export function calculateDieFromRatio(dBefore: number, ratio: number): number {
  if (ratio <= 0) return dBefore;
  return dBefore / Math.sqrt(ratio);
}

export function calculatePassData(dies: number[]): PassData[] {
  if (dies.length < 2) return [];

  const passes: PassData[] = [];
  for (let i = 0; i < dies.length - 1; i++) {
    const fromDie = dies[i];
    const toDie = dies[i + 1];
    passes.push({
      pass: i + 1,
      fromDie,
      toDie,
      areaBefore: calculateArea(fromDie),
      areaAfter: calculateArea(toDie),
      areaReduction: calculateAreaReduction(fromDie, toDie),
      elongation: calculateElongation(fromDie, toDie),
      reductionRatio: calculateReductionRatio(fromDie, toDie),
    });
  }
  return passes;
}

export function calculateStatistics(dies: number[], passes: PassData[]): Statistics {
  if (passes.length === 0) {
    return {
      totalPasses: 0,
      startingDie: 0,
      finalDie: 0,
      avgElongation: 0,
      maxElongation: 0,
      minElongation: 0,
      avgAreaReduction: 0,
      overallAreaReduction: 0,
      overallReductionRatio: 0,
    };
  }

  const elongations = passes.map((p) => p.elongation);
  const reductions = passes.map((p) => p.areaReduction);

  return {
    totalPasses: passes.length,
    startingDie: dies[0],
    finalDie: dies[dies.length - 1],
    avgElongation: elongations.reduce((a, b) => a + b, 0) / elongations.length,
    maxElongation: Math.max(...elongations),
    minElongation: Math.min(...elongations),
    avgAreaReduction: reductions.reduce((a, b) => a + b, 0) / reductions.length,
    overallAreaReduction: calculateAreaReduction(dies[0], dies[dies.length - 1]),
    overallReductionRatio: calculateReductionRatio(dies[0], dies[dies.length - 1]),
  };
}

export function calculateConsistency(passes: PassData[]): ConsistencyData {
  if (passes.length === 0) {
    return { avgElongation: 0, variation: 0, qualityRating: 'N/A', stars: 0 };
  }

  const elongations = passes.map((p) => p.elongation);
  const avg = elongations.reduce((a, b) => a + b, 0) / elongations.length;
  const maxDeviation = Math.max(
    ...elongations.map((e) => Math.abs(e - avg))
  );

  let stars: number;
  let qualityRating: string;

  if (maxDeviation <= 1) {
    stars = 5;
    qualityRating = 'Excellent';
  } else if (maxDeviation <= 2) {
    stars = 4;
    qualityRating = 'Very Good';
  } else if (maxDeviation <= 3) {
    stars = 3;
    qualityRating = 'Good';
  } else if (maxDeviation <= 5) {
    stars = 2;
    qualityRating = 'Fair';
  } else {
    stars = 1;
    qualityRating = 'Poor';
  }

  return {
    avgElongation: avg,
    variation: maxDeviation,
    qualityRating,
    stars,
  };
}

export function suggestIntermediateDies(
  dies: number[],
  targetElongation: number
): number[] {
  if (dies.length < 2) return dies;

  const suggested: number[] = [dies[0]];

  for (let i = 0; i < dies.length - 1; i++) {
    const dBefore = dies[i];
    const dAfter = dies[i + 1];
    const currentElongation = calculateElongation(dBefore, dAfter);

    if (Math.abs(currentElongation - targetElongation) > 2) {
      const numNewPasses = Math.max(
        1,
        Math.round(
          Math.log(dBefore / dAfter) /
            Math.log(1 / Math.sqrt(1 + targetElongation / 100))
        )
      );

      for (let j = 1; j < numNewPasses; j++) {
        const ratio = j / numNewPasses;
        const newDiameter =
          dBefore * Math.pow(dAfter / dBefore, ratio);
        const rounded = Math.round(newDiameter * 1000) / 1000;

        if (
          rounded < dBefore &&
          rounded > dAfter &&
          suggested[suggested.length - 1] !== rounded
        ) {
          suggested.push(rounded);
        }
      }
    }

    if (suggested[suggested.length - 1] !== dAfter) {
      suggested.push(dAfter);
    }
  }

  return suggested;
}
