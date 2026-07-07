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
  "notificationType": "progress-followup",
  "currentTreatment": "5번",
  "currentTreatmentKind": "acupuncture",
  "nextTreatment": "2번",
  "nextTreatmentKind": "acupuncture",
  "eventKey": "progress-followup|김준현|female|5번|2번|acupuncture"
}
```

Initial Slack message example:

```text
[[ 5번 ]] 침 치료 있습니다.
다음 순서는 [[ 2번 ]] 입니다.
```

Follow-up Slack message example:

```text
현재 [[ 5번 ]] 침 치료중입니다.
다음 순서는 [[ 2번 ]] 입니다.
```

Meal slots are only announced as the next order:

```text
다음 순서는 [[ 식사 ]] 입니다.
```

No Slack message is sent while meal itself is in progress.

Do not commit Slack tokens or Slack user IDs unless the user explicitly accepts that exposure risk.
