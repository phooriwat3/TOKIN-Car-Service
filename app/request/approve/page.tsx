import PublicApproveRequest from '@/components/public-approve-request';

async function loadApproval(token?: string) {
  if (!token) return { error: 'Approval link is missing.' };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return { error: 'Approval service is not configured.' };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/public-approval-access`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
      body: JSON.stringify({ token }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: body.error || body.message || `Unable to open approval (HTTP ${response.status}).` };
    }
    return { request: body.request };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Unable to load approval.' };
  }
}

export default async function ApproveRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const approval = await loadApproval(params.token);
  return (
    <PublicApproveRequest
      initialToken={params.token}
      initialRequest={approval.request}
      initialError={approval.error}
    />
  );
}