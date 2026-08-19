import PublicRequestForm from "@/components/public-request-form";

export const metadata = {
  title: "Car Service Requisition | TOKIN Transport",
  description: "Request a company vehicle and driver for official off-site business travel.",
};

export default function CarServiceRequestPage() {
  return <PublicRequestForm initialType="outside_company" />;
}
