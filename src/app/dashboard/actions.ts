"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { toDateParam } from "@/lib/date";

export async function getWorkoutDatesForMonth(year: number, month: number): Promise<string[]> {
  const { userId } = await auth.protect();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const rows = await db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, start), lt(workouts.startedAt, end)));

  return [...new Set(rows.map((row) => toDateParam(row.startedAt)))];
}
