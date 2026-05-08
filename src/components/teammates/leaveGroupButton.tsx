"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LeaveGroupButton() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

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

      router.push("/groups");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLeaveGroup}
      disabled={isLeaving}
      className="shrink-0 rounded-lg bg-status-todo-fg px-md py-sm text-body-sm font-medium text-brand-surface hover:bg-status-todo-fg/90 disabled:opacity-50"
    >
      {isLeaving ? "Leaving..." : "Leave Group"}
    </button>
  );
}
