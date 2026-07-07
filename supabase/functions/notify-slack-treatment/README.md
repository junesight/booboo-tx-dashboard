# Slack DM treatment notification

This function sends a private Slack DM when 김준현's first treatment slot changes to in-progress.

Required Supabase secrets:

- `SLACK_BOT_TOKEN`: Slack bot token with permission to send messages.
- `JUNHYUN_SLACK_USER_ID`: 김준현 원장님의 Slack user ID.

Expected request body:

```json
{
  "doctorName": "김준현",
  "ward": "female",
  "wardLabel": "여자 치료실",
  "currentTreatment": "5번",
  "nextTreatment": "2번",
  "eventKey": "김준현|female|5번|2번|..."
}
```

Slack message example:

```text
[여자 치료실]
5번 침치료중입니다.
다음 치료는 2번입니다.
```

Do not commit Slack tokens or Slack user IDs unless the user explicitly accepts that exposure risk.
