export type HoneyAction = {
  href?: string;
  id: "explain-error" | "open-project" | "review-deployment" | "start-agent" | "view-task";
  label: string;
  prompt?: string;
};
type HoneyContext = {
  pathname?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  recentError?: string | null;
  runStatus?: string | null;
  taskId?: string | null;
};

const actions: Record<HoneyAction["id"], HoneyAction> = {
  "explain-error": {
    id: "explain-error",
    label: "Explain an error",
    prompt: "Help me understand this error and suggest the safest next step: "
  },
  "open-project": { href: "/app/neot/tasks", id: "open-project", label: "Open related work" },
  "review-deployment": {
    href: "/app/neot/agent-ide",
    id: "review-deployment",
    label: "Review deployment"
  },
  "start-agent": { href: "/app/neot/agent-ide", id: "start-agent", label: "Start Project Agent" },
  "view-task": { href: "/app/neot/tasks", id: "view-task", label: "View task" }
};

export function resolveHoneyActions(request: string, context?: HoneyContext): HoneyAction[] {
  const ids: HoneyAction["id"][] = [];
  const failedRun = /failed|error|blocked/iu.test(context?.runStatus ?? "");
  if (
    context?.recentError ||
    failedRun ||
    /\b(?:error|failed|failure|exception|broken|issue|troubleshoot)\b/iu.test(request)
  )
    ids.push("explain-error");
  if (
    context?.pathname?.includes("deployment") ||
    context?.runStatus ||
    /\b(?:deploy|deployment|production|release|rollback)\b/iu.test(request)
  )
    ids.push("review-deployment");
  if (context?.taskId || /\b(?:task|todo|work item|next step)\b/iu.test(request))
    ids.push("view-task");
  if (context?.projectId || /\b(?:project|repository|workspace|roadmap)\b/iu.test(request))
    ids.push("open-project");
  ids.push("start-agent", "open-project", "view-task");
  return [...new Set(ids)].slice(0, 3).map((id) => contextualAction(id, request, context));
}

function contextualAction(
  id: HoneyAction["id"],
  request: string,
  context?: HoneyContext
): HoneyAction {
  if (id === "explain-error" && context?.recentError) {
    return {
      ...actions[id],
      prompt: `Explain this error and suggest the safest next step: ${context.recentError.slice(0, 500)}`
    };
  }
  if (id === "open-project" && context?.projectId) {
    return {
      ...actions[id],
      href: `/app/neot/tasks?project=${encodeURIComponent(context.projectId)}`
    };
  }
  if (id === "view-task" && context?.taskId) {
    return { ...actions[id], href: `/app/neot/tasks?task=${encodeURIComponent(context.taskId)}` };
  }
  if (id === "review-deployment" && context?.runStatus) {
    return { ...actions[id], label: `Review ${context.runStatus} run` };
  }
  if (id === "start-agent") {
    const params = new URLSearchParams();
    if (context?.projectId) params.set("project", context.projectId);
    if (context?.taskId) params.set("task", context.taskId);
    if (context?.runStatus) params.set("runStatus", context.runStatus);
    params.set("objective", request.slice(0, 800));
    params.set("source", "honey");
    return {
      ...actions[id],
      href: `/app/neot/agent-ide?${params.toString()}`,
      label: context?.projectTitle
        ? `Start Project Agent for ${context.projectTitle}`
        : actions[id].label
    };
  }
  return actions[id];
}
