import { describe, expect, it } from "vitest";
import {
  requestJourneySteps,
  requestStatusPresentation,
} from "./request-status";

describe("request status presentation", () => {
  it("uses the correct review step for each request type", () => {
    expect(requestJourneySteps("outside_company")[1].title).toBe("Approval");
    expect(requestJourneySteps("overtime")[1].title).toBe("OT verification");
  });

  it("tells a requester to confirm before approval begins", () => {
    const result = requestStatusPresentation(
      "pending_requester_confirmation",
      "outside_company",
    );
    expect(result.currentStep).toBe(0);
    expect(result.nextAction).toContain("confirmation message");
    expect(result.terminal).toBe(false);
  });

  it("shows GA assignment as the next stage after approval", () => {
    const result = requestStatusPresentation("approved", "outside_company");
    expect(result.currentStep).toBe(2);
    expect(result.label).toContain("waiting for assignment");
  });

  it("marks completed, rejected, and cancelled requests as terminal", () => {
    expect(requestStatusPresentation("completed", "overtime").terminal).toBe(true);
    expect(requestStatusPresentation("rejected", "outside_company").tone).toBe("danger");
    expect(requestStatusPresentation("cancelled", "outside_company").terminal).toBe(true);
  });
});
