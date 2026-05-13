import { useEffect, useState } from "react";
import BorderedPanel from "@/components/shared/BorderedPanel";

type SprintFocusProps = {
  focus?: string;
  onUpdate?: (text: string) => void;
  editable?: boolean;
};

export default function SprintFocus({
  focus = "EMPTY: Add sprint focus",
  onUpdate,
  editable = true,
}: SprintFocusProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(focus);

  useEffect(() => {
    // Server refreshes can replace the saved focus after an edit, so mirror the
    // prop back into local state when it changes.
    setText(focus);
  }, [focus]);

  const handleSave = () => {
    setIsEditing(false);
    onUpdate?.(text);
  };

  const handleCancel = () => {
    setText(focus);
    setIsEditing(false);
  };

  return (
    <BorderedPanel>
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1">
          <div className="text-(length:--text-body-xs) font-semibold uppercase tracking-wide text-brand-dark/50">
            Sprint Focus
          </div>
          {isEditing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-md w-full min-h-20 rounded-lg border border-brand-accent/30 bg-brand-surface p-md font-inherit text-(length:--text-body-md) text-brand-dark placeholder-brand-dark/40 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
              placeholder="Describe the sprint's main goals..."
            />
          ) : (
            <p className="mt-md text-(length:--text-body-md) leading-relaxed text-brand-dark">
              {text || "No sprint focus set"}
            </p>
          )}
        </div>

        {editable && (
          <div className="flex shrink-0 gap-xs">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-brand-accent px-md py-sm text-(length:--text-body-xs) font-medium text-white transition hover:opacity-90"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-brand-dark/10 px-md py-sm text-(length:--text-body-xs) font-medium text-brand-dark transition hover:bg-brand-surface/50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-(length:--text-body-md) text-brand-dark/40 transition hover:text-brand-dark"
                title="Edit focus"
              >
                ✎
              </button>
            )}
          </div>
        )}
      </div>
    </BorderedPanel>
  );
}
