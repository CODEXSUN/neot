import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

type PortalWorkspaceProps = {
  description: string;
  path: string;
  title: string;
};

export function PortalWorkspace({ description, path, title }: PortalWorkspaceProps) {
  const [frameKey, setFrameKey] = useState(0);
  const url = portalUrl(path);

  return (
    <section className="portal-workspace">
      <header className="portal-workspace-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="portal-workspace-actions">
          <button onClick={() => setFrameKey((current) => current + 1)} type="button">
            <RefreshCw size={15} /> Refresh
          </button>
          <a href={url} rel="noreferrer" target="_blank">
            <ExternalLink size={15} /> Open in browser
          </a>
        </div>
      </header>
      <iframe key={frameKey} src={url} title={title} />
    </section>
  );
}

function portalUrl(path: string) {
  const configured = import.meta.env.VITE_PLATFORM_WEB_URL?.trim();
  const origin = configured || "http://127.0.0.1:9260";
  return new URL(path, `${origin.replace(/\/+$/u, "")}/`).toString();
}
