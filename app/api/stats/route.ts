import { apiHandler } from "@/lib/api";
import { payments, completions, habits } from "@/lib/db";
import { eq, and, sum, count, desc, sql } from "drizzle-orm";

interface HabitStreak {
  habit_id: string;
  habit_name: string;
  current_streak: number;
}

interface KidStats {
  total_sats_earned: number;
  streaks: HabitStreak[];
  pending_completions: number;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  // Total sats earned (sum of paid payments)
  const satsResult = await db
    .select({ total: sql<number>`COALESCE(${sum(payments.amount_sats)}, 0)` })
    .from(payments)
    .where(and(eq(payments.to_user_id, session.user_id), eq(payments.status, "paid")));

  const totalSatsEarned = Number(satsResult[0].total);

  // Pending completions count
  const pendingResult = await db
    .select({ pending_count: count() })
    .from(completions)
    .where(and(eq(completions.user_id, session.user_id), eq(completions.status, "pending")));

  const pendingCompletions = Number(pendingResult[0].pending_count);

  // Current streak per habit
  const activeHabits = await db
    .select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(and(eq(habits.assigned_to, session.user_id), eq(habits.active, true)));

  const streaks: HabitStreak[] = [];

  for (const habit of activeHabits) {
    const habitCompletions = await db
      .select({ date: completions.date })
      .from(completions)
      .where(
        and(
          eq(completions.habit_id, habit.id),
          eq(completions.user_id, session.user_id),
          eq(completions.status, "approved")
        )
      )
      .orderBy(desc(completions.date));

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(today);

    for (const completion of habitCompletions) {
      const completionDate = new Date(completion.date);
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

  const stats: KidStats = {
    total_sats_earned: totalSatsEarned,
    streaks,
    pending_completions: pendingCompletions,
  };

  return stats;
});
