"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs";
import { cn } from "../lib/utils";

export type WorkspaceAnimatedTab = {
  content: ReactNode;
  label: ReactNode;
  value: string;
};

export function WorkspaceAnimatedTabs({
  className,
  contentClassName,
  keepMounted = false,
  listClassName,
  onValueChange,
  tabs,
  triggerClassName,
  value
}: {
  className?: string;
  contentClassName?: string;
  keepMounted?: boolean;
  listClassName?: string;
  onValueChange: (value: string) => void;
  tabs: WorkspaceAnimatedTab[];
  triggerClassName?: string;
  value: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("w-full", className)}>
      <TabsList
        className={cn(
          "relative h-auto w-full flex-nowrap justify-start overflow-x-auto overflow-y-hidden rounded-none border-0 border-b border-border/90 bg-transparent p-0 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          listClassName
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative -mb-px shrink-0 overflow-visible rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
              triggerClassName
            )}
          >
            {tab.label}
            {tab.value === value ? (
              <motion.span
                layoutId="workspace-tab-active-bar"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-foreground shadow-[0_1px_0_rgba(15,23,42,0.18)]"
                transition={{ damping: 28, mass: 0.85, stiffness: 260, type: "spring" }}
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          {...(keepMounted ? { forceMount: true } : {})}
          className={cn(
            "mt-6 pb-2",
            keepMounted && "data-[state=inactive]:hidden",
            contentClassName
          )}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
