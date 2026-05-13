import BorderedPanel from "@/components/shared/BorderedPanel";

type SprintInfo = {
  startDate: string | Date;
  endDate: string | Date;
  progressPercent: number;
  elapsedDays: number;
  remainingDays: number;
  totalDays: number;
};

type SprintTimelineProps = {
  sprint: SprintInfo;
};

export default function SprintTimeline({ sprint }: SprintTimelineProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-NZ", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <BorderedPanel>
      <div className="space-y-md">
        {/* Show dates and remaining time together so timezone-normalized sprint
            windows are easy to interpret at a glance. */}
        <div className="grid gap-md text-(length:--text-body-sm) text-brand-dark/70 md:grid-cols-3">
          <div>
            <div className="font-medium text-brand-dark/50">Start</div>
            <div className="font-semibold text-brand-dark">
              {formatDate(sprint.startDate)}
            </div>
          </div>
          <div>
            <div className="font-medium text-brand-dark/50">End</div>
            <div className="font-semibold text-brand-dark">
              {formatDate(sprint.endDate)}
            </div>
          </div>
          <div>
            <div className="font-medium text-brand-dark/50">Remaining</div>
            <div className="font-semibold text-brand-dark">
              {sprint.remainingDays} day{sprint.remainingDays === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* Progress comes from calendar days, not task completion, so it stays
            separate from the task breakdown cards. */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between text-(length:--text-body-xs)">
            <span className="font-medium text-brand-dark/60">Progress</span>
            <span className="font-semibold text-brand-dark">
              {sprint.progressPercent}%
            </span>
          </div>
          <div>
            <div className="h-2 w-full rounded-full bg-brand-dark/10 overflow-hidden">
              <div
                className="h-full bg-brand-accent transition-all duration-300"
                style={{ width: `${sprint.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </BorderedPanel>
  );
}
