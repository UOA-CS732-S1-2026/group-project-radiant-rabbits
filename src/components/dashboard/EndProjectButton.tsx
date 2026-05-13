"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmOverlay from "@/components/shared/ConfirmOverlay";
import DangerActionButton from "@/components/shared/DangerActionButton";

type EndProjectButtonProps = {
  groupId: string;
};

export default function EndProjectButton({ groupId }: EndProjectButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleArchive = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const response = await fetch(`/api/groups/${groupId}/archive`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end project");
      }
      // Archiving clears currentGroupId for affected users, so send this user
      // back to the group picker before refreshing server data.
      router.push("/join-create-switch-group");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to end project",
      );
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <DangerActionButton onClick={() => setIsOpen(true)}>
        End Project
      </DangerActionButton>
      {errorMessage ? (
        <p className="mb-md rounded-md bg-red-100 px-md py-sm text-body-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <ConfirmOverlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleArchive}
        title="End this project group?"
        description="This will archive the group. You can still view past sprints and teammates, but the group will no longer be active."
        confirmLabel="End Project"
        cancelLabel="Cancel"
        isConfirming={isSubmitting}
      />
    </>
  );
}
