import PublicConfirmRequest from "@/components/public-confirm-request";

export default async function ConfirmRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PublicConfirmRequest initialToken={params.token} />;
}
