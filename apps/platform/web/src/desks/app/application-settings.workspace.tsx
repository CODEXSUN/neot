import { useState } from "react";
import { DatabaseZapIcon, ShieldAlertIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@neot/ui/components/alert-dialog";
import { Button } from "@neot/ui/components/button";
import { logout } from "../../shared/api/platform-api";

export function ApplicationSettingsWorkspace() {
  const [clearing, setClearing] = useState(false);

  const clearData = async () => {
    setClearing(true);
    await logout();
    await Promise.allSettled([
      clearCacheStorage(),
      clearIndexedDatabases(),
      unregisterServiceWorkers()
    ]);
    clearCookies();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.replace("/login");
  };

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-5xl py-6 lg:w-[calc(100%-3rem)] lg:py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Clear cache</h1>
        <p className="pt-2 text-sm leading-6 text-muted-foreground">
          Manage browser data created by NEOT on this device.
        </p>
      </header>

      <section className="flex max-w-3xl items-start justify-between gap-8 border-t py-6 mt-8">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <DatabaseZapIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold">Clear application data</h2>
            <p className="max-w-xl pt-1 text-sm leading-6 text-muted-foreground">
              Clear NEOT caches, local and session storage, IndexedDB databases, service
              workers, and accessible cookies. You will be signed out after cleanup.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="shrink-0" variant="outline">
              Clear data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlertIcon className="size-5 text-destructive" />
                Clear NEOT data from this browser?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This removes locally stored preferences, cached responses, offline data, and the
                current session. Server records and project files are not deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={clearing} onClick={() => void clearData()}>
                {clearing ? "Clearing..." : "Clear data and sign out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}

async function clearCacheStorage() {
  if (!("caches" in window)) return;
  const keys = await window.caches.keys();
  await Promise.all(keys.map((key) => window.caches.delete(key)));
}

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function clearIndexedDatabases() {
  if (!("indexedDB" in window) || typeof window.indexedDB.databases !== "function") return;
  const databases = await window.indexedDB.databases();
  await Promise.all(
    databases
      .map((database) => database.name)
      .filter((name): name is string => Boolean(name))
      .map(deleteIndexedDatabase)
  );
}

function deleteIndexedDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = () => resolve();
  });
}

function clearCookies() {
  const paths = cookiePaths();
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name) continue;
    for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
    }
  }
}

function cookiePaths() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return ["/", ...parts.map((_, index) => `/${parts.slice(0, index + 1).join("/")}`)];
}
