import { auth } from "@clerk/nextjs/server";
import { asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { exercises } from "@/db/schema";

// Exercises are a shared catalog (no per-user ownership), but we still require
// a signed-in session so the catalog is never readable anonymously.
export async function getExercises() {
  await auth.protect();

  return db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .orderBy(asc(exercises.name));
}

// Case-insensitive lookup by name; creates the exercise if it doesn't exist.
// `ilike` with no wildcards is an exact, case-insensitive match.
export async function findOrCreateExercise(rawName: string) {
  await auth.protect();

  const name = rawName.trim();

  const [existing] = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(ilike(exercises.name, name))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(exercises)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: exercises.id, name: exercises.name });
  if (created) return created;

  // Lost a race with an identical concurrent insert — read the winner.
  const [winner] = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(eq(exercises.name, name))
    .limit(1);

  return winner ?? null;
}
