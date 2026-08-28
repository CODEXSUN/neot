import { invoke } from "@tauri-apps/api/core";
import type {
  AgentAccess,
  AgentConfig,
  CompassReleaseEvent,
  AgentMessage,
  AgentRuntimeStatus,
  AgentTask,
  DesktopProfile,
  DesktopSetup,
  DesktopWorkspace,
  FileEntry,
  ExternalEditor,
  GitChange,
  GitFileDiff,
  GitWorktree,
  LocalTask,
  ProjectTask,
  ProjectIdea,
  ProjectIdeaDiscussion,
  ProjectTaskRun,
  SyncResult,
  SystemStatus,
  SearchMatch,
  ProjectSkill,
  ProjectLearning,
  ProjectLearningSettings,
  ProjectLearningSummary,
  ProjectGitOverview,
  PythonEnvironment,
  WorkGroupScan,
  TerminalResult,
  TerminalShell,
  Workspace
} from "../contracts/desktop";

export class DesktopClient {
  private agentRuntime: Promise<AgentRuntimeStatus> | undefined;

  async startAgentRuntime() {
    this.agentRuntime ??= invoke<AgentRuntimeStatus>("start_agent_runtime").catch((reason) => {
      this.agentRuntime = undefined;
      throw reason;
    });
    return this.agentRuntime;
  }

  async startAgentThread() {
    return invoke<number>("start_agent_thread");
  }

  async runOpenCodeTask(taskId: number, model: string, prompt: string) {
    return invoke<string>("run_opencode_task", { model, prompt, taskId });
  }

  async resumeAgentThread(taskId: number, threadId: string) {
    return invoke<number>("resume_agent_thread", { taskId, threadId });
  }

  async listAgentTasks() {
    return invoke<AgentTask[]>("list_agent_tasks");
  }

  async getAgentTask(taskId: number) {
    return invoke<AgentTask>("get_agent_task", { taskId });
  }

  async saveAgentTask(threadId: string, title: string, access: AgentAccess, surface: "chat" | "runner" | "project" = "chat", localTaskId?: number) {
    return invoke<AgentTask>("save_agent_task", { access, localTaskId, surface, threadId, title });
  }

  async getRunnerTask(localTaskId: number) {
    return invoke<AgentTask | null>("get_runner_task", { localTaskId });
  }

  async listAgentMessages(taskId: number) {
    return invoke<AgentMessage[]>("list_agent_messages", { taskId });
  }

  async saveAgentMessage(taskId: number, id: string, role: AgentMessage["role"], content: string) {
    return invoke<AgentMessage>("save_agent_message", { content, id, role, taskId });
  }

  async deleteAgentMessage(taskId: number, id: string) {
    return invoke<boolean>("delete_agent_message", { id, taskId });
  }

  async archiveAgentTask(taskId: number) {
    return invoke<boolean>("archive_agent_task", { taskId });
  }

  async renameAgentTask(taskId: number, title: string) {
    return invoke<AgentTask>("rename_agent_task", { taskId, title });
  }

  async deleteAgentTask(taskId: number) {
    return invoke<boolean>("delete_agent_task", { taskId });
  }

  async requestAgentTaskReview(taskId: number) {
    return invoke<AgentTask>("request_agent_task_review", { taskId });
  }

  async setAgentTaskStatus(taskId: number, status: AgentTask["runStatus"]) {
    return invoke<AgentTask>("set_agent_task_status", { status, taskId });
  }

  async sendAgentTurn(taskId: number, threadId: string, prompt: string, access: AgentAccess) {
    return invoke<number>("send_agent_turn", { access, prompt, taskId, threadId });
  }

  async interruptAgentTurn(threadId: string, turnId: string) {
    return invoke<number>("interrupt_agent_turn", { threadId, turnId });
  }

  async answerAgentApproval(requestId: number, decision: string) {
    return invoke<void>("answer_agent_approval", { decision, requestId });
  }

  async openWorkspace(path?: string) {
    return invoke<Workspace>("open_workspace", { path: path ?? null });
  }

  async openWorkspaceFolder(path: string) {
    return invoke<void>("open_workspace_folder", { path });
  }

  async getDesktopSetup() {
    return invoke<DesktopSetup>("get_desktop_setup");
  }

  async saveDesktopProfile(profile: DesktopProfile) {
    return invoke<DesktopProfile>("save_desktop_profile", { profile });
  }

  async saveDesktopWorkspace(workspace: DesktopWorkspace) {
    return invoke<DesktopWorkspace>("save_desktop_workspace", { workspace });
  }

  async setDesktopWorkspacePinned(path: string, pinned: boolean) {
    return invoke<DesktopWorkspace>("set_desktop_workspace_pinned", { path, pinned });
  }

  async saveDesktopProjectDetails(workspace: DesktopWorkspace) {
    return invoke<DesktopWorkspace>("save_desktop_project_details", { workspace });
  }

  async listDesktopProjectIdeas(path: string) { return invoke<ProjectIdea[]>("list_desktop_project_ideas", { path }); }
  async saveDesktopProjectIdea(path: string, title: string, context: string, discussion: string) { return invoke<ProjectIdea>("save_desktop_project_idea", { context, discussion, path, title }); }
  async convertDesktopProjectIdea(path: string, ideaId: number) { return invoke<ProjectIdea>("convert_desktop_project_idea", { ideaId, path }); }
  async listDesktopProjectIdeaDiscussions(path: string, ideaId: number) { return invoke<ProjectIdeaDiscussion[]>("list_desktop_project_idea_discussions", { ideaId, path }); }
  async saveDesktopProjectIdeaDiscussion(path: string, ideaId: number, content: string) { return invoke<ProjectIdeaDiscussion>("save_desktop_project_idea_discussion", { content, ideaId, path }); }

  async readDesktopProjectChangelog(path: string, changelogPath?: string) {
    return invoke<string>("read_desktop_project_changelog", { changelogPath: changelogPath ?? null, path });
  }

  async chooseDesktopProjectChangelog(path: string) {
    return invoke<string | null>("choose_desktop_project_changelog", { path });
  }

  async getDesktopProjectGitOverview(path: string) {
    return invoke<ProjectGitOverview>("desktop_project_git_overview", { path });
  }

  async setDefaultDesktopWorkspace(path: string) {
    return invoke<string>("set_default_desktop_workspace", { path });
  }

  async clearDefaultDesktopWorkspace() {
    return invoke<void>("clear_default_desktop_workspace");
  }

  async removeDesktopWorkspace(path: string) {
    return invoke<boolean>("remove_desktop_workspace", { path });
  }

  async resetDesktopWorkGroup() {
    return invoke<DesktopProfile>("reset_desktop_work_group");
  }

  async chooseWorkGroup() {
    return invoke<WorkGroupScan>("choose_work_group");
  }

  async scanWorkGroup(path?: string) {
    return invoke<WorkGroupScan>("scan_work_group", { path: path ?? null });
  }

  async cloneGitHubRepository(url: string, kind: string, relationship: string) {
    return invoke<WorkGroupScan>("clone_github_repository", {
      request: { kind, relationship, url }
    });
  }

  async saveRepositoryUrl(url: string, kind: string, relationship: string) {
    return invoke<WorkGroupScan>("save_repository_url", {
      request: { kind, relationship, url }
    });
  }

  async listFiles(path = ".") {
    return invoke<FileEntry[]>("list_files", { path });
  }

  async readFile(path: string) {
    return invoke<string>("read_text_file", { path });
  }

  async writeFile(path: string, content: string) {
    return invoke<void>("write_text_file", { content, path });
  }

  async gitStatus() {
    return invoke<GitChange[]>("git_status");
  }

  async gitChangeFingerprint() {
    return invoke<string>("git_change_fingerprint");
  }

  async gitDiff(path?: string) {
    return invoke<string>("git_diff", { path: path ?? null });
  }

  async gitFileDiff(path: string, originalPath?: string) {
    return invoke<GitFileDiff>("git_file_diff", {
      originalPath: originalPath ?? null,
      path
    });
  }

  async gitStage(paths: string[], expectedFingerprint: string) {
    return invoke<void>("git_stage", { expectedFingerprint, paths });
  }

  async gitUnstage(paths: string[]) {
    return invoke<void>("git_unstage", { paths });
  }

  async gitCommit(message: string, expectedFingerprint: string) {
    return invoke<string>("git_commit", { expectedFingerprint, message });
  }

  async gitWorktrees() {
    return invoke<GitWorktree[]>("git_worktrees");
  }

  async gitCreateWorktree(name: string) {
    return invoke<GitWorktree>("git_create_worktree", { name });
  }

  async gitRemoveWorktree(path: string) {
    return invoke<void>("git_remove_worktree", { path });
  }

  async searchWorkspace(query: string) {
    return invoke<SearchMatch[]>("search_workspace", { query });
  }

  async listProjectSkills() {
    return invoke<ProjectSkill[]>("list_project_skills");
  }

  async projectLearningSummary() {
    return invoke<ProjectLearningSummary>("project_learning_summary");
  }

  async scanProjectLearning() {
    return invoke<ProjectLearningSummary>("scan_project_learning");
  }

  async saveProjectLearningSettings(enabled: boolean, autoScan: boolean) {
    return invoke<ProjectLearningSettings>("save_project_learning_settings", {
      autoScan,
      enabled
    });
  }

  async reviewProjectLearning(id: number, status: "approved" | "rejected") {
    return invoke<ProjectLearning>("review_project_learning", { id, status });
  }

  async projectLearningContext() {
    return invoke<string>("project_learning_context");
  }

  async startTerminal(shell: TerminalShell) {
    return invoke<string>("start_terminal", { shell });
  }

  async writeTerminal(sessionId: string, data: string) {
    return invoke<void>("write_terminal", { data, sessionId });
  }

  async closeTerminal(sessionId: string) {
    return invoke<void>("close_terminal", { sessionId });
  }

  async listExternalEditors() {
    return invoke<ExternalEditor[]>("list_external_editors");
  }

  async openInExternalEditor(editorId: string, path?: string) {
    return invoke<void>("open_in_external_editor", { editorId, path: path ?? null });
  }

  async run(command: string, args: string[] = []) {
    return invoke<TerminalResult>("run_workspace_command", { args, command });
  }
  async runCompassReleaseStep(action: "inspect" | "validate" | "version-bump" | "commit-push" | "publish-release", title?: string, message?: string) {
    return invoke<CompassReleaseEvent[]>("run_compass_release_step", { action, message: message ?? null, title: title ?? null });
  }

  async systemStatus() {
    return invoke<SystemStatus>("system_status");
  }

  async pythonEnvironmentStatus() {
    return invoke<PythonEnvironment>("python_environment_status");
  }

  async createPythonEnvironment() {
    return invoke<PythonEnvironment>("create_python_environment");
  }

  async listTasks() {
    return invoke<LocalTask[]>("list_local_tasks");
  }

  async saveTask(title: string, execution: string) {
    return invoke<LocalTask>("save_local_task", { execution, title });
  }

  async updateTask(taskId: number, title: string, execution: string, status: LocalTask["status"], scheduledAt?: string | null) {
    return invoke<LocalTask>("update_local_task", { execution, scheduledAt: scheduledAt ?? null, status, taskId, title });
  }

  async forceDeleteTask(taskId: number) {
    return invoke<boolean>("force_delete_local_task", { taskId });
  }

  async listProjectTasks() {
    return invoke<ProjectTask[]>("list_project_tasks");
  }

  async saveProjectTask(title: string, instructions: string, schedule: ProjectTask["schedule"], agentModel: ProjectTask["agentModel"], skillPath?: string | null) {
    return invoke<ProjectTask>("save_project_task", { agentModel, instructions, schedule, skillPath: skillPath ?? null, title });
  }

  async updateProjectTask(taskId: number, title: string, instructions: string, schedule: ProjectTask["schedule"], agentModel: ProjectTask["agentModel"], status: ProjectTask["status"], skillPath?: string | null) {
    return invoke<ProjectTask>("update_project_task", { agentModel, instructions, schedule, skillPath: skillPath ?? null, status, taskId, title });
  }

  async deleteProjectTask(taskId: number) {
    return invoke<boolean>("delete_project_task", { taskId });
  }

  async copyProjectTaskToWorkspace(taskId: number, destinationWorkspacePath: string) {
    return invoke<ProjectTask>("copy_project_task_to_workspace", { destinationWorkspacePath, taskId });
  }

  async moveProjectTask(taskId: number, direction: "up" | "down") {
    return invoke<ProjectTask[]>("move_project_task", { direction, taskId });
  }

  async queueProjectTaskRun(taskId: number) {
    return invoke<ProjectTaskRun>("queue_project_task_run", { taskId });
  }

  async listProjectTaskRuns(taskId: number) {
    return invoke<ProjectTaskRun[]>("list_project_task_runs", { taskId });
  }

  async updateProjectTaskRun(runId: number, status: "running" | "awaiting-input" | "completed" | "failed" | "stopped", summary: string) {
    return invoke<ProjectTaskRun>("update_project_task_run", { runId, status, summary });
  }

  async bindProjectTaskRunAgentTask(runId: number, agentTaskId: number) {
    return invoke<ProjectTaskRun>("bind_project_task_run_agent_task", { agentTaskId, runId });
  }

  async deleteProjectTaskRun(runId: number) {
    return invoke<boolean>("delete_project_task_run", { runId });
  }

  async setTaskStatus(taskId: number, status: LocalTask["status"]) {
    return invoke<LocalTask>("set_local_task_status", { status, taskId });
  }

  async sync(apiUrl: string, accessToken: string) {
    return invoke<SyncResult>("sync_neot", { accessToken, apiUrl });
  }

  async getAgentConfig(): Promise<AgentConfig> {
    try {
      const res = await invoke<AgentConfig | { config: AgentConfig }>("get_agent_config");
      if (res && typeof res === "object" && "config" in res && res.config) {
        return res.config;
      }
      return res as AgentConfig;
    } catch (error) {
      console.warn(
        "[desktopClient] get_agent_config IPC unavailable, using fallback scaffolding:",
        error
      );
      return getFallbackAgentConfig();
    }
  }

  async saveAgentConfig(config: AgentConfig): Promise<AgentConfig> {
    try {
      const res = await invoke<AgentConfig | { config: AgentConfig }>("save_agent_config", {
        config
      });
      if (res && typeof res === "object" && "config" in res && res.config) {
        return res.config;
      }
      return res as AgentConfig;
    } catch (error) {
      console.warn(
        "[desktopClient] save_agent_config IPC unavailable, returning saved scaffolding config:",
        error
      );
      return config;
    }
  }
}

export function getFallbackAgentConfig(): AgentConfig {
  return {
    codexPath: "",
    defaultAccess: "workspaceWrite",
    autoStart: false,
    approvalPolicy: "on-request",
    sandboxType: "workspace-write",
    networkAccess: false,
    maxTurns: 50,
    idleTimeout: 180,
    defaultProvider: "codex",
    providers: {
      codex: { enabled: true, isDefault: true, model: "gpt-5.6-terra", reasoningEffort: "low" },
      openrouter: { enabled: false, isDefault: false },
      opencode: { enabled: false, isDefault: false },
      claude: { enabled: false, isDefault: false },
      gemini: {
        enabled: false,
        isDefault: false,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.0-flash"
      },
      ollama: { enabled: true, isDefault: false, baseUrl: "http://localhost:11434" }
    }
  };
}

export const desktopClient = new DesktopClient();
