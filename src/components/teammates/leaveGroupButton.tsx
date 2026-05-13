"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmOverlay from "../shared/ConfirmOverlay";

export default function LeaveGroupButton() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      const response = await fetch("/api/groups/leave", {
        method: "PUT",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave group");
      }

      // Leaving clears currentGroupId server-side, so return to group selection
      // before refreshing the app shell.
      setShowConfirm(false);
      router.push("/join-create-switch-group");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
      setIsLeaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={setShowConfirm.bind(null, true)}
        disabled={isLeaving}
        className="inline-flex min-h-9 items-center justify-center rounded-xl px-sm py-1.5 text-(length:--text-body-sm) sm:text-(length:--text-body-md) font-medium text-white transition bg-status-todo-fg hover:bg-status-todo-fg/90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-todo-fg"
      >
        {isLeaving ? "Leaving..." : "Leave Group"}
      </button>
      <ConfirmOverlay
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleLeaveGroup}
        title="Leave Group"
        description="Are you sure you want to leave the group? You can always rejoin later if you change your mind."
        confirmLabel="Leave"
        cancelLabel="Cancel"
        isConfirming={isLeaving}
      />
    </>
  );
}
