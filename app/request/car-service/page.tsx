import PublicRequestForm from "@/components/public-request-form";

export const metadata = {
  title: "Off-site Business Transport | TOKIN Transport",
  description: "Request a company vehicle and driver for official off-site business travel.",
};

export default function CarServiceRequestPage() {
  return <PublicRequestForm initialType="outside_company" />;
}
