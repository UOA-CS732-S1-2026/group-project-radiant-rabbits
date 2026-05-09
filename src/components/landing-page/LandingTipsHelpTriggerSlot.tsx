"use client";

import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";

/** Same blue ? control as in the signed-in app, for the landing Tips feature tile. */
export default function LandingTipsHelpTriggerSlot() {
  return (
    <HelpOverlayTrigger
      label="Help: tips around SprintHub"
      title="Tips around SprintHub"
      size="comfortable"
      className="align-middle"
    >
      <p>
        {
          "Click the '?' in SprintHub for more information on the page you are on."
        }
      </p>
    </HelpOverlayTrigger>
  );
}
