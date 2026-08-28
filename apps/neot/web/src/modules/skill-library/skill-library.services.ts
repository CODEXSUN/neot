import { apiGet, apiGetBlob, apiPost, apiPut } from "../../shared/api/neot-api";
import type { SkillSummary } from "./skill-library.types";

export const listSkills = () => apiGet<SkillSummary[]>("/skills");
export const createSkill = (input: { description: string; name: string }) =>
  apiPost<SkillSummary>("/skills", input);
export const createSkillReference = (name: string, file: string, content: string) =>
  apiPost<{ file: string; skill: SkillSummary }>(`/skills/${name}/files`, { content, file });
export const readSkillFile = (name: string, file: string) =>
  apiGet<{ content: string; file: string }>(`/skills/${name}/files/${encodePath(file)}`);
export const saveSkillFile = (name: string, file: string, content: string) =>
  apiPut<SkillSummary>(`/skills/${name}/files/${encodePath(file)}`, { content });
export const setSkillUsage = (name: string, input: { prompting: boolean; review: boolean }) =>
  apiPut<SkillSummary>(`/skills/${name}/usage`, input);
export const downloadSkill = (name: string) => apiGetBlob(`/skills/${name}/download`);

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
