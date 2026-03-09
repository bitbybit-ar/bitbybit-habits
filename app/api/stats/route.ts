import { apiHandler } from "@/lib/api";

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
  const satsResult = await db`
    SELECT COALESCE(SUM(p.amount_sats), 0) AS total_sats
    FROM payments p
    WHERE p.to_user_id = ${session.user_id}
      AND p.status = 'paid'
  `;
  const totalSatsEarned = Number(satsResult[0].total_sats);

  // Pending completions count
  const pendingResult = await db`
    SELECT COUNT(*) AS pending_count
    FROM completions c
    WHERE c.user_id = ${session.user_id}
      AND c.status = 'pending'
  `;
  const pendingCompletions = Number(pendingResult[0].pending_count);

  // Current streak per habit
  const habits = await db`
    SELECT id, name FROM habits
    WHERE assigned_to = ${session.user_id}
      AND active = true
  `;

  const streaks: HabitStreak[] = [];

  for (const habit of habits) {
    const completions = await db`
      SELECT date FROM completions
      WHERE habit_id = ${habit.id}
        AND user_id = ${session.user_id}
        AND status = 'approved'
      ORDER BY date DESC
    `;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(today);

    for (const completion of completions) {
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
      habit_id: habit.id as string,
      habit_name: habit.name as string,
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
