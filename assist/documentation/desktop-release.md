# CodeLogix release and update

## Update behavior

The desktop checks the latest public GitHub release after startup. It downloads a newer signed MSI
to the updater cache. It does not install the MSI during this step.

The update center shows the version, release notes, and download progress. The user must select
**Install and restart**. Windows can then request administrator approval for the machine-wide MSI.

The updater uses passive MSI mode. The installer needs no answers after Windows grants approval.
The app restarts after the installer succeeds.

## First installation

The release provides these first-install files:

```text
CodeLogix_Setup_<version>_x64.exe
CodeLogix_<version>_x64_en-US.msi
```

Use the setup EXE for a normal first installation. It contains the same MSI and shows passive
Windows Installer progress. Use the MSI for managed deployment, repair, and recovery.

Both files install one Windows Installer product. The setup EXE does not create a second product
or a separate uninstaller.

## Installer ownership

CodeLogix uses one Windows MSI installer identity. Do not publish an NSIS installer for the same
product. Mixed installer identities can create duplicate installations.

The fixed WiX upgrade code is `da54f106-f843-506e-8738-3bb49bda90d2`. Never change this code for
an existing product line.

The MSI upgrade removes only components that the earlier MSI registered. It replaces the program
files, shortcuts, and uninstall registration. It does not delete workspaces or the desktop SQLite
data in the user application-data directory.

Use Windows **Installed apps** to uninstall CodeLogix. Do not delete the Program Files
directory by hand. Windows Installer uses its component registry to remove the owned files.

## Signing keys

Tauri verifies every updater package with a minisign key. This check cannot be disabled.

The local private key is outside the repository:

```text
%USERPROFILE%\.tauri\neot-desktop-v2.key
```

The key password uses Windows user encryption:

```text
%USERPROFILE%\.tauri\neot-desktop-v2-key-password.clixml
```

Back up both files in an approved secret vault. Loss of either file prevents updates for installed
clients. Never commit, print, log, or send the private key or its password.

Add these GitHub Actions secrets before the first release:

1. Add `TAURI_SIGNING_PRIVATE_KEY` with the private key content.
2. Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` with the key password.
3. Add an Authenticode certificate to the Windows signing process before public distribution.

The updater signature proves that the update belongs to this app. Authenticode signing separately
reduces Windows SmartScreen warnings.

## Local signed build

Run this command from the repository root:

```powershell
npm.cmd run desktop:release:build
```

The script loads the private key and password without adding them to the repository environment.
It clears both signing variables after the build.

The native compiler keeps intermediate files under the Tauri `target` directory. The release
command collects all deployable outputs under the repository root:

```text
dist/deploy/desktop/<version>/windows-x64
```

The version folder contains:

```text
app/CodeLogix.exe
app/codex.exe
app/codex-code-mode-host.exe
app/codex-command-runner.exe
app/codex-windows-sandbox-setup.exe
app/rg.exe
installer/CodeLogix_<version>_x64_en-US.msi
installer/CodeLogix_<version>_x64_en-US.msi.sig
installer/CodeLogix_Setup_<version>_x64.exe
updater/latest.json
checksums.sha256
release.json
```

Use the setup EXE for a normal first installation. Use the MSI for managed deployment and repair.
The `app` folder is the unpackaged application set for controlled testing. Keep every file in
`app` together because Codex resolves its helpers beside `codex.exe`.

The release command also checks that only the repository root contains `node_modules` and `dist`.
Nested dependency or build-output folders stop the release.

Run this command to collect an existing native build again:

```powershell
npm.cmd run desktop:release:publish
```

Run this command to verify the MSI identity, setup metadata, updater manifest, and root release
manifest:

```powershell
npm.cmd run desktop:release:check
```

## GitHub release

Preview the release before it changes GitHub:

```powershell
npm.cmd run github:release -- --dry-run
```

Start the reviewed release:

```powershell
npm.cmd run github:release
```

The release watcher shows each active GitHub job step. It also prints elapsed time every minute.
Use the active job link to inspect live runner logs. The command stops when the workflow publishes
all required assets or reaches its configured timeout.

The command checks the clean and pushed `main` branch. It runs the version, dependency, and desktop
checks. After operator approval, it creates and pushes `desktop-v<version>`.

The **Desktop release** workflow builds and tests the signed MSI. It checks the release outputs and
uploads the setup EXE, updater signature, and `latest.json`. The workflow publishes the release only
after every earlier step passes. The command waits for the workflow and verifies the public assets.

Use `--no-wait` only when another operator will monitor the workflow. Use `--yes` only after a
reviewed dry run. The operator approval before the tag push is the release approval that makes the
signed update available to desktop clients.

The default wait timeout is 45 minutes. Use `--timeout-minutes <5-120>` for a different bounded
wait. If the local command stops after the tag push, run it again to resume workflow and release
verification. Never move an existing release tag to another commit.

## Recovery

If an installation fails, the existing MSI registration remains the recovery source. Do not delete
installer registry entries or Program Files manually. Repair or uninstall the registered version
through Windows Installer, then install the reviewed MSI.

Do not publish an older version as an automatic rollback. Publish a corrected higher version.
