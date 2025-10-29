#!/bin/bash
# Nof1 API 测试脚本

# 计算当前 marker
INITIAL_TIME="2025-10-17T22:30:00Z"
CURRENT_TIME=$(date -u +%s)
INITIAL_TIMESTAMP=$(date -jf "%Y-%m-%dT%H:%M:%SZ" "$INITIAL_TIME" +%s 2>/dev/null || date -d "$INITIAL_TIME" +%s)
HOURS_DIFF=$(( ($CURRENT_TIME - $INITIAL_TIMESTAMP) / 3600 ))

echo "🔍 计算的 lastHourlyMarker: $HOURS_DIFF"
echo "📡 正在调用 API..."
echo ""

# 调用 API
curl -s "https://nof1.ai/api/account-totals?lastHourlyMarker=$HOURS_DIFF" \
  -H "Content-Type: application/json" \
  -H "User-Agent: nof1-maker/1.0.0" | jq '.' || \
  curl -s "https://nof1.ai/api/account-totals?lastHourlyMarker=$HOURS_DIFF" \
  -H "Content-Type: application/json" \
  -H "User-Agent: nof1-maker/1.0.0"

echo ""
echo "✅ 测试完成"
