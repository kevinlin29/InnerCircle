"use client";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type DatePreset = "7d" | "30d" | "90d" | "1y" | "all";
export type ScopeFilter = "all" | "mine";

const DATE_LABELS: Record<DatePreset, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
  all: "All time",
};

interface FilterPanelProps {
  datePreset: DatePreset;
  scope: ScopeFilter;
  onDatePresetChange: (preset: DatePreset) => void;
  onScopeChange: (scope: ScopeFilter) => void;
}

export default function FilterPanel({
  datePreset,
  scope,
  onDatePresetChange,
  onScopeChange,
}: FilterPanelProps) {
  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-3 rounded-xl border border-border/50 bg-background/80 p-3 backdrop-blur-md">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Time Range
        </span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(DATE_LABELS) as DatePreset[]).map((preset) => (
            <Button
              key={preset}
              variant={datePreset === preset ? "default" : "ghost"}
              size="xs"
              onClick={() => onDatePresetChange(preset)}
            >
              {DATE_LABELS[preset]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Scope
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={scope}
          onValueChange={(val) => {
            if (val) onScopeChange(val as ScopeFilter);
          }}
        >
          <ToggleGroupItem value="all">All Posts</ToggleGroupItem>
          <ToggleGroupItem value="mine">My Posts</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
