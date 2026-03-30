import { apiHandler } from "@/lib/api";
import { payments, completions, habits } from "@/lib/db";
import { eq, and, sum, count, desc, sql, inArray } from "drizzle-orm";
import { todayDateStr } from "@/lib/date";

interface HabitStreak {
  habit_id: string;
  habit_name: string;
  current_streak: number;
}

interface KidStats {
  totalSats: number;
  todaySats: number;
  bestStreak: number;
  pendingCount: number;
  streaks: HabitStreak[];
}

/**
 * GET /api/stats
 *
 * User stats: total sats earned, today's sats, best streak, and pending completions.
 */
export const GET = apiHandler(async (_req, { session, db }) => {
  const today = todayDateStr();

  // Total sats earned (sum of paid payments)
  const satsResult = await db
    .select({ total: sql<number>`COALESCE(${sum(payments.amount_sats)}, 0)` })
    .from(payments)
    .where(and(eq(payments.to_user_id, session.user_id), eq(payments.status, "paid")));

  const totalSatsEarned = Number(satsResult[0].total);

  // Today's sats: sum of paid payments for today's completions
  const todaySatsResult = await db
    .select({ total: sql<number>`COALESCE(${sum(payments.amount_sats)}, 0)` })
    .from(payments)
    .innerJoin(completions, eq(completions.id, payments.completion_id))
    .where(
      and(
        eq(payments.to_user_id, session.user_id),
        eq(payments.status, "paid"),
        eq(completions.date, today)
      )
    );

  const todaySats = Number(todaySatsResult[0].total);

  // Pending completions count
  const pendingResult = await db
    .select({ pending_count: count() })
    .from(completions)
    .where(and(eq(completions.user_id, session.user_id), eq(completions.status, "pending")));

  const pendingCompletions = Number(pendingResult[0].pending_count);

  // Current streak per habit — batch query (no N+1)
  const activeHabits = await db
    .select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(and(eq(habits.assigned_to, session.user_id), eq(habits.active, true)));

  const streaks: HabitStreak[] = [];

  if (activeHabits.length > 0) {
    const habitIds = activeHabits.map((h) => h.id);

    // Single query for all completions across all active habits
    const allCompletions = await db
      .select({ habit_id: completions.habit_id, date: completions.date })
      .from(completions)
      .where(
        and(
          inArray(completions.habit_id, habitIds),
          eq(completions.user_id, session.user_id),
          eq(completions.status, "approved")
        )
      )
      .orderBy(desc(completions.date));

    // Group by habit_id
    const completionsByHabit = new Map<string, string[]>();
    for (const c of allCompletions) {
      const list = completionsByHabit.get(c.habit_id) ?? [];
      list.push(c.date);
      completionsByHabit.set(c.habit_id, list);
    }

    for (const habit of activeHabits) {
      const dates = completionsByHabit.get(habit.id) ?? [];

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(today);

      for (const dateStr of dates) {
        const completionDate = new Date(dateStr);
        completionDate.setHours(0, 0, 0, 0);

        const expectedDateStr = checkDate.toISOString().split("T")[0];
        const completionDateStr = completionDate.toISOString().split("T")[0];

        if (completionDateStr === expectedDateStr) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (completionDateStr < expectedDateStr) {
          if (streak === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayStr = checkDate.toISOString().split("T")[0];
            if (completionDateStr === yesterdayStr) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      streaks.push({
        habit_id: habit.id,
        habit_name: habit.name,
        current_streak: streak,
      });
    }
  }

  const bestStreak = streaks.length > 0
    ? Math.max(...streaks.map((s) => s.current_streak))
    : 0;

  const stats: KidStats = {
    totalSats: totalSatsEarned,
    todaySats,
    bestStreak,
    pendingCount: pendingCompletions,
    streaks,
  };

  return stats;
});
