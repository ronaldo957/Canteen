"use client";

import { Check, X } from "lucide-react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, cn } from "@/lib/utils";

export function OrderStatusStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">
        <X className="h-5 w-5" /> This order was cancelled.
      </div>
    );
  }

  const currentIdx = ORDER_STATUS_FLOW.indexOf(status as (typeof ORDER_STATUS_FLOW)[number]);

  return (
    <div className="flex items-center">
      {ORDER_STATUS_FLOW.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary",
                  !isDone && !isCurrent && "border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < ORDER_STATUS_FLOW.length - 1 && (
                <div className={cn("mx-1 h-0.5 flex-1", isDone ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span className={cn("mt-2 text-center text-[11px] font-medium sm:text-xs", isCurrent ? "text-primary" : "text-muted-foreground")}>
              {ORDER_STATUS_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
