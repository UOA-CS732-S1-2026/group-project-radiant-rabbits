import Avatar from "@/components/shared/Avatar";
import BorderedPanel from "@/components/shared/BorderedPanel";

type ActivityItem = {
  date: string;
  text: string;
  initials: string;
  avatarUrl: string | null;
  kind?: "commit" | "PR" | "issue" | "sprint";
  flag?: boolean;
};

type ActivityTimelineProps = {
  items: ActivityItem[];
};

// Component to display sprint activities (commits, PRs, issues)
export default function ActivityTimeline({ items }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <BorderedPanel className="p-md">
        <h4 className="text-body-lg font-semibold text-brand-dark">
          Activity Timeline
        </h4>
        <p className="mt-md text-body-md text-brand-dark/60">
          No activity captured for this sprint period.
        </p>
      </BorderedPanel>
    );
  }

  // Build the activity timeline with the fetched data
  return (
    <BorderedPanel className="p-md">
      <div className="mb-md flex items-baseline justify-between gap-md">
        <div>
          <h4 className="text-body-lg font-semibold text-brand-dark">
            Activity Timeline
          </h4>
          <p className="text-body-xs text-brand-dark/50">
            Chronological sprint activity
          </p>
        </div>
      </div>

      <div className="h-96 space-y-sm overflow-y-auto pr-xs">
        {items.map((item, index) => (
          <div
            key={`${item.date}-${index}`}
            className={`grid grid-cols-[5rem_1fr_2.5rem_auto] items-center gap-md py-sm ${
              index > 0 ? "border-t border-brand-dark/10 pt-md" : ""
            }`}
          >
            <div className="text-body-xs font-medium text-brand-dark/50">
              {item.date}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-sm min-w-0">
                <Avatar
                  name={item.text}
                  initials={item.initials}
                  avatarUrl={item.avatarUrl}
                  size={20}
                  className="shrink-0"
                />
                <p className="truncate text-body-sm text-brand-dark/80">
                  {item.text}
                </p>
              </div>
            </div>

            {item.flag ? (
              <span className="justify-self-end rounded-md bg-brand-in-progress/20 px-sm py-xs text-body-xs font-medium text-brand-in-progress">
                Unlinked
              </span>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </BorderedPanel>
  );
}
