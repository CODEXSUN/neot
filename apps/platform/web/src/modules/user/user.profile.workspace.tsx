import { GlobalLoader } from "@neot/ui/components/global-loader";
import { toast } from "@neot/ui/components/sonner";
import { WorkspaceUpsertPage } from "@neot/ui/workspace/upsert";
import { useUserProfileMutation, useUserProfileQuery } from "./user.hooks";
import { UserProfileForm } from "./user.profile.form";

export function UserProfileWorkspace() {
  const query = useUserProfileQuery();
  const update = useUserProfileMutation();
  if (query.isLoading) return <GlobalLoader />;
  if (!query.data)
    return (
      <WorkspaceUpsertPage
        title="User Profile"
        description="Manage your account identity and security."
      >
        <div className="rounded-md border bg-card p-5 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Unable to load the user profile."}
        </div>
      </WorkspaceUpsertPage>
    );
  return (
    <WorkspaceUpsertPage
      title="User Profile"
      description="Update your identity, email, and password from one page."
    >
      <UserProfileForm
        key={query.data.email}
        profile={query.data}
        loading={update.isPending}
        {...(update.error instanceof Error ? { error: update.error.message } : {})}
        onSubmit={(payload) =>
          update.mutate(payload, {
            onSuccess: () => toast.success("Profile updated"),
            onError: (error) =>
              toast.error("Unable to update profile", { description: error.message })
          })
        }
      />
    </WorkspaceUpsertPage>
  );
}
