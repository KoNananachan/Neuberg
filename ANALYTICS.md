# TradingNews Analytics Report

Generated: 2026-04-07 | Source: GCP Cloud Run Logs (unique IP analysis)

## 30-Day Unique Visitors Trend

> Note: 4/1-4/3 data incomplete due to Cloud Logging API pagination limits (those were the highest-traffic days with 300K+ total requests on 4/2)

| Date | Unique IPs | Trend |
|------|-----------|-------|
| 03/09 | 3 | Pre-launch test |
| 03/10 | 190 | Initial launch |
| 03/16 | 136 | |
| 03/17 | 152 | |
| 03/19 | 9 | |
| 03/20 | 77 | |
| 03/21 | 63 | |
| 03/22 | 61 | |
| 03/23 | 102 | |
| 03/24 | 114 | |
| 03/25 | 21 | |
| 03/26 | 75 | |
| 03/27 | 104 | |
| 03/28 | 63 | |
| 03/29 | 59 | |
| 03/30 | 84 | |
| 03/31 | 63 | |
| 04/01-03 | (data incomplete) | Peak period - 300K req on 4/2 |
| 04/04 | 186 | |
| 04/05 | 456 | Peak (measurable) |
| 04/06 | 448 | |
| 04/07 | 132 | (partial day) |

## Key Metrics

| Metric | Value |
|--------|-------|
| Total unique IPs (30d) | 1,930+ |
| Peak day (measurable) | 456 IPs (Apr 5) |
| Peak day (by request vol.) | Apr 2 (300K requests, 32K WebSocket conns) |
| Last 7d daily avg | ~204 unique IPs |
| Mar baseline (3/20-3/31) | ~70 unique IPs/day |
| Apr baseline (4/4-4/7) | ~300 unique IPs/day |

## D1 Retention (next-day return)

| Period | Avg D1 Retention |
|--------|-----------------|
| Mar 20-31 (baseline) | ~20% |
| Apr 4-5 (post-peak) | 56% |
| Apr 5-6 | 28% |
| Apr 6-7 | 17% |

## D7 Retention (7-day return)

| Period | Avg D7 Retention |
|--------|-----------------|
| Mar 10-24 → Mar 17-31 | ~5-9% |
| Mar 28 → Apr 7 | 3% |

## Observations

1. **Growth**: Traffic grew ~4x from March baseline (~70/day) to April (~300/day)
2. **Spike**: Massive traffic spike on Apr 2 (likely promotion/launch event) - 300K requests, 32K WebSocket connections
3. **D1 Retention ~20%**: Typical for a content/tool product without push notifications or email campaigns
4. **D7 Retention ~5%**: Low - indicates most users try once and don't come back weekly
5. **WebSocket retention 40%**: Users who engage deeply (open WebSocket = real-time data) retain better than casual visitors
6. **No analytics tool installed**: All data from infrastructure logs (Cloud Run). No user-level tracking (page views, session duration, feature usage)

## Recommendations

- Install PostHog (open-source, self-hostable) for proper user analytics
- Add email capture for re-engagement campaigns
- Track feature-level engagement (which news categories, chat usage, etc.)
