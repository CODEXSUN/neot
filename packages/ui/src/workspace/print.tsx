"use client";

import type { ReactNode } from "react";

export function WorkspacePrintPreview({
  children,
  className,
  label = "Print Preview"
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border/70" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      <div className="overflow-hidden rounded-md border border-border/70 bg-white shadow-sm print:border-0 print:shadow-none">
        {children}
      </div>
    </section>
  );
}

export function WorkspacePrintSheet({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 7mm 4mm 5mm; }
        @media print {
          html, body {
            background: #fff !important;
            height: auto !important;
            margin: 0 !important;
            min-height: 0 !important;
            width: auto !important;
          }
          .print-sheet { width: 210mm; }
          body:has(.billing-print-document) { background: #fff !important; }
          body:has(.billing-document-print-page) *:has(.billing-document-print-page) {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body:has(.billing-document-print-page) *:has(.billing-document-print-page) > *:not(.billing-document-print-page):not(:has(.billing-document-print-page)) {
            display: none !important;
          }
          body:has(.billing-print-document) [data-sidebar="sidebar"],
          body:has(.billing-print-document) [data-sidebar="gap"],
          body:has(.billing-print-document) [data-sidebar="rail"],
          main:has(.billing-print-document) > header {
            display: none !important;
          }
          .billing-document-print-page > :first-child,
          .billing-document-print-page > main > :not(.billing-print-area),
          .billing-print-area > :not(:first-child) {
            display: none !important;
          }
          .billing-document-print-page,
          .billing-document-print-page > main,
          .billing-print-area,
          .billing-print-area > :first-child {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
          }
          .billing-document-print-page {
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
          }
          .billing-print-area > :first-child { overflow: visible !important; }
          .billing-print-document {
            break-inside: avoid;
            color: #000 !important;
          }
          .billing-print-document,
          .billing-print-document * { border-color: #475569 !important; }
          .billing-print-document .text-\\[9px\\] { font-size: 10px !important; }
          .billing-print-document .text-\\[10px\\] { font-size: 11px !important; }
        }
      `}</style>
      <div
        className={`print-sheet mx-auto w-[210mm] max-w-full origin-top bg-white font-sans text-[10px] text-black print:mx-0 print:mt-0 print:w-[198mm] print:max-w-none ${className ?? ""}`}
      >
        {children}
      </div>
    </>
  );
}
