import { apiGet } from "../../shared/api/neot-api";
import type { TodayProjectManagerResult } from "./today.types";

export async function getTodaySources() {
  return apiGet<TodayProjectManagerResult>("/admin/project-manager/result");
}
