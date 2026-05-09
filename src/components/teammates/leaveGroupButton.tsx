"use client";

import { set } from "mongoose";
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
        className="shrink-0 rounded-lg bg-status-todo-fg px-md py-sm text-body-sm font-medium text-brand-surface hover:bg-status-todo-fg/90 disabled:opacity-50"
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
