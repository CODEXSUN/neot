import {
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TestTube2,
  XCircle
} from "lucide-react";
import { useState } from "react";
import type { LangGraphExecutionState, LangGraphNodeId } from "./langgraph-engine";
import "./langgraph-visualizer.css";

const NODE_ICONS: Record<LangGraphNodeId, React.ReactNode> = {
  planner: <Brain size={16} />,
  coder: <Code2 size={16} />,
  tester: <TestTube2 size={16} />,
  reflection: <RefreshCw size={16} />,
  verifier: <ShieldCheck size={16} />
};

export function LangGraphVisualizer({
  graphState,
  onReset: _onReset
}: {
  graphState: LangGraphExecutionState;
  onReset?: () => void;
}) {
  const [logsExpanded, setLogsExpanded] = useState(false);

  const nodesList: { id: LangGraphNodeId; label: string }[] = [
    { id: "planner", label: "Planner" },
    { id: "coder", label: "Coder" },
    { id: "tester", label: "Tester & Linter" },
    { id: "reflection", label: "Reflection" },
    { id: "verifier", label: "Verifier" }
  ];

  return (
    <div className="langgraph-visualizer-card">
      <div className="visualizer-header">
        <div className="header-title-group">
          <Sparkles size={16} className="sparkle-icon" />
          <div>
            <h4>LangGraph Autonomous Execution Graph</h4>
            <span className="visualizer-subtitle">
              Stateful Multi-Node Workflow • Thread: {graphState.threadId.slice(0, 12)}
            </span>
          </div>
        </div>

        <div className="visualizer-status-group">
          {graphState.attempts > 0 && (
            <span className="retry-badge">
              <RefreshCw size={12} className="spin" /> Retry Loop: {graphState.attempts}/{graphState.maxRetries}
            </span>
          )}
          {graphState.status === "passed" ? (
            <span className="status-pill passed">
              <CheckCircle2 size={14} /> Passed
            </span>
          ) : graphState.status === "failed" ? (
            <span className="status-pill failed">
              <XCircle size={14} /> Failed
            </span>
          ) : graphState.status === "retrying" ? (
            <span className="status-pill retrying">
              <RefreshCw size={14} className="spin" /> Auto-Fixing
            </span>
          ) : (
            <span className="status-pill running">
              <Loader2 size={14} className="spin" /> Graph Running
            </span>
          )}
        </div>
      </div>

      {/* HORIZONTAL NODE GRAPH FLOW */}
      <div className="nodes-flow-container">
        {nodesList.map((node, index) => {
          const isPassed =
            graphState.status === "passed" ||
            (index < nodesList.findIndex((n) => n.id === graphState.activeNode) &&
              graphState.status !== "failed");
          const isActive =
            graphState.activeNode === node.id &&
            graphState.status !== "passed" &&
            graphState.status !== "failed";

          return (
            <div key={node.id} className="node-wrapper">
              <div className={`node-box${isActive ? " active" : ""}${isPassed ? " passed" : ""}`}>
                <span className="node-icon">{NODE_ICONS[node.id]}</span>
                <span className="node-label">{node.label}</span>
                {isActive && <span className="active-dot" />}
                {isPassed && <Check size={12} className="check-icon" />}
              </div>
              {index < nodesList.length - 1 && (
                <div className={`node-connector${isPassed ? " passed" : ""}`}>
                  <ChevronRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PLAN STEPS CHECKLIST */}
      {graphState.planSteps.length > 0 && (
        <div className="plan-steps-checklist">
          <h5>Graph Execution Steps</h5>
          <div className="steps-list">
            {graphState.planSteps.map((step) => {
              const isStepCompleted = step.status === "completed" || graphState.status === "passed";
              const isStepRunning =
                step.status === "running" &&
                graphState.status !== "passed" &&
                graphState.status !== "failed";

              return (
                <div key={step.id} className={`step-row ${isStepCompleted ? "completed" : isStepRunning ? "running" : step.status}`}>
                  {isStepCompleted ? (
                    <CheckCircle2 size={14} className="step-icon completed" />
                  ) : isStepRunning ? (
                    <Loader2 size={14} className="step-icon running spin" />
                  ) : step.status === "failed" ? (
                    <XCircle size={14} className="step-icon failed" />
                  ) : (
                    <span className="step-icon pending">•</span>
                  )}
                  <span className="step-title">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COLLAPSIBLE LOGS INSPECTOR */}
      <div className="logs-inspector-toggle">
        <button
          type="button"
          className="toggle-btn"
          onClick={() => setLogsExpanded(!logsExpanded)}
        >
          {logsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>View Node Execution Logs ({graphState.logs.length})</span>
        </button>

        {logsExpanded && (
          <div className="logs-terminal">
            {graphState.logs.length === 0 ? (
              <div className="log-line empty">No node logs recorded yet.</div>
            ) : (
              graphState.logs.map((log, i) => (
                <div key={i} className={`log-line ${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-node">[{log.node.toUpperCase()}]</span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
