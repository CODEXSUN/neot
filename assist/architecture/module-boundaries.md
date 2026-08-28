# Module Boundaries

The Platform API composition root registers identity modules, then mounts the public NEOT host
adapter at `/api/neot`. It owns ordering and dependency injection only.

`apps/neot/api` owns Project Manager, Task Manager, Planning, GitHub Dashboard, and Sync routes,
services, repositories, migrations, seeds, and types. `apps/neot/web` owns Today, Projects,
Tasks, Platform Registry, Whiteboards, GitHub Dashboard, Sync, Work Automation, and Design System
workspaces.

The `apps/platform/web` desk composes `neotWebBundle` and retains the local identity-administration
screens. NEOT must not import the Platform host. Proprietary business application modules do not
belong in this repository; NEOT records only their lifecycle links and engineering evidence.
