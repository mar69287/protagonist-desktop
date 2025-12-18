# Refund System - Quick Start

## 📖 Documentation

### 1. [HOW_REFUNDS_WORK.md](/docs/HOW_REFUNDS_WORK.md)

Complete explanation of how the refund system works, including:

- The flow from subscription to refund
- Refund tier calculations
- How completion rates are calculated
- Multi-month challenge handling
- Database structure
- Examples and edge cases

### 2. [AWS_SETUP_GUIDE.md](/docs/AWS_SETUP_GUIDE.md)

Step-by-step AWS Console setup instructions:

- IAM permissions
- Lambda function (with complete code)
- EventBridge role
- Environment variables
- Testing instructions
- Troubleshooting

## 🚀 Quick Summary

**What it does:**

1. User subscribes → Challenge created with submission schedule
2. EventBridge scheduled 1 hour before billing period ends (stores userId)
3. EventBridge triggers → Lambda → Your API (sends userId)
4. API gets user's currentChallengeId
5. API checks if multiple challenges exist in this billing period
6. API combines submissions from all relevant challenges
7. API calculates completion rate
8. API issues Stripe refund based on performance
9. EventBridge rule deleted (challenges continue if multi-month)

**Refund Tiers:**

- First challenge: 90%+ = $98, 70-89% = $50, <70% = $0
- Subsequent: 90%+ = $50, 70-89% = $25, <70% = $0

**Environment Variables Needed:**

```env
EVENTBRIDGE_TARGET_ARN=arn:aws:lambda:us-west-1:xxx:function:protagonist-refund-trigger
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::xxx:role/eventbridge-lambda-role
```

## 🧪 Testing Locally

**EventBridge won't work with localhost.** You need either:

**Option A: Use ngrok**

```bash
npm run dev
ngrok http 3000
# Use ngrok URL in Lambda environment variable
```

**Option B: Test API directly (skip EventBridge)**

```bash
curl -X POST http://localhost:3000/api/stripe/process-refund \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","subscriptionId":"sub_123","action":"pre_billing_check"}'
```

## ⚠️ Important Notes

1. **Uses billing period dates** from `user.currentPeriodStart/End`, NOT challenge dates
2. **Handles multiple challenges** in one billing period automatically
3. **EventBridge stores userId** (not challengeId) to handle this
4. **EventBridge rules auto-delete** after they fire (one-time per billing period)
5. **Challenges NOT marked complete** - they continue across months
6. **First billing cycle vs subsequent** detection is automatic

## 📁 Key Files

- `/app/api/stripe/process-refund/route.ts` - Main refund logic
- `/app/api/stripe/webhooks/route.ts` - Creates EventBridge rules
- `/services/aws/eventbridge.ts` - EventBridge management

## 🔧 Code Changes Made

1. EventBridge passes userId (not challengeId) to handle multiple challenges
2. Refund API gets user's currentChallengeId
3. Checks if challenge started mid-period (gets previous challenge too)
4. Combines submissions from all challenges in billing period
5. Calculates refund based on combined performance
6. Challenges NOT marked complete (continue across months)
7. EventBridge rule cleanup after execution

## ✅ Setup Checklist

- [ ] Read `/docs/HOW_REFUNDS_WORK.md`
- [ ] Follow `/docs/AWS_SETUP_GUIDE.md`
- [ ] Create Lambda function
- [ ] Set up IAM permissions and role
- [ ] Add environment variables
- [ ] Test with ngrok or deployed app
- [ ] Verify EventBridge rules are created
- [ ] Verify refunds process correctly
- [ ] Verify EventBridge rules are deleted after use
