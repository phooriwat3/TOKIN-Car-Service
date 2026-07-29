import PublicManageRequest from "@/components/public-manage-request";

export default async function ManageRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PublicManageRequest initialToken={params.token} />;
}
