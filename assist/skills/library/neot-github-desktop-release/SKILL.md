---
name: neot-github-desktop-release
description: Prepare, publish, and verify a versioned NEOT Desktop GitHub release. Use for an authorized commit/pull/push, signed desktop release, release-workflow failure, or updater-asset verification; do not use for VPS deployment.
---

# NEOT GitHub Desktop Release

Use this skill only when the user has explicitly authorized GitHub mutations.
It releases the NEOT Tauri desktop application from this repository. It does
not deploy the VPS or publish application services.

## Before publishing

1. Read `assist/documentation/release-notes-standard.md`, repository governance,
   and the newest changelog entry. Inspect `git status --short`, the current
   branch, upstream state, and the current version.
2. Preserve unrelated changes unless the user explicitly includes them in the
   release. Run the GitHub helper dry run before mutations:

   ```powershell
   npm.cmd run github:now -- --dry-run
   ```

3. Keep every workspace package and every versioned internal dependency under
   `@neot/` or `@neot/` aligned to the root version. The matching entries
   in `package-lock.json` must use the same values. A stale internal version
   makes GitHub `npm ci` try to download a private package from the public npm
   registry.
4. Confirm the release entry names the database effect, codebase effect, exact
   checks, and every skipped live action. Stop when the release note is generic.
5. Run the release checks:

   ```powershell
   npm.cmd run check:versions
   npm.cmd ci --ignore-scripts --dry-run --no-audit --no-fund
   npm.cmd run dependencies:clean
   npm.cmd run dependencies:check
   npm.cmd run github:release -- --dry-run --timeout-minutes 120
   ```

   If a full local `npm ci` is blocked by an open Windows native binary, record
   that as a local file-lock limitation. Do not claim a full local clean
   install; the dry run and the GitHub runner provide separate evidence.

6. Build and validate the local release output before creating a tag:

   ```powershell
   npm.cmd run desktop:release:build
   npm.cmd run desktop:release:check
   ```

   Confirm that `dist/deploy/desktop/<version>/windows-x64/` contains only the
   expected artifacts and updater metadata. A local installer is not yet a
   published updater release.

## Commit and publish

1. Use `npm.cmd run github:now -- --yes --no-bump` when the current changelog
   and version already describe this release. It derives `#<patch> - <title>`
   from the newest changelog entry.
2. Use `npm.cmd run github:now -- --yes` only when a new patch version is
   intended. It creates the next version and a new changelog entry.
3. For a correction that must retain the same release version, commit and push
   the reviewed correction directly. Do not trigger another automatic version
   bump.
4. Create the desktop tag only after the tagged commit is present on
   `origin/main`:

   ```powershell
   npm.cmd run github:release -- --yes --timeout-minutes 120
   ```

5. If a tag-triggered release fails before publication and a corrective commit
   is required for the same version, verify that no GitHub release exists,
   replace the annotated `desktop-v<version>` tag with the corrective commit,
   force-push only that tag, then monitor the new run. Do this only with the
   user's explicit release authorization.

## Verify the published release

Use GitHub CLI to inspect the workflow until it completes successfully:

```powershell
gh run list --repo CODEXSUN/neot --workflow desktop-release.yml --limit 3
gh run view <run-id> --repo CODEXSUN/neot --json status,conclusion,url,jobs
```

Then verify that the public, non-draft `desktop-v<version>` release contains:

- `NEOT_<version>_x64_en-US.msi`
- `NEOT_<version>_x64_en-US.msi.sig`
- `NEOT_Setup_<version>_x64.exe`
- `latest.json`

```powershell
gh release view desktop-v<version> --repo CODEXSUN/neot --json url,isDraft,isPrerelease,assets
```

Report the commit, tag, workflow URL, release URL, asset names, every command,
and every live check that ran. Do not describe a draft, failed, or still-running
workflow as a published release.

Stop if the source commit is not on `origin/main`, the version contract is
misaligned, an existing tag points to another commit, the workflow fails, or
the published assets do not match the updater manifest. Do not repeat a tag or
force-push it without an explicit correction authorization.
