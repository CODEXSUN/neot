import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type NEOTDatabase = {
  schema_migrations: NEOTMigrationsTable;
  neot_users: NEOTUsersTable;
  neot_ideas: IdeasTable;
  neot_idea_comments: IdeaCommentsTable;
  neot_idea_likes: IdeaLikesTable;
  neot_idea_polls: IdeaPollsTable;
  neot_idea_poll_votes: IdeaPollVotesTable;
  neot_idea_attachments: IdeaAttachmentsTable;
  neot_idea_drawings: IdeaDrawingsTable;
  neot_planning_boards: PlanningBoardsTable;
  neot_planning_board_links: PlanningBoardLinksTable;
  neot_planning_comments: PlanningCommentsTable;
  neot_planning_reactions: PlanningReactionsTable;
  neot_orchestration_chat_messages: OrchestrationChatMessagesTable;
  neot_orchestration_chat_threads: OrchestrationChatThreadsTable;
  neot_agent_runs: AgentRunsTable;
  neot_agent_run_steps: AgentRunStepsTable;
  neot_agent_events: AgentEventsTable;
  neot_agent_approvals: AgentApprovalsTable;
  neot_agent_artifacts: AgentArtifactsTable;
  neot_agent_tool_calls: AgentToolCallsTable;
  neot_agent_verifications: AgentVerificationsTable;
  neot_agent_tasks: AgentTasksTable;
  neot_agent_task_dependencies: AgentTaskDependenciesTable;
  neot_agent_parent_reviews: AgentParentReviewsTable;
  neot_agent_personas: AgentPersonasTable;
  neot_model_provider_connections: ModelProviderConnectionsTable;
  neot_project_manager_activity: ProjectManagerActivityTable;
  neot_project_manager_attachments: ProjectManagerAttachmentsTable;
  neot_project_manager_items: ProjectManagerItemsTable;
  neot_project_manager_registry_groups: ProjectManagerRegistryGroupsTable;
  neot_project_manager_registry_modules: ProjectManagerRegistryModulesTable;
  neot_project_manager_registry_platforms: ProjectManagerRegistryPlatformsTable;
  neot_repository_connections: RepositoryConnectionsTable;
  neot_task_manager_activity: TaskManagerActivityTable;
  neot_task_manager_lookups: TaskManagerLookupsTable;
  neot_task_manager_todos: TaskManagerTodosTable;
  neot_telegram_connections: TelegramConnectionsTable;
  neot_telegram_messages: TelegramMessagesTable;
  neot_honey_threads: HoneyThreadsTable;
  neot_honey_messages: HoneyMessagesTable;
  neot_honey_memory: HoneyMemoryTable;
  neot_notifications: NotificationsTable;
  neot_notification_jobs: NotificationJobsTable;
  neot_learning_courses: LearningCoursesTable;
  neot_learning_classes: LearningClassesTable;
  neot_learning_enrollments: LearningEnrollmentsTable;
  neot_learning_subjects: LearningSubjectsTable;
  neot_learning_lessons: LearningLessonsTable;
  neot_learning_questions: LearningQuestionsTable;
  neot_learning_answers: LearningAnswersTable;
  neot_learning_tests: LearningTestsTable;
  neot_learning_test_questions: LearningTestQuestionsTable;
  neot_learning_attempts: LearningAttemptsTable;
  neot_learning_progress: LearningProgressTable;
  neot_learning_discussion_posts: LearningDiscussionPostsTable;
  neot_sync_conflicts: NEOTSyncConflictsTable;
  neot_sync_connections: NEOTSyncConnectionsTable;
  neot_sync_runs: NEOTSyncRunsTable;
  neot_sync_snapshots: NEOTSyncSnapshotsTable;
  neot_sync_tokens: NEOTSyncTokensTable;
};

export type IdeasTable = {
  id: Generated<number>;
  uuid: string;
  assignee_uuids_json: string;
  title: string;
  excerpt: string;
  content_html: string;
  category: string;
  category_color: string;
  tags_json: string;
  project_uuids_json: string;
  status: string;
  status_color: string;
  visibility: "private" | "public";
  author: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};
export type IdeaCommentsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  parent_uuid: string | null;
  body_html: string;
  author: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};
export type IdeaLikesTable = {
  id: Generated<number>;
  uuid: string;
  entity_kind: string;
  entity_uuid: string;
  actor: string;
  created_at: TimestampColumn;
};
export type IdeaPollsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  question: string;
  options_json: string;
  multiple_choice: boolean;
  closes_at: TimestampColumn | null;
  created_at: TimestampColumn;
};
export type IdeaPollVotesTable = {
  id: Generated<number>;
  uuid: string;
  poll_uuid: string;
  option_id: string;
  actor: string;
  created_at: TimestampColumn;
};
export type IdeaAttachmentsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  data_base64: string;
  storage_key: string | null;
  created_by: string;
  created_at: TimestampColumn;
};
export type IdeaDrawingsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  scene_json: string;
  updated_by: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type ModelProviderConnectionsTable = {
  actor_id: string;
  base_url: string;
  created_at: TimestampColumn;
  encrypted_api_key: string | null;
  id: Generated<number>;
  label: string;
  last_error: string | null;
  last_tested_at: TimestampColumn | null;
  model: string;
  provider: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type NotificationsTable = {
  action_url: string | null;
  actor_id: string;
  body: string;
  category: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  metadata_json: string;
  read_at: TimestampColumn | null;
  recipient_actor_id: string;
  recipient_email: string | null;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type NotificationJobsTable = {
  attempts: Generated<number>;
  available_at: TimestampColumn;
  backend: string;
  channel: string;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  failed_at: TimestampColumn | null;
  id: Generated<number>;
  idempotency_key: string;
  last_error: string;
  locked_at: TimestampColumn | null;
  max_attempts: number;
  notification_uuid: string;
  queue_name: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type LearningCoursesTable = {
  author: string;
  cover_image: string;
  position: number;
  theme: string;
  id: Generated<number>;
  uuid: string;
  code: string;
  title: string;
  description: string;
  status: string;
  created_by: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningClassesTable = {
  id: Generated<number>;
  uuid: string;
  course_uuid: string;
  title: string;
  schedule_text: string;
  master_email: string;
  status: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningEnrollmentsTable = {
  id: Generated<number>;
  uuid: string;
  course_uuid: string;
  class_uuid: string | null;
  member_email: string;
  member_name: string;
  role: string;
  status: string;
  created_at: TimestampColumn;
};

export type LearningSubjectsTable = {
  id: Generated<number>;
  uuid: string;
  course_uuid: string;
  title: string;
  description: string;
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningLessonsTable = {
  author: string;
  id: Generated<number>;
  uuid: string;
  subject_uuid: string;
  title: string;
  content: string;
  position: number;
  status: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningDiscussionPostsTable = {
  author: string;
  body: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  lesson_uuid: string;
  parent_uuid: string | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type LearningQuestionsTable = {
  id: Generated<number>;
  uuid: string;
  lesson_uuid: string;
  asked_by: string;
  question_text: string;
  status: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningAnswersTable = {
  id: Generated<number>;
  uuid: string;
  question_uuid: string;
  answered_by: string;
  answer_text: string;
  accepted: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningTestsTable = {
  id: Generated<number>;
  uuid: string;
  course_uuid: string;
  lesson_uuid: string | null;
  title: string;
  instructions: string;
  pass_percentage: number;
  status: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type LearningTestQuestionsTable = {
  id: Generated<number>;
  uuid: string;
  test_uuid: string;
  prompt: string;
  options_json: string;
  correct_option: string;
  points: number;
  position: number;
  created_at: TimestampColumn;
};

export type LearningAttemptsTable = {
  id: Generated<number>;
  uuid: string;
  test_uuid: string;
  student_email: string;
  answers_json: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: number;
  completed_at: TimestampColumn;
  created_at: TimestampColumn;
};

export type LearningProgressTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  last_opened_at: TimestampColumn;
  lesson_uuid: string;
  status: string;
  student_email: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type HoneyThreadsTable = {
  actor_id: string;
  codex_thread_id: string | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type HoneyMessagesTable = {
  actor_id: string;
  body: string;
  context_json: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  uuid: string;
};

export type HoneyMemoryTable = {
  actor_id: string;
  content: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  review_note: string;
  source_label: string;
  supersedes_uuid: string | null;
  version: number;
  source_thread_uuid: string | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type RepositoryConnectionsTable = {
  base_url: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  provider: string;
  repository_slug: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTasksTable = {
  actor_id: string;
  agent_profile: string;
  delegate_persona_uuid: string | null;
  child_run_uuid: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  objective: string;
  parent_run_uuid: string;
  result_summary: string | null;
  scope_json: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  task_key: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentPersonasTable = {
  actor_id: string;
  agent_profile: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  instructions: string;
  name: string;
  persona_key: string;
  role: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTaskDependenciesTable = {
  created_at: TimestampColumn;
  depends_on_task_uuid: string;
  id: Generated<number>;
  task_uuid: string;
};

export type AgentParentReviewsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string;
  id: Generated<number>;
  note: string;
  parent_run_uuid: string;
  uuid: string;
};

export type AgentRunsTable = {
  access_mode: string;
  actor_id: string;
  agent_profile: string;
  connection_id: string;
  supervisor_persona_uuid: string | null;
  assist_mode: string;
  budget_json: string;
  chat_thread_uuid: string;
  codex_thread_id: string | null;
  codex_turn_id: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  error_message: string | null;
  id: Generated<number>;
  model: string;
  objective: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  result_summary: string | null;
  started_at: TimestampColumn | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
  base_revision: string | null;
  branch_name: string | null;
  commit_hash: string | null;
  committed_at: TimestampColumn | null;
  review_status: string;
  source_root: string | null;
  verification_completed_at: TimestampColumn | null;
  verification_fingerprint: string | null;
  verification_status: string;
  workspace_cleaned_at: TimestampColumn | null;
  workspace_mode: string;
  workspace_path: string | null;
  workspace_status: string;
};

export type AgentVerificationsTable = {
  args_json: string;
  attempt_no: number;
  command_id: string;
  command_name: string;
  completed_at: TimestampColumn;
  created_at: TimestampColumn;
  duration_ms: number;
  exit_code: number | null;
  id: Generated<number>;
  label: string;
  required_gate: number;
  run_uuid: string;
  status: string;
  stderr_text: string;
  stdout_text: string;
  uuid: string;
};

export type AgentRunStepsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  label: string;
  output_json: string;
  run_uuid: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  uuid: string;
};

export type AgentEventsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  event_type: string;
  id: Generated<number>;
  payload_json: string;
  run_uuid: string;
  uuid: string;
};

export type AgentApprovalsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string | null;
  decided_at: TimestampColumn | null;
  id: Generated<number>;
  reason: string;
  request_id: number;
  run_uuid: string;
  status: string;
  thread_id: string;
  uuid: string;
};

export type AgentArtifactsTable = {
  artifact_type: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  label: string;
  metadata_json: string;
  path: string;
  run_uuid: string;
  uuid: string;
};

export type AgentToolCallsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  input_json: string;
  output_json: string;
  risk_level: string;
  run_uuid: string;
  started_at: TimestampColumn;
  status: string;
  tool_name: string;
  uuid: string;
};

export type OrchestrationChatThreadsTable = {
  access_mode: string;
  actor_id: string;
  codex_thread_id: string | null;
  connection_id: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  model: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  work_item_key: string | null;
  work_item_kind: string | null;
  work_item_title: string | null;
  work_item_uuid: string | null;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type OrchestrationChatMessagesTable = {
  actions_json: string;
  actor_id: string;
  attachments_json: string;
  body: string;
  created_at: TimestampColumn;
  duration_ms: number | null;
  feedback: string | null;
  files_json: string;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramConnectionsTable = {
  auth_mode: string;
  chat_id: string | null;
  connected_at: TimestampColumn | null;
  created_at: TimestampColumn;
  display_name: string;
  encrypted_session: string | null;
  id: Generated<number>;
  link_token_hash: string;
  status: string;
  telegram_username: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramMessagesTable = {
  body: string;
  chat_id: string;
  created_at: TimestampColumn;
  direction: string;
  id: Generated<number>;
  telegram_message_id: string | null;
  uuid: string;
};

export type PlanningBoardsTable = SyncColumns & {
  created_at: TimestampColumn;
  created_by: string;
  description: string;
  id: Generated<number>;
  project_uuid: string | null;
  scene_json: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type PlanningBoardLinksTable = SyncColumns & {
  board_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type PlanningCommentsTable = SyncColumns & {
  board_uuid: string;
  body: string;
  created_at: TimestampColumn;
  created_by: string;
  element_id: string | null;
  id: Generated<number>;
  mentions_json: string;
  resolved_at: TimestampColumn | null;
  resolved_by: string | null;
  status: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type PlanningReactionsTable = SyncColumns & {
  comment_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  reaction: string;
  uuid: string;
};

export type SyncColumns = {
  sync_direction: ColumnType<string, string | undefined, string | undefined>;
  sync_status: ColumnType<string, string | undefined, string | undefined>;
  sync_updated_at: TimestampColumn;
  sync_version: ColumnType<number, number | undefined, number | undefined>;
};

export type NEOTUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  last_login_at: TimestampColumn | null;
  name: string;
  password_hash: string;
  role: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type NEOTMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  package_id: ColumnType<string, string | undefined, string | undefined>;
};

export type ProjectManagerItemsTable = SyncColumns & {
  active: number;
  assignee: string;
  created_at: TimestampColumn;
  description: string;
  due_date: string;
  id: Generated<number>;
  item_key: string;
  item_type: string;
  kind: string;
  lane: string;
  logo_text: string;
  color_key: string;
  repository_name: string;
  repository_url: string;
  module_key: string;
  priority: string;
  reference_id: string;
  reference_type: string;
  sort_order: number;
  start_date: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryPlatformsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  platform_key: string;
  name: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryGroupsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  group_key: string;
  id: Generated<number>;
  name: string;
  parent_group_uuid: string | null;
  platform_uuid: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryModulesTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  documentation_json: string;
  group_uuid: string;
  id: Generated<number>;
  module_key: string;
  module_type: string;
  name: string;
  parent_module_uuid: string | null;
  planning_notes_json: string;
  route_path: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type ProjectManagerAttachmentsTable = SyncColumns & {
  checksum: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  mime_type: string;
  original_name: string;
  record_kind: string;
  record_uuid: string;
  size_bytes: number;
  storage_key: string;
  uuid: string;
};

export type TaskManagerTodosTable = SyncColumns & {
  category: string;
  created_at: TimestampColumn;
  description: string;
  due_date: string;
  group_name: string;
  project_uuid: string;
  id: Generated<number>;
  owner_email: string;
  position: number;
  priority: string;
  scope_key: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TaskManagerLookupsTable = SyncColumns & {
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  name: string;
  scope_key: string;
  uuid: string;
  value: string;
};

export type TaskManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_uuid: string;
  uuid: string;
};

export type NEOTSyncTokensTable = {
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  label: string;
  last_used_at: TimestampColumn | null;
  status: string;
  token_hash: string;
  uuid: string;
};

export type NEOTSyncConnectionsTable = {
  created_at: TimestampColumn;
  encrypted_token: string;
  id: Generated<number>;
  instance_id: string;
  last_error: string | null;
  last_verified_at: TimestampColumn | null;
  last_published_at: TimestampColumn | null;
  last_pulled_at: TimestampColumn | null;
  remote_revision: number;
  server_id: string;
  server_url: string;
  status: string;
  updated_at: TimestampColumn;
};

export type NEOTSyncSnapshotsTable = {
  checksum: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  payload_json: string;
  published_by: string;
  revision: number;
  server_id: string;
};

export type NEOTSyncRunsTable = {
  completed_at: TimestampColumn | null;
  direction: string;
  error_message: string | null;
  id: Generated<number>;
  local_revision: number;
  record_count: number;
  remote_revision: number;
  started_at: TimestampColumn;
  status: string;
  uuid: string;
};

export type NEOTSyncConflictsTable = {
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  local_version: number;
  record_uuid: string;
  remote_version: number;
  resolved_at: TimestampColumn | null;
  status: string;
  table_name: string;
  uuid: string;
};
