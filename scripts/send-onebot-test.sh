#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:5678/webhook/onebot}"
SECRET="${SECRET:-your-secret}"

# When BODY is set, this script sends that exact payload.
# Otherwise it sends a preset from TEST_CASE, or all presets if TEST_CASE=all.
TEST_CASE="${TEST_CASE:-poke}"

payload_for_case() {
  case "$1" in
    poke)
      printf '%s' '{"post_type":"notice","notice_type":"notify","sub_type":"poke","user_id":123,"target_id":456,"self_id":789}'
      ;;
    group_message)
      printf '%s' '{"post_type":"message","message_type":"group","sub_type":"normal","message_id":10001,"group_id":10086,"user_id":123,"self_id":789,"message":"hello group"}'
      ;;
    private_message)
      printf '%s' '{"post_type":"message","message_type":"private","sub_type":"friend","message_id":10002,"user_id":123,"self_id":789,"message":"hello private"}'
      ;;
    group_increase)
      printf '%s' '{"post_type":"notice","notice_type":"group_increase","sub_type":"invite","group_id":10086,"user_id":123,"operator_id":456,"self_id":789}'
      ;;
    friend_request)
      printf '%s' '{"post_type":"request","request_type":"friend","user_id":123,"comment":"add me","flag":"friend-flag-1","self_id":789}'
      ;;
    group_request)
      printf '%s' '{"post_type":"request","request_type":"group","sub_type":"add","group_id":10086,"user_id":123,"comment":"join group","flag":"group-flag-1","self_id":789}'
      ;;
    meta_heartbeat)
      printf '%s' '{"post_type":"meta","meta_event_type":"heartbeat","status":{"online":true,"good":true},"interval":5000,"self_id":789}'
      ;;
    *)
      echo "Unknown TEST_CASE: $1" >&2
      echo "Valid values: poke, group_message, private_message, group_increase, friend_request, group_request, meta_heartbeat, all" >&2
      exit 1
      ;;
  esac
}

send_payload() {
  local case_name="$1"
  local body="$2"
  local sig

  sig=$(printf '%s' "$body" | openssl sha1 -hmac "$SECRET" | awk '{print $2}')

  echo ""
  echo "=== CASE: $case_name ==="
  echo "POST $WEBHOOK_URL"
  echo "x-signature: sha1=$sig"
  echo "body: $body"
  echo ""

  curl -i "$WEBHOOK_URL" \
    -H "content-type: application/json" \
    -H "x-signature: sha1=$sig" \
    --data "$body"
}

if [ -n "${BODY:-}" ]; then
  send_payload "custom" "$BODY"
  exit 0
fi

if [ "$TEST_CASE" = "all" ]; then
  for case_name in poke group_message private_message group_increase friend_request group_request meta_heartbeat; do
    send_payload "$case_name" "$(payload_for_case "$case_name")"
  done
  exit 0
fi

send_payload "$TEST_CASE" "$(payload_for_case "$TEST_CASE")"
