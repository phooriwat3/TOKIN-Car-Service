import { requesterChangeStatuses, requesterPermissions } from './requester-permissions.ts';

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};

Deno.test('allows requester changes only before approval or after a change request', () => {
  for (const status of ['pending_approval', 'pending_ot_verification', 'changes_requested']) {
    assertEquals(requesterPermissions(status), { canEdit: true, canCancel: true });
  }
});

Deno.test('locks requester changes for approved and operational requests', () => {
  for (const status of ['approved', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled']) {
    assertEquals(requesterPermissions(status), { canEdit: false, canCancel: false });
  }
});

Deno.test('uses the same status set for permission checks and conditional writes', () => {
  assertEquals(requesterChangeStatuses, [
    'pending_approval',
    'pending_ot_verification',
    'changes_requested',
  ]);
});
