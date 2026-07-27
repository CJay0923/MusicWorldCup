// Bracket generation utilities

export function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTiers(N) {
  const tiers = [];
  const maxTiers = Math.min(Math.log2(N) - 1, 5);
  for (let t = 1; t <= maxTiers; t++) {
    const count = Math.pow(2, t - 1);
    const start = t === 1 ? 0 : N / Math.pow(2, t);
    const step = t === 1 ? N / 2 : N / Math.pow(2, t - 1);
    const zones = [];
    for (let i = 0; i < count; i++) zones.push(start + i * step);
    tiers.push({ zones, count });
  }
  return tiers;
}

export function generateSeededBracket(entrants, seeds, bracketSize) {
  const N = bracketSize;
  const pos = new Array(N).fill(null);
  const tiers = generateTiers(N);
  const numSeeds = tiers.reduce((s, t) => s + t.count, 0);

  let seedPtr = 0;
  for (const tier of tiers) {
    const tierSeeds = [];
    for (let i = 0; i < tier.count; i++) tierSeeds.push(seeds[seedPtr++]);
    const shuffled = shuffleArr(tierSeeds);
    for (let i = 0; i < tier.count; i++) {
      const zonePos = tier.zones[i];
      const finalPos = Math.random() < 0.5 ? Math.floor(zonePos) : Math.floor(zonePos) + 1;
      pos[finalPos] = shuffled[i];
    }
  }

  // Fill remaining slots with non-seeded entrants
  const rest = [];
  for (let i = numSeeds; i < seeds.length && rest.length < N - numSeeds; i++) rest.push(seeds[i]);
  const shuffledRest = shuffleArr(rest);
  let ri = 0;
  for (let i = 0; i < N; i++) {
    if (pos[i] === null) pos[i] = shuffledRest[ri++];
  }

  return pos.map(idx => {
    const e = entrants[idx];
    return e ? { ...e } : null;
  }).filter(Boolean);
}

export function generateRoundNames(bracketSize) {
  const names = [];
  let sz = bracketSize;
  const nm = { 2: '决赛', 4: '4强', 8: '8强', 16: '16强', 32: '32强', 64: '64强', 128: '128强' };
  while (sz > 1) {
    names.push(nm[sz] || sz + '强');
    sz /= 2;
  }
  return names;
}

export function freshRounds(bracketSize, entrants, seeds) {
  const numRounds = Math.log2(bracketSize);
  const rounds = [];
  rounds[0] = generateSeededBracket(entrants, seeds, bracketSize);
  for (let i = 1; i <= numRounds; i++) {
    rounds[i] = new Array(rounds[i - 1].length / 2).fill(null);
  }
  return rounds;
}
