import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import {
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceSelect
} from "@neot/ui/workspace";
import { WorkspaceFormBanner } from "@neot/ui/workspace/upsert";
import { platformRegistrySchema } from "./platform-registry.schema";
import type { PlatformRegistryFormPayload } from "./platform-registry.types";

export function PlatformRegistryForm({
  loading,
  onSave,
  value
}: {
  loading: boolean;
  onSave: (payload: PlatformRegistryFormPayload) => void;
  value?: PlatformRegistryFormPayload;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<PlatformRegistryFormPayload>({
    active: value?.active ?? true,
    description: value?.description ?? "",
    key: value?.key ?? "",
    name: value?.name ?? "",
    parentId: value?.parentId ?? "",
    status: value?.status ?? "active"
  });
  const result = useMemo(() => platformRegistrySchema.safeParse(form), [form]);
  const errors =
    submitted && !result.success ? result.error.issues.map((issue) => issue.message) : [];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (result.success) onSave(result.data);
      }}
    >
      <WorkspaceFormPanel title="Registry details">
        {errors.length ? (
          <WorkspaceFormBanner title="Unable to save">{errors.join(" ")}</WorkspaceFormBanner>
        ) : null}
        <WorkspaceFormGrid>
          <WorkspaceFormField label="Name" required>
            <Input
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Key" required>
            <Input
              value={form.key}
              onChange={(event) => setForm((state) => ({ ...state, key: event.target.value }))}
            />
          </WorkspaceFormField>
          <WorkspaceFormField className="md:col-span-2" label="Description">
            <Input
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((state) => ({ ...state, description: event.target.value }))
              }
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Status">
            <WorkspaceSelect
              value={form.status ?? "active"}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" }
              ]}
              onValueChange={(status) =>
                setForm((state) => ({ ...state, active: status === "active", status }))
              }
            />
          </WorkspaceFormField>
        </WorkspaceFormGrid>
      </WorkspaceFormPanel>
      <div className="mt-5 flex justify-end border-t pt-4">
        <Button type="submit" disabled={loading}>
          <Save className="size-4" />
          Save
        </Button>
      </div>
    </form>
  );
}
