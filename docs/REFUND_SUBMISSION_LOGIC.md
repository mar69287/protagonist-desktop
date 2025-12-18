# Refund Submission Filtering Logic

## Problem Solved

### Issue 1: Same-Day Submissions

If EventBridge fires at **2:49 AM UTC** on Jan 18 but a submission is due at **11:00 PM UTC** on Jan 18, we shouldn't mark it as incomplete yet - the user still has time!

### Issue 2: Multi-Period Tracking

If a submission is "pending" during Month 1's check (so we skip it), how do we prevent counting it again in Month 2's check after they complete it?

## Solution Overview

### 1. Smart Filtering Criteria

When calculating refunds, we **ONLY** count submissions that meet **ALL** of these criteria:

```typescript
// 1. Date Range: Submission is within billing period
const inDateRange =
  submissionDate >= subscriptionStart && submissionDate <= checkTime;

// 2. Deadline Passed: Don't evaluate future submissions
const deadlinePassed = deadline <= now;

// 3. Final Status: User attempted the submission
const isFinalStatus = day.status === "verified" || day.status === "denied";

// 4. Not Previously Checked: First time evaluating this submission
const notAlreadyChecked = !day.refundCheckPeriod;
```

### 2. Status Definitions

**Counted as "Completed" (gets credit):**

- ✅ `"verified"` - Passed AI verification
- ✅ `"denied"` - Failed AI verification **BUT they tried on time**

**Not Counted (skipped):**

- ❌ `"pending"` - Not submitted yet
- ❌ `"processing"` - Being reviewed by AI
- ❌ `"missed"` - Deadline passed without submission
- ❌ `"failed"` - Technical failure
- ❌ `"double-checking"` - AI is re-evaluating

### 3. Period Tracking

Each submission gets marked with when it was evaluated:

```typescript
interface SubmissionDay {
  // ... existing fields
  refundCheckPeriod?: string; // e.g., "2026-01" = January 2026's refund check
}
```

After processing a refund, we update all checked submissions:

```typescript
{
  targetDate: "2026-01-15",
  status: "verified",
  refundCheckPeriod: "2026-01"  // ← Marked as checked in Jan 2026
}
```

## Example Scenarios

### Scenario A: Same-Day Submission (Future Deadline)

**Setup:**

- Current time: Jan 18, 2026 2:49 AM UTC
- Submission due: Jan 18, 2026 11:00 PM UTC
- Status: "pending"

**Result:**

- ❌ **Skipped** (deadline hasn't passed yet)
- User still has ~20 hours to submit
- Will be evaluated in next billing period if completed

### Scenario B: Same-Day Submission (Past Deadline, Verified)

**Setup:**

- Current time: Jan 18, 2026 2:49 AM UTC
- Submission due: Jan 17, 2026 11:00 PM UTC
- Status: "verified"

**Result:**

- ✅ **Counted as complete**
- Deadline passed (yesterday)
- User submitted and AI approved
- Marked with `refundCheckPeriod: "2026-01"`

### Scenario C: Denied Submission

**Setup:**

- Current time: Feb 18, 2026 2:49 AM UTC
- Submission due: Feb 10, 2026 11:00 PM UTC
- Status: "denied"

**Result:**

- ✅ **Counted as complete**
- User tried on time
- AI rejected it, but they made the attempt
- Counts toward completion rate

### Scenario D: Multi-Period Challenge

**Month 1 (Jan 18):**

```
Submission A: Jan 5, verified ✅ → Counted, marked "2026-01"
Submission B: Jan 12, denied ✅ → Counted, marked "2026-01"
Submission C: Jan 19, pending ❌ → Skipped (deadline not passed yet)
```

**Month 2 (Feb 18):**

```
Submission A: Already marked "2026-01" ❌ → Skipped (already counted)
Submission B: Already marked "2026-01" ❌ → Skipped (already counted)
Submission C: Now verified, no refundCheckPeriod ✅ → Counted, marked "2026-02"
Submission D: Feb 5, verified ✅ → Counted, marked "2026-02"
```

## Timeline Example

### User's Subscription: Dec 18, 2025 → Jan 18, 2026

**Submission Schedule (Every Monday, Wednesday, Friday at 11 PM UTC):**

| Date   | Day | Due         | Status at Check (Jan 18, 2:49 AM) | Counted? | Reason                       |
| ------ | --- | ----------- | --------------------------------- | -------- | ---------------------------- |
| Dec 20 | Fri | Dec 20 11PM | verified                          | ✅       | Past deadline, verified      |
| Dec 23 | Mon | Dec 23 11PM | denied                            | ✅       | Past deadline, they tried    |
| Dec 25 | Wed | Dec 25 11PM | missed                            | ❌       | Missed = no attempt          |
| Dec 27 | Fri | Dec 27 11PM | verified                          | ✅       | Past deadline, verified      |
| Jan 3  | Fri | Jan 3 11PM  | verified                          | ✅       | Past deadline, verified      |
| Jan 6  | Mon | Jan 6 11PM  | processing                        | ❌       | AI still checking            |
| Jan 17 | Fri | Jan 17 11PM | verified                          | ✅       | Past deadline, verified      |
| Jan 18 | Sat | Jan 18 11PM | pending                           | ❌       | **Deadline not passed yet!** |

**Refund Calculation (Jan 18, 2:49 AM):**

- **Total Expected:** 7 submissions (excluding Jan 18)
- **Completed:** 5 (3 verified + 1 denied + 1 verified + 1 verified + 1 verified)
- **Completion Rate:** 5/7 = 71.4%
- **Refund (First Cycle):** $50 (70-90% tier)

**What Happens to Jan 18 Submission?**

- User has until Jan 18 11 PM UTC to submit
- If they submit by then → Status becomes "verified" or "denied"
- **Will be counted in NEXT billing period** (Feb refund check)

## Code Implementation

### Filter Logic

```typescript
const currentPeriodId = `${checkTime.getUTCFullYear()}-${String(
  checkTime.getUTCMonth() + 1
).padStart(2, "0")}`;

const submissionsInPeriod = submissionCalendar.filter((day) => {
  const submissionDate = new Date(day.targetDate);
  const deadline = new Date(day.deadline);
  const now = new Date();

  const inDateRange =
    submissionDate >= subscriptionStart && submissionDate <= checkTime;
  const deadlinePassed = deadline <= now;
  const isFinalStatus = day.status === "verified" || day.status === "denied";
  const notAlreadyChecked = !day.refundCheckPeriod;

  return inDateRange && deadlinePassed && isFinalStatus && notAlreadyChecked;
});
```

### Marking Checked Submissions

```typescript
// After calculating refund, mark all submissions
for (const challenge of challengesToCheck) {
  const updatedCalendar = (challenge.submissionCalendar || []).map((day) => {
    const wasIncluded = allRelevantSubmissions.some(
      (sub) => sub.targetDate === day.targetDate
    );
    if (wasIncluded) {
      return { ...day, refundCheckPeriod: currentPeriodId };
    }
    return day;
  });

  await dynamoDb.send(
    new UpdateCommand({
      TableName: TableNames.CHALLENGES,
      Key: { challengeId: challenge.challengeId },
      UpdateExpression: "SET submissionCalendar = :calendar",
      ExpressionAttributeValues: { ":calendar": updatedCalendar },
    })
  );
}
```

## Benefits

1. ✅ **Fair to Users**: Don't penalize for future submissions
2. ✅ **Accurate Counting**: Never double-count a submission
3. ✅ **Credits Attempts**: "Denied" submissions count (they tried!)
4. ✅ **Multi-Challenge Support**: Works across multiple challenges in same period
5. ✅ **Clear Audit Trail**: Each submission tracks when it was evaluated

## Related Files

- `/lib/generateSubmissionCalendar.tsx` - SubmissionDay interface with `refundCheckPeriod`
- `/app/api/stripe/process-refund/route.ts` - Refund calculation and filtering logic
- `/app/api/stripe/webhooks/route.ts` - EventBridge rule creation
- `/services/aws/eventbridge.ts` - EventBridge management
