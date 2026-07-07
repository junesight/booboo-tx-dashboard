const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type TreatmentNotificationRequest = {
  doctorName?: string;
  ward?: string;
  wardLabel?: string;
  notificationType?: 'treatment-start' | 'progress-followup';
  currentTreatment?: string;
  currentTreatmentKind?: string | null;
  nextTreatment?: string | null;
  nextTreatmentKind?: string | null;
  eventKey?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function callSlackApi(method: string, token: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    const error = typeof data.error === 'string' ? data.error : `http_${response.status}`;
    throw new Error(`${method} failed: ${error}`);
  }

  return data;
}

function treatmentPhrase(label: string, kind?: string | null) {
  if (kind === 'consultation') return '상담';
  if (kind === 'diet') return '린다이어트 상담';
  if (kind === 'herbal-consult') return '한약상담';
  if (kind === 'chuna') return '추나 치료';
  if (kind === 'ultrasound') return '초음파 약침 시술';
  if (kind === 'placenta') return '자하거/디나 시술';
  if (kind === 'bloodletting') return label;
  if (kind === 'meal') return '식사';
  return `${label} 침치료`;
}

function currentTreatmentText(label: string, kind?: string | null) {
  const phrase = treatmentPhrase(label, kind);
  return kind === 'acupuncture' || !kind
    ? `현재 ${phrase} 중입니다.`
    : `현재 ${phrase}중입니다.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN');
  const junhyunSlackUserId = Deno.env.get('JUNHYUN_SLACK_USER_ID');

  if (!slackBotToken || !junhyunSlackUserId) {
    return jsonResponse({ ok: false, error: 'missing_slack_secret' }, 500);
  }

  let body: TreatmentNotificationRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  if (body.doctorName !== '김준현') {
    return jsonResponse({ ok: false, error: 'unsupported_doctor' }, 400);
  }

  if (!body.currentTreatment) {
    return jsonResponse({ ok: false, error: 'missing_current_treatment' }, 400);
  }

  const notificationType = body.notificationType || 'progress-followup';
  const nextText = body.nextTreatment
    ? (body.nextTreatmentKind === 'acupuncture' || !body.nextTreatmentKind
      ? `다음 치료는 ${body.nextTreatment} 입니다.`
      : `다음 순서는 ${treatmentPhrase(body.nextTreatment, body.nextTreatmentKind)}입니다.`)
    : '다음 치료는 없습니다.';
  const text = notificationType === 'treatment-start'
    ? `${body.currentTreatment} 침치료 있습니다.`
    : `${currentTreatmentText(body.currentTreatment, body.currentTreatmentKind)}\n${nextText}`;

  try {
    const openResult = await callSlackApi('conversations.open', slackBotToken, {
      users: junhyunSlackUserId,
    });
    const channelId = openResult.channel?.id;

    if (!channelId) {
      throw new Error('conversations.open failed: missing_channel_id');
    }

    await callSlackApi('chat.postMessage', slackBotToken, {
      channel: channelId,
      text,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'slack_send_failed' }, 502);
  }
});
