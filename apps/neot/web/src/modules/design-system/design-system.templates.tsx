import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  WorkspacePage,
} from "@neot/ui";
import {
  LayoutDashboardIcon,
  ListIcon,
  PanelTopIcon,
  SquarePenIcon,
} from "lucide-react";

function TemplateCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: typeof LayoutDashboardIcon;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DesignSystemTemplatesWorkspace() {
  return (
    <WorkspacePage
      description="Reference layouts for consistent CODEXSUN list, detail, form, and dashboard workspaces."
      technicalName="neot-design-system-templates"
      title="Design System Templates"
    >
      <Tabs defaultValue="list">
        <TabsList className="flex h-auto w-fit flex-wrap">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <TemplateCard
            description="Search, actions, status, and rows in one predictable workspace."
            icon={ListIcon}
            title="List workspace"
          >
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <Input className="max-w-sm" placeholder="Search records" />
                <Button>Create</Button>
              </div>
              <Separator />
              {["Primary record", "Secondary record", "Archived record"].map(
                (label, index) => (
                  <div
                    className="flex items-center justify-between gap-3 py-1"
                    key={label}
                  >
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        Updated {index + 1} day{index ? "s" : ""} ago
                      </p>
                    </div>
                    <Badge variant={index === 2 ? "outline" : "secondary"}>
                      {index === 2 ? "Archived" : "Active"}
                    </Badge>
                  </div>
                ),
              )}
            </div>
          </TemplateCard>
        </TabsContent>
        <TabsContent value="details">
          <TemplateCard
            description="Identity, state, metadata, and related information."
            icon={PanelTopIcon}
            title="Details workspace"
          >
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">Record title</p>
                  <p className="text-sm text-muted-foreground">
                    Stable technical identifier
                  </p>
                </div>
                <Badge>Active</Badge>
              </div>
              <Separator />
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd className="font-medium">Workspace team</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="font-medium">Recently</dd>
                </div>
              </dl>
            </div>
          </TemplateCard>
        </TabsContent>
        <TabsContent value="form">
          <TemplateCard
            description="Labelled fields, clear grouping, and explicit actions."
            icon={SquarePenIcon}
            title="Upsert form"
          >
            <div className="max-w-2xl space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <Label htmlFor="template-title">Title</Label>
                <Input id="template-title" placeholder="Enter a title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Add useful context"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </div>
            </div>
          </TemplateCard>
        </TabsContent>
        <TabsContent value="dashboard">
          <TemplateCard
            description="Summary metrics followed by the work that needs attention."
            icon={LayoutDashboardIcon}
            title="Dashboard workspace"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Total", "24"],
                ["Active", "18"],
                ["Needs attention", "6"],
              ].map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle>{value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TemplateCard>
        </TabsContent>
      </Tabs>
    </WorkspacePage>
  );
}
