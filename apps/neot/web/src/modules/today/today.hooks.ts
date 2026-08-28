import { useQuery } from "@tanstack/react-query";
import { buildTodayDashboard } from "./today.dashboard";
import { getTodaySources } from "./today.services";

export const todayDashboardKey = ["neot", "today"] as const;

export function useTodayDashboard() {
  return useQuery({
    queryFn: async () => {
      return buildTodayDashboard(await getTodaySources());
    },
    queryKey: todayDashboardKey,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}
