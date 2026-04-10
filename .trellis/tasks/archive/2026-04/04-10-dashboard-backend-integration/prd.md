# Dashboard Backend Integration (Phase 5.2)

## Goal

Connect the Dashboard page to real backend API endpoints and display live data, replacing static mock values with actual system metrics.

---

## Requirements

### Functional Requirements

#### FR-1: Backend API Integration

- **FR-1.1**: Call `/api/status` endpoint to fetch system status
- **FR-1.2**: Implement polling mechanism (every 3-5 seconds)
- **FR-1.3**: Handle API errors gracefully
- **FR-1.4**: Display loading states during data fetch

#### FR-2: Service Status Card

- **FR-2.1**: Show `serviceConnected` status from API response
- **FR-2.2**: Display "Online" badge when connected, "Offline" when not
- **FR-2.3**: Use success/error status type for visual indication

#### FR-3: Active Sessions Card

- **FR-3.1**: Display `browserSessionCount` from API
- **FR-3.2**: Show WebSocket connection count in subtitle
- **FR-3.3**: Update count in real-time via polling

#### FR-4: Load Distribution

- **FR-4.1**: Map `browserSessions[].usageCount` to load bars
- **FR-4.2**: Display session ID and usage for each session
- **FR-4.3**: Visual progress bars showing relative load

#### FR-5: Remove Unused Components

- **FR-5.1**: Remove "Today Requests" card
- **FR-5.2**: Remove "Avg Latency" card
- **FR-5.3**: Remove `TrafficChart` component
- **FR-5.4**: Remove `RequestTable` component

---

## Technical Specifications

### API Endpoint

```javascript
GET /api/status

Response:
{
  "status": {
    "serviceConnected": boolean,
    "browserSessionCount": number,
    "browserSessions": [
      {
        "connectionId": string,
        "usageCount": number,
        "disabledAt": string | null,
        "errorCount": number
      }
    ]
  }
}
```

### Implementation Pattern

```javascript
// State
const serviceConnected = ref(false);
const browserSessionCount = ref(0);
const browserSessions = ref([]);

// Fetch function
const fetchStatus = async () => {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    serviceConnected.value = data.status.serviceConnected;
    browserSessionCount.value = data.status.browserSessionCount;
    browserSessions.value = data.status.browserSessions || [];
  } catch (err) {
    console.error("Failed to fetch status:", err);
  }
};

// Polling
onMounted(() => {
  fetchStatus();
  const interval = setInterval(fetchStatus, 3000);
  onUnmounted(() => clearInterval(interval));
});
```

---

## Acceptance Criteria

### Must Have

- [ ] `/api/status` called successfully
- [ ] Service Status card shows real `serviceConnected` value
- [ ] Active Sessions card shows real `browserSessionCount`
- [ ] Load Distribution shows session usage data
- [ ] Polling works every 3 seconds
- [ ] Unused components removed (Today Requests, Avg Latency, Traffic Chart, Request Table)
- [ ] No console errors
- [ ] No lint errors

### Should Have

- [ ] Loading state during initial fetch
- [ ] Error handling for API failures
- [ ] Graceful degradation when API unavailable

---

## Files to Modify

### Primary

- `ui/app/pages/StatusPage.vue` - Main implementation

### Secondary

- `ui/app/components/MetricCard.vue` - May need minor updates
- `ui/app/components/LoadDistribution.vue` - May need props update

---

## References

- Reference Code: `.temp/main-frontend/ui/app/pages/StatusPage.vue` (lines showing fetch pattern)
- Implementation Plan: `.trellis/tasks/ui-redesign-dashboard/IMPLEMENTATION.md` (Phase 5.2)
- Frontend Guidelines: `.trellis/spec/frontend/`

---

## Estimated Duration

2-3 hours
