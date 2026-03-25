# n8n-nodes-onebot-trigger

[![npm version](https://img.shields.io/npm/v/n8n-nodes-onebot-trigger.svg)](https://www.npmjs.com/package/n8n-nodes-onebot-trigger)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-onebot-trigger.svg)](https://www.npmjs.com/package/n8n-nodes-onebot-trigger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OneBot Trigger community node for n8n.

## Features

- Receives OneBot webhook events via trigger webhook.
- Verifies fixed `x-signature` header using `HMAC-SHA1`.
- Uses credential Secret for signature verification when provided.
- If credential/Secret is empty, signature verification is skipped.
- Returns `401` when signature verification fails.
- Optional strict mode: invalid signatures return `401` with empty body.
- Outputs parsed JSON event payload to workflow on success.
- Adds a `onebot` object with commonly used fields (`userId`, `groupId`, `noticeType`, etc.).

## Local development

```bash
npm install
npm run build
```

Run n8n with custom extensions:

```bash
N8N_CUSTOM_EXTENSIONS=~/source/n8n/dist n8n start
```

## Simulate webhook request

Quick way:

```bash
SECRET='your-secret' npm run test:webhook
```

You can also override target URL and request body:

```bash
WEBHOOK_URL='http://localhost:5678/webhook/onebot' \
SECRET='your-secret' \
BODY='{"post_type":"message","message_type":"private","user_id":10001,"self_id":20002,"message":"hello"}' \
npm run test:webhook
```

Manual curl version:

```bash
BODY='{"post_type":"notice","notice_type":"notify","sub_type":"poke","user_id":123,"target_id":456}'
SECRET='your-secret'
SIG=$(printf '%s' "$BODY" | openssl sha1 -hmac "$SECRET" | awk '{print $2}')

curl -i 'http://localhost:5678/webhook/onebot' \
  -H "content-type: application/json" \
  -H "x-signature: sha1=$SIG" \
  --data "$BODY"
```

## Node parameters

- `Credential`: optional `OneBot Webhook API` credential (Secret is read from here).
- `HTTP Method`: webhook method, default `POST`.
- `Path`: webhook path, default `onebot`.
- `Event Type`: dropdown filter for `post_type`, choose `All` to pass all.
- `Message Type`: shown when `Event Type=message`.
- `Notice Type`: shown when `Event Type=notice`.
- `Request Type`: shown when `Event Type=request`.
- `Message Sub Type`: shown when `Event Type=message`.
- `Notice Sub Type`: shown when `Event Type=notice`.
- `Request Sub Type`: shown when `Event Type=request`.
- `User ID`: primary filter for `user_id`; comma-separated values, leave empty to pass all users.
- `Group ID`: primary filter for `group_id`; comma-separated values, leave empty to pass all groups.
- `Self ID`, `Target ID`: optional comma-separated allow-lists.
- `Strict Invalid Signature Response`: when enabled, invalid signatures return empty body.
- `Emit Skipped Item On Filter Mismatch`: when enabled, unmatched events are forwarded with `skipped=true`; when disabled (default), unmatched events are acknowledged and dropped.

## Filter behavior

- Any empty filter means no restriction for that field.
- For all user IDs to pass, leave `User ID` empty.
- Same rule applies to `Group ID`, `Self ID`, and `Target ID`.
- For unmatched events: by default they are dropped (only HTTP 200 response is returned). If `Emit Skipped Item On Filter Mismatch` is enabled, an item is still emitted with `skipped=true` for debugging/branching.
