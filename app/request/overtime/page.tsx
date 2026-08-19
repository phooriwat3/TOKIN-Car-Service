import PublicRequestForm from "@/components/public-request-form";

export const metadata = {
  title: "Overtime / Holiday Work Request | TOKIN Transport",
  description: "Submit an individual transportation request for overtime or holiday work.",
};

export default function OvertimeRequestPage() {
  return <PublicRequestForm initialType="overtime" />;
}
