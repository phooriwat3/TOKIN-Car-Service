import { RequestSignInGate } from "@/components/request-sign-in-gate";

export const metadata = {
  title: "Overtime Transport Request | TOKIN Transport",
  description: "Submit an individual transportation request for overtime or holiday work.",
};

export default function OvertimeRequestPage() {
  return <RequestSignInGate initialType="overtime" />;
}
