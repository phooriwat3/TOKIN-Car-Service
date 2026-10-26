# Power Automate email UI

The Edge Functions now send two ready-to-use fields to every email flow:

- `emailSubject`: a concise subject containing the status and request number
- `emailBodyHtml`: responsive HTML containing the request details and action buttons

Add these properties to the HTTP trigger JSON schema of all three flows:

```json
"emailSubject": { "type": "string" },
"emailBodyHtml": { "type": "string" }
```

Configure **Send an email (V2)** as follows:

| Flow                                  | To              | Subject                          | Body                              |
| ------------------------------------- | --------------- | -------------------------------- | --------------------------------- |
| TOKIN - Request Approval              | Approver email  | `triggerBody()?['emailSubject']` | `triggerBody()?['emailBodyHtml']` |
| TOKIN - Requester Confirmation / Manage | Requester email | `triggerBody()?['emailSubject']` | `triggerBody()?['emailBodyHtml']` |
| TOKIN - Assignment Notification       | Requester email | `triggerBody()?['emailSubject']` | `triggerBody()?['emailBodyHtml']` |

For each Subject and Body field, select **Expression**, paste the expression shown above, and select **Add**. The Outlook connector treats the Body value as HTML. Keep **From (Send as)** set to `th-info@yageo.com`.

The templates intentionally use one clear primary action per message:

- Approval: **Review and decide**
- New public submission: **Confirm request**
- Submitted: **View or manage request**
- Changes requested: **Edit and resubmit request**
- Assignment: **View assignment**, plus a secondary **Download PDF** link

Route both `request.confirmation_required` and `request.confirmed` events through the requester flow. Save each flow, then create a new test request. Verify that no approval message is delivered before the requester confirms. Old flow runs and previously generated emails will keep their old content.
