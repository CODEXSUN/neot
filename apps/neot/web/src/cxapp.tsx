import type { SidemenuItem } from "@neot/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@neot/ui/blocks/menu/sidemenu/top-menu";
import {
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  CircleHelpIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  WrenchIcon
} from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type NEOTWorkspaceContribution = {
  component: LazyExoticComponent<ComponentType>;
  group: string;
  id: string;
  title: string;
};

const workspace = (
  id: string,
  title: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): NEOTWorkspaceContribution => ({
  component: lazy(load),
  group,
  id,
  title
});

const workspaces = Object.freeze([
  workspace("dashboard", "Dashboard", "My Work", () =>
    import("./modules/dashboard").then((module) => ({
      default: module.DashboardWorkspace
    }))
  ),
  workspace("ideas", "Ideas", "Work", () =>
    import("./modules/ideas").then((module) => ({
      default: module.IdeasWorkspace
    }))
  ),
  workspace("messenger", "Messenger", "Work", () =>
    import("./modules/messaging").then((module) => ({
      default: module.MessagingWorkspace
    }))
  ),
  workspace("learning", "Learning Home", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="overview" />
    }))
  ),
  workspace("courses", "Courses", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="courses" />
    }))
  ),
  workspace("classes", "Classes", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="classes" />
    }))
  ),
  workspace("subjects", "Subjects", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="subjects" />
    }))
  ),
  workspace("lessons", "Lessons", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="lessons" />
    }))
  ),
  workspace("questions", "Questions", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="questions" />
    }))
  ),
  workspace("answers", "Answers", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="answers" />
    }))
  ),
  workspace("tests", "Tests & Quizzes", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="tests" />
    }))
  ),
  workspace("performance", "Performance", "Learning", () =>
    import("./modules/learning").then((module) => ({
      default: () => <module.LearningWorkspace section="performance" />
    }))
  ),
  workspace("blog", "Blog", "Content", () =>
    import("./modules/blog").then((module) => ({
      default: module.NEOTBlogWorkspace
    }))
  ),
  workspace("files", "File Manager", "Content", () =>
    import("./modules/file-manager").then((module) => ({
      default: module.NEOTFileManagerWorkspace
    }))
  ),
  workspace("apps", "App Desk", "System", () =>
    import("./modules/app-desk").then((module) => ({
      default: module.AppDeskWorkspace
    }))
  ),
  workspace("docs", "Documentation", "Knowledge", () =>
    import("./modules/docs").then((module) => ({
      default: module.DocsWorkspace
    }))
  ),
  workspace("project-sync", "Local-first Sync", "Cloud", () =>
    import("./modules/sync").then((module) => ({
      default: module.ProjectSyncSettingsWorkspace
    }))
  ),
  workspace("agent-ide", "Project Agent", "Agents", () =>
    import("./modules/agent-ide").then((module) => ({
      default: module.AgentIdeWorkspace
    }))
  ),
  workspace("honey", "Honey Chat", "Agents", () =>
    import("./modules/honey").then((module) => ({ default: module.HoneyWorkspace }))
  ),
  workspace("launch-desk", "Agent Connector", "Agents", () =>
    import("./modules/launch-desk").then((module) => ({
      default: module.LaunchDeskWorkspace
    }))
  ),
  workspace("skills", "Skill Library", "Agents", () =>
    import("./modules/skill-library").then((module) => ({
      default: module.SkillLibraryWorkspace
    }))
  ),
  workspace("my-work", "My Work", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: module.MyWorkWorkspace
    }))
  ),
  workspace("overview", "Work Overview", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: module.WorkOverviewWorkspace
    }))
  ),
  workspace("tasks", "Tasks", "Work", () =>
    Promise.all([import("./modules/task-manager"), import("./modules/work-hub")]).then(
      ([tasks, hub]) => ({
        default: () => (
          <hub.WorkShell current="Tasks">
            <tasks.TaskManagerWorkspace />
          </hub.WorkShell>
        )
      })
    )
  ),
  workspace("issues", "Issues", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Issues" />
    }))
  ),
  workspace("sprints", "Sprints", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Sprints" />
    }))
  ),
  workspace("releases", "Releases", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Releases" />
    }))
  ),
  workspace("telegram-connect", "Connect Telegram", "Telegram", () =>
    import("./modules/telegram-support").then((module) => ({
      default: module.TelegramConnectWorkspace
    }))
  ),
  workspace("telegram-chat", "Telegram Chat", "Telegram", () =>
    import("./modules/telegram-support").then((module) => ({
      default: module.TelegramChatWorkspace
    }))
  ),
  workspace("registry", "Platform Registry", "Development", () =>
    import("./modules/platform-registry").then((module) => ({
      default: module.PlatformRegistryWorkspace
    }))
  ),
  workspace("planning", "Whiteboards", "Planning", () =>
    import("./modules/planning").then((module) => ({
      default: module.PlanningWorkspace
    }))
  ),
  workspace("design-system-components", "Components", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemComponentsWorkspace
    }))
  ),
  workspace("design-system-templates", "Templates", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemTemplatesWorkspace
    }))
  )
]);

export const neotWebBundle = Object.freeze({
  id: "neot",
  rootPath: "/app/neot",
  title: "NEOT",
  version: "1.0.22",
  workspaces,
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Learning for students, masters, and organisations.",
      icon: WrenchIcon,
      title: "App Desk",
      url: "/app/neot/apps"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: LayoutDashboardIcon,
        isActive: activeWorkspaceId === "dashboard",
        title: "Dashboard",
        url: "/app/neot/dashboard"
      },
      {
        icon: LightbulbIcon,
        isActive: activeWorkspaceId === "ideas",
        title: "Ideas",
        url: "/app/neot/ideas"
      },
      {
        icon: MessagesSquareIcon,
        isActive: activeWorkspaceId === "messenger",
        title: "Messenger",
        url: "/app/neot/messenger"
      },
      {
        icon: GraduationCapIcon,
        isActive: activeWorkspaceId === "learning",
        title: "Learning Home",
        url: "/app/neot/learning"
      },
      {
        icon: GraduationCapIcon,
        isActive: activeWorkspaceId === "courses",
        title: "Courses",
        url: "/app/neot/courses"
      },
      {
        icon: BookOpenIcon,
        isActive: activeWorkspaceId === "subjects",
        title: "Subjects",
        url: "/app/neot/subjects"
      },
      {
        icon: ListTodoIcon,
        isActive: activeWorkspaceId === "lessons",
        title: "Lessons",
        url: "/app/neot/lessons"
      },
      {
        icon: CircleHelpIcon,
        isActive: activeWorkspaceId === "questions" || activeWorkspaceId === "answers",
        items: [
          {
            isActive: activeWorkspaceId === "questions",
            title: "Questions",
            url: "/app/neot/questions"
          },
          { isActive: activeWorkspaceId === "answers", title: "Answers", url: "/app/neot/answers" }
        ],
        title: "Questions & Answers"
      },
      {
        icon: FolderKanbanIcon,
        isActive: activeWorkspaceId === "classes",
        title: "Classes",
        url: "/app/neot/classes"
      },
      {
        icon: ClipboardCheckIcon,
        isActive: activeWorkspaceId === "tests",
        title: "Tests & Quizzes",
        url: "/app/neot/tests"
      },
      {
        icon: ChartNoAxesColumnIcon,
        isActive: activeWorkspaceId === "performance",
        title: "Performance",
        url: "/app/neot/performance"
      }
    ];
  },
  resolveWorkspace(pathname: string): NEOTWorkspaceContribution | undefined {
    const [surface, packageId, section = "orchestration", page] = pathname
      .split("/")
      .filter(Boolean);
    if (surface !== "app" || packageId !== "neot") return undefined;
    const workspaceId = section === "design-system" && page ? `design-system-${page}` : section;
    return workspaces.find((entry) => entry.id === workspaceId);
  }
});
