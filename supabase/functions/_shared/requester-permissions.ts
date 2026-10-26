const requesterEditableStatuses = new Set([
  'pending_approval',
  'pending_ot_verification',
  'changes_requested',
]);

/**
 * Requester manage links are revoked when a request reaches approval or any
 * operational state. Keep these permissions aligned with that token lifecycle
 * so an Edge Function never advertises an action that the database forbids.
 */
export const requesterPermissions = (status: string) => {
  const mayChange = requesterEditableStatuses.has(status);
  return { canEdit: mayChange, canCancel: mayChange };
};

export const requesterChangeStatuses = [...requesterEditableStatuses];
