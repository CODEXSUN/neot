import { motion } from "framer-motion";

import { cn } from "../lib/utils";

const ringTransition = {
  ease: "linear",
  repeat: Infinity
} as const;

type GlobalLoaderProps = {
  className?: string;
  fullScreen?: boolean;
};

export function GlobalLoader({ className, fullScreen = true }: GlobalLoaderProps) {
  return (
    <div
      className={cn(
        "global-loader",
        fullScreen ? "global-loader-fullscreen" : "global-loader-inline",
        className
      )}
    >
      <div className="global-loader-mark" role="status" aria-label="Loading">
        <motion.div
          animate={{ rotate: 360 }}
          className="global-loader-ring global-loader-ring-accent"
          transition={{ ...ringTransition, duration: 2.8 }}
        />
        <div className="global-loader-logo" aria-hidden="true">
          <img src="/logo/logo.svg" alt="" />
        </div>
      </div>
      <div className="global-loader-brand" aria-hidden="true">
        <strong>NEOT</strong>
        <span>Learn today. Own tomorrow.</span>
      </div>
    </div>
  );
}
