# Complete AWS Setup Guide

## Prerequisites

- AWS Account
- Stripe account
- Next.js app deployed (or use ngrok for testing)

## Architecture

```
Stripe Webhook → Next.js → DynamoDB
                    ↓
            Creates EventBridge Rule
                    ↓
EventBridge (1hr before billing) → Lambda → Next.js API → Stripe Refund
```

## Part 1: IAM Permissions

### 1. Go to AWS Console → IAM → Users → Your User

### 2. Add These Permissions

Click "Add permissions" → "Create inline policy" → JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EventBridgeRules",
      "Effect": "Allow",
      "Action": [
        "events:PutRule",
        "events:PutTargets",
        "events:DeleteRule",
        "events:RemoveTargets",
        "events:ListTargetsByRule"
      ],
      "Resource": "arn:aws:events:us-west-1:*:rule/pre-billing-check-*"
    },
    {
      "Sid": "LambdaInvoke",
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:us-west-1:*:function:protagonist-refund-trigger"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": "arn:aws:iam::*:role/eventbridge-lambda-role"
    }
  ]
}
```

**Name it**: `protagonist-eventbridge-policy`

## Part 2: Lambda Function

### 1. Go to AWS Console → Lambda → Create function

**Settings:**

- Function name: `protagonist-refund-trigger`
- Runtime: Python 3.11
- Architecture: x86_64

### 2. Add This Code

**File name:** `lambda_function.py`

```python
import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function triggered by EventBridge to process refunds.

    Args:
        event: EventBridge event with userId, subscriptionId, action
        context: Lambda context

    Returns:
        Response with statusCode and body
    """
    print(f'EventBridge trigger received: {json.dumps(event)}')

    # Get API endpoint from environment variable
    api_endpoint = os.environ.get('API_ENDPOINT')

    if not api_endpoint:
        raise ValueError('API_ENDPOINT environment variable not set')

    # Extract event data
    user_id = event.get('userId')
    subscription_id = event.get('subscriptionId')
    action = event.get('action')
    scheduled_time = event.get('scheduledTime')

    print(f'Processing {action} for user {user_id}')

    # Prepare request data
    request_data = {
        'userId': user_id,
        'subscriptionId': subscription_id,
        'action': action,
        'scheduledTime': scheduled_time
    }

    # Make HTTP POST request to API
    url = f'{api_endpoint}/api/stripe/process-refund'
    headers = {
        'Content-Type': 'application/json'
    }

    try:
        # Encode data as JSON
        data = json.dumps(request_data).encode('utf-8')

        # Create request
        req = urllib.request.Request(
            url,
            data=data,
            headers=headers,
            method='POST'
        )

        # Make request
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))

        print(f'Success: {json.dumps(response_data)}')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Pre-billing check completed successfully',
                'data': response_data
            })
        }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'API error: {e.code} - {error_body}')

        return {
            'statusCode': e.code,
            'body': json.dumps({
                'error': 'API request failed',
                'details': error_body
            })
        }

    except urllib.error.URLError as e:
        print(f'Connection error: {str(e)}')
        raise

    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        raise
```

### 3. Configure Lambda

**Configuration → General configuration:**

- Timeout: 60 seconds
- Memory: 128 MB

**Configuration → Environment variables:**

- Key: `API_ENDPOINT`
- Value: `https://yourdomain.com` (or ngrok URL for testing)

### 4. Test Lambda

**Test → Create test event:**

Name: `test-refund-check`

Event JSON:

```json
{
  "userId": "test-user-id",
  "subscriptionId": "sub_test123",
  "action": "pre_billing_check",
  "scheduledTime": "2025-12-30T23:00:00.000Z"
}
```

Click "Test" - should call your API successfully and show the response in logs.

### 5. Get Lambda ARN

Copy the ARN at the top of the page:

```
arn:aws:lambda:us-west-1:123456789:function:protagonist-refund-trigger
```

## Part 3: IAM Role for EventBridge

### 1. Go to IAM → Roles → Create role

**Trusted entity:**

- AWS service
- Use case: EventBridge

**Permissions:**

- Click "Create policy" (opens new tab)
- JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-west-1:YOUR_ACCOUNT_ID:function:protagonist-refund-trigger"
    }
  ]
}
```

- Name: `eventbridge-lambda-invoke-policy`
- Go back to role creation tab
- Refresh policies, select `eventbridge-lambda-invoke-policy`

**Role name**: `eventbridge-lambda-role`

### 2. Get Role ARN

Copy the ARN:

```
arn:aws:iam::123456789:role/eventbridge-lambda-role
```

## Part 4: Update Lambda Permissions

### Go to Lambda → protagonist-refund-trigger → Configuration → Permissions

**Resource-based policy → Add permissions:**

- Service: EventBridge
- Principal: events.amazonaws.com
- Statement ID: AllowEventBridgeInvoke
- Action: lambda:InvokeFunction

## Part 5: Environment Variables

### Add to your `.env.local` (and production):

```env
# EventBridge
EVENTBRIDGE_TARGET_ARN=arn:aws:lambda:us-west-1:123456789:function:protagonist-refund-trigger
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::123456789:role/eventbridge-lambda-role

# AWS (already have these)
AWS_ACCESS_KEY_ID_NEXT=your-key
AWS_SECRET_ACCESS_KEY_NEXT=your-secret

# Stripe (already have these)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Part 6: Update Your Code

### In `/services/aws/eventbridge.ts`

Find this line:

```typescript
const targetArn = process.env.EVENTBRIDGE_TARGET_ARN;
```

And update the `PutTargetsCommand` to include the role:

```typescript
await eventBridgeClient.send(
  new PutTargetsCommand({
    Rule: ruleName,
    Targets: [
      {
        Id: `target-${userId}`,
        Arn: targetArn,
        RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
        Input: JSON.stringify({
          userId,
          subscriptionId,
          action: "pre_billing_check",
          scheduledTime: triggerTime.toISOString(),
        }),
      },
    ],
  })
);
```

## Part 7: Testing

### Option A: With ngrok (Test Locally)

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# Copy the ngrok URL (https://abc123.ngrok.io)
# Update Lambda environment variable API_ENDPOINT to ngrok URL
```

### Option B: Deploy to Staging

Deploy your Next.js app to Vercel/Railway/etc and use that URL.

### Test the Flow

1. **Trigger Stripe webhook** (create a test subscription)
2. **Check EventBridge Console** → Rules
   - Should see `pre-billing-check-{challengeId}`
3. **Check CloudWatch Logs** → Lambda logs
   - Should show the scheduled time
4. **Wait for trigger** OR manually invoke the rule
5. **Check DynamoDB** → Challenge should have `status: "completed"`

### Manual Test (Skip EventBridge)

```bash
curl -X POST http://localhost:3000/api/stripe/process-refund \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "your-challenge-id",
    "action": "pre_billing_check"
  }'
```

## Part 8: DynamoDB Indexes (If Not Already Created)

### Required Indexes

**1. Challenges Table:**

- Index name: `userId-createdAt-index`
- Partition key: `userId` (String)
- Sort key: `createdAt` (String)
- Projection: All attributes

**2. PaymentHistory Table:**

- Index name: `userId-createdAt-index`
- Partition key: `userId` (String)
- Sort key: `createdAt` (String)
- Projection: All attributes

## Monitoring

### CloudWatch Logs

**Lambda logs:**

```
/aws/lambda/protagonist-refund-trigger
```

**Check for:**

- "Processing pre_billing_check for challenge..."
- "Success: ..."
- Any errors

### EventBridge Rules

**Console → EventBridge → Rules:**

- Filter by `pre-billing-check-*`
- Check scheduled times
- Verify targets are set correctly

### DynamoDB

**Check challenges table:**

- `status: "completed"`
- `finalRefundAmount` populated
- `completedAt` timestamp

**Check paymentHistory table:**

- New entries with `type: "refund"`

## Troubleshooting

### EventBridge rule created but doesn't trigger

**Check:**

1. Lambda has resource policy allowing EventBridge
2. Role ARN is correct in EventBridge target
3. Schedule time is in the future
4. Lambda environment variable `API_ENDPOINT` is correct

### Lambda times out

**Fix:**

- Increase timeout to 60 seconds
- Check network connectivity to your API

### "Unable to find charge ID for refund"

**Fix:**

- Ensure payment has `stripeChargeId` or `stripeInvoiceId`
- Check Stripe webhooks are working

### EventBridge rule not deleting after use

**Check:**

- Code has the delete call (we just added it)
- IAM has `events:DeleteRule` permission

## Cost Estimates

**EventBridge:**

- First 5M invocations/month: Free
- After: $0.00000100 per invocation

**Lambda:**

- First 1M requests/month: Free
- After: $0.20 per 1M requests

**For 1000 users:** < $1/month total

## Production Checklist

- [ ] Lambda deployed with production API endpoint
- [ ] Environment variables set in production
- [ ] IAM permissions configured
- [ ] EventBridge role created
- [ ] DynamoDB indexes created
- [ ] Stripe webhooks configured
- [ ] CloudWatch alarms set up (optional)
- [ ] Test with a real subscription

## Summary

**What you created:**

1. Lambda function to trigger your API
2. IAM role for EventBridge to invoke Lambda
3. Permissions for your app to create EventBridge rules

**What happens automatically:**

1. User subscribes → EventBridge rule created
2. 1 hour before billing → Lambda triggers → API processes refund
3. EventBridge rule deleted after use

**No ongoing maintenance needed!**
