import PublicApproveRequest from '@/components/public-approve-request';

export default async function ApproveRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PublicApproveRequest initialToken={params.token} />;
}
