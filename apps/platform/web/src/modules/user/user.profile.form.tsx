import { useState } from "react";
import { SaveIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@neot/ui/workspace/upsert";
import { userProfileSchema } from "./user.schema";
import type { UserProfile, UserProfileFormValue, UserProfileSavePayload } from "./user.types";

export function UserProfileForm({
  error,
  loading,
  onSubmit,
  profile
}: {
  error?: string;
  loading: boolean;
  onSubmit: (payload: UserProfileSavePayload) => void;
  profile: UserProfile;
}) {
  const [validationError, setValidationError] = useState("");
  const [value, setValue] = useState<UserProfileFormValue>({
    confirmPassword: "",
    email: profile.email,
    name: profile.name,
    password: ""
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = userProfileSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the profile details.");
          return;
        }
        setValidationError("");
        const { confirmPassword: _confirmPassword, password, ...identity } = parsed.data;
        onSubmit(password ? { ...identity, password } : identity);
      }}
    >
      <WorkspaceFormSurface>
        <WorkspaceFormBody>
          {validationError || error ? (
            <WorkspaceFormBanner title="Unable to update profile">
              {validationError || error}
            </WorkspaceFormBanner>
          ) : null}
          <WorkspaceFormGrid columns={2}>
            <WorkspaceFormField label="User name" required>
              <Input
                value={value.name}
                onChange={(event) =>
                  setValue((current) => ({ ...current, name: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Email" required>
              <Input
                type="email"
                value={value.email}
                onChange={(event) =>
                  setValue((current) => ({ ...current, email: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="New password">
              <Input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={value.password ?? ""}
                onChange={(event) =>
                  setValue((current) => ({ ...current, password: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Confirm password">
              <Input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={value.confirmPassword}
                onChange={(event) =>
                  setValue((current) => ({ ...current, confirmPassword: event.target.value }))
                }
              />
            </WorkspaceFormField>
          </WorkspaceFormGrid>
        </WorkspaceFormBody>
        <WorkspaceFormActions>
          <Button disabled={loading} type="submit">
            <SaveIcon />
            {loading ? "Updating..." : "Update profile"}
          </Button>
        </WorkspaceFormActions>
      </WorkspaceFormSurface>
    </form>
  );
}
