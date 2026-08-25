export function formatSet(set: { reps: number; weight: string | null }) {
  return set.weight ? `${set.reps} × ${Number(set.weight)} lb` : `${set.reps} reps`;
}
