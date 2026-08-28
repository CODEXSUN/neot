import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  assertReleaseAssets,
  npmInvocation,
  releaseTag,
  requiredReleaseAssets
} from "./github-release.mjs";
import {
  formatElapsed,
  WorkflowProgressReporter,
  workflowProgress
} from "./github-release-progress.mjs";

test("builds the desktop release tag", () => {
  assert.equal(releaseTag("1.2.3"), "desktop-v1.2.3");
  assert.throws(() => releaseTag("1.2"), /Invalid release version/u);
});

test("requires every public updater asset", () => {
  const version = "1.2.3";
  const release = { assets: requiredReleaseAssets(version).map((name) => ({ name })) };
  assert.doesNotThrow(() => assertReleaseAssets(release, version));
  assert.throws(
    () => assertReleaseAssets({ assets: release.assets.slice(1) }, version),
    /NEOT_1\.2\.3_x64_en-US\.msi/u
  );
});

test("reports invalid CLI options without leaking a stack trace", () => {
  const result = spawnSync(
    process.execPath,
    [resolve(import.meta.dirname, "github-release.mjs"), "--timeout-minutes", "2", "--dry-run"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Release failed: --timeout-minutes must be an integer from 5 to 120\./u
  );
  assert.doesNotMatch(result.stderr, /at numberOption/u);
});

test("runs npm scripts through the Windows command shell", () => {
  assert.deepEqual(npmInvocation(["run", "check:versions"], "win32", "cmd.exe"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", "run", "check:versions"]
  });
  assert.deepEqual(npmInvocation(["run", "check:versions"], "linux"), {
    command: "npm",
    args: ["run", "check:versions"]
  });
});

test("reports the active release step and elapsed time", () => {
  const progress = workflowProgress(
    {
      created_at: "2026-08-16T01:57:27Z",
      html_url: "https://github.test/run/7",
      id: 7,
      status: "in_progress"
    },
    {
      jobs: [
        {
          html_url: "https://github.test/job/9",
          id: 9,
          name: "windows-release",
          started_at: "2026-08-16T01:57:30Z",
          status: "in_progress",
          steps: [
            {
              name: "Build draft release",
              number: 10,
              started_at: "2026-08-16T02:02:02Z",
              status: "in_progress"
            }
          ]
        }
      ]
    },
    Date.parse("2026-08-16T02:06:26Z")
  );

  assert.equal(progress.label, "Build draft release");
  assert.equal(progress.url, "https://github.test/job/9");
  assert.match(progress.line, /step 4m 24s · total 8m 59s/u);
});

test("prints a heartbeat while a release step remains active", () => {
  let now = 1_000;
  const lines = [];
  const reporter = new WorkflowProgressReporter({
    heartbeatMs: 60_000,
    log: (line) => lines.push(line),
    now: () => now
  });
  const run = { created_at: new Date(0).toISOString(), html_url: "run", id: 1, status: "queued" };

  reporter.report(run, { jobs: [] });
  now += 30_000;
  reporter.report(run, { jobs: [] });
  now += 30_000;
  reporter.report(run, { jobs: [] });

  assert.equal(lines.length, 3);
  assert.match(lines[0], /Desktop release workflow: queued/u);
  assert.equal(lines[1], "Active job: run");
  assert.match(lines[2], /total 1m 1s/u);
  assert.equal(formatElapsed(3_661_000), "1h 1m 1s");
});
