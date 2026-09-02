import { RequestSignInGate } from "@/components/request-sign-in-gate";

export const metadata = {
  title: "Off-site Business Transport | TOKIN Transport",
  description: "Request a company vehicle and driver for official off-site business travel.",
};

export default function CarServiceRequestPage() {
  return <RequestSignInGate initialType="outside_company" />;
}
