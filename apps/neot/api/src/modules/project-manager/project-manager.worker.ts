export type ProjectManagerWorkerJob = {
  id: string;
  name: "project-manager.registry-refresh" | "project-manager.summary-refresh";
};

export async function processProjectManagerJob(job: ProjectManagerWorkerJob) {
  return {
    job,
    processed: true,
    processedAt: new Date().toISOString()
  };
}
