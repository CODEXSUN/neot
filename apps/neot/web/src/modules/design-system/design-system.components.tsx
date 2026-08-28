import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_VARIANT_MARKER,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  WorkspacePage,
  designSystemVariants,
  isDesignSystemVariantId,
  type DesignSystemVariantId
} from "@neot/ui";
import { InfoIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

type ComponentGroup = {
  description: string;
  id: string;
  preview: React.ReactNode;
  title: string;
};

function PreviewCard({ description, preview, title }: ComponentGroup) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-28 flex-wrap items-center gap-3">{preview}</CardContent>
    </Card>
  );
}

export function DesignSystemComponentsWorkspace() {
  const [query, setQuery] = useState("");
  const [variantId, setVariantId] = useState<DesignSystemVariantId>(() => {
    const stored = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
    return stored && isDesignSystemVariantId(stored) ? stored : "default";
  });

  const groups = useMemo<ComponentGroup[]>(
    () => [
      {
        description: "Primary, secondary, outline, ghost, and destructive actions.",
        id: "actions",
        preview: (
          <>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </>
        ),
        title: "Buttons"
      },
      {
        description: "Compact semantic labels for workflow and system state.",
        id: "status",
        preview: (
          <>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Attention</Badge>
          </>
        ),
        title: "Badges"
      },
      {
        description: "Text, long-form, boolean, and selection controls.",
        id: "inputs",
        preview: (
          <div className="grid w-full gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="design-system-name">Name</Label>
              <Input id="design-system-name" placeholder="Component name" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue="workspace">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="design-system-description">Description</Label>
              <Textarea
                id="design-system-description"
                placeholder="Describe the component contract"
              />
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox defaultChecked /> Enabled
            </Label>
            <Label className="flex items-center gap-2">
              <Switch defaultChecked /> Published
            </Label>
          </div>
        ),
        title: "Form controls"
      },
      {
        description: "Notices, progress, loading, and contextual feedback.",
        id: "feedback",
        preview: (
          <div className="w-full space-y-4">
            <Alert>
              <InfoIcon className="size-4" />
              <AlertTitle>Shared presentation contract</AlertTitle>
              <AlertDescription>
                NEOT consumes these components from the public UI package.
              </AlertDescription>
            </Alert>
            <Progress value={64} />
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ),
        title: "Feedback"
      },
      {
        description: "Tabbed surfaces for related views without route changes.",
        id: "navigation",
        preview: (
          <Tabs className="w-full" defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">Rendered component preview.</TabsContent>
            <TabsContent value="usage">Use the public @neot/ui export.</TabsContent>
          </Tabs>
        ),
        title: "Tabs"
      }
    ],
    []
  );

  const visibleGroups = groups.filter((group) =>
    `${group.title} ${group.description}`.toLowerCase().includes(query.toLowerCase())
  );

  const selectVariant = (nextId: string) => {
    if (!isDesignSystemVariantId(nextId)) return;
    setVariantId(nextId);
    window.localStorage.setItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY, nextId);
  };

  return (
    <div {...{ [DESIGN_SYSTEM_VARIANT_MARKER]: variantId }}>
      <WorkspacePage
        actions={
          <Select onValueChange={selectVariant} value={variantId}>
            <SelectTrigger className="w-48" aria-label="Design system theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {designSystemVariants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  {variant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        description="Browse the shared CODEXSUN component contract and preview every supported theme."
        technicalName="neot-design-system-components"
        title="Design System Components"
      >
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components"
            value={query}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleGroups.map((group) => (
            <PreviewCard key={group.id} {...group} />
          ))}
        </div>
      </WorkspacePage>
    </div>
  );
}
