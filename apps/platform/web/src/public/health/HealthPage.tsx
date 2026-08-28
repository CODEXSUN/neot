import { Button } from "@neot/ui/components/button";
import { Card } from "@neot/ui/components/card";
import { StatusBadge } from "@neot/ui/components/StatusBadge";
import { WebLayout } from "@neot/ui/layouts/web-layout";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet } from "../../shared/api/platform-api";

type HealthResponse = {
  checks: {
    "platform-api"?: {
      details?: {
        modules?: string[];
        runtime?: string;
      };
      status: "degraded" | "down" | "ok";
    };
  };
  status: "degraded" | "down" | "ok";
};

export function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | undefined>();
  const [loading, setLoading] = useState(false);

  async function loadHealth() {
    setLoading(true);
    try {
      setHealth(await apiGet<HealthResponse>("/health"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const platformApi = health?.checks["platform-api"];

  return (
    <WebLayout>
      <section className="simple-page">
        <Card
          action={
            <Button disabled={loading} icon={<RefreshCw size={16} />} onClick={loadHealth}>
              Refresh
            </Button>
          }
          description="Live platform API status."
          title="Platform Status"
        >
          <div className="status-list">
            <span>API</span>
            <strong>platform-api</strong>
            <span>Status</span>
            <StatusBadge tone={health?.status === "ok" ? "green" : "amber"}>
              {health?.status ?? "loading"}
            </StatusBadge>
            <span>Runtime</span>
            <strong>{platformApi?.details?.runtime ?? "Unknown"}</strong>
            <span>Modules</span>
            <strong>{platformApi?.details?.modules?.join(", ") ?? "None"}</strong>
          </div>
        </Card>
      </section>
    </WebLayout>
  );
}
