// services/aws/eventbridge.ts

import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  DeleteRuleCommand,
  RemoveTargetsCommand,
  ListTargetsByRuleCommand,
} from "@aws-sdk/client-eventbridge";

const eventBridgeClient = new EventBridgeClient({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT!,
  },
});

/**
 * Creates a one-time EventBridge rule that triggers at a specific time
 * to check submissions before billing
 */
export async function createPreBillingCheckRule(
  userId: string,
  subscriptionId: string,
  triggerTime: Date
): Promise<void> {
  // Create a shorter hash-based rule name (EventBridge max is 64 chars)
  // Use first 8 chars of userId + last 8 of subscriptionId for uniqueness
  const userIdShort = userId.substring(0, 8);
  const subIdShort = subscriptionId.slice(-8);
  const ruleName = `pre-billing-${userIdShort}-${subIdShort}`;

  try {
    // Convert to cron expression in UTC
    const utcTriggerTime = new Date(triggerTime);
    const minutes = utcTriggerTime.getUTCMinutes();
    const hours = utcTriggerTime.getUTCHours();
    const dayOfMonth = utcTriggerTime.getUTCDate();
    const month = utcTriggerTime.getUTCMonth() + 1; // Month is 0-indexed
    const year = utcTriggerTime.getUTCFullYear();

    // Create a one-time schedule expression
    // Format: cron(minutes hours day month ? year)
    const scheduleExpression = `cron(${minutes} ${hours} ${dayOfMonth} ${month} ? ${year})`;

    console.log(
      `Creating EventBridge rule ${ruleName} with schedule: ${scheduleExpression}`
    );

    // Create the rule
    await eventBridgeClient.send(
      new PutRuleCommand({
        Name: ruleName,
        Description: `Pre-billing submission check for user ${userId}`,
        ScheduleExpression: scheduleExpression,
        State: "ENABLED",
      })
    );

    // Add target - this should point to your API endpoint
    // You'll need to create an API Gateway or Lambda function target
    const targetArn = process.env.EVENTBRIDGE_TARGET_ARN;

    if (!targetArn) {
      throw new Error("EVENTBRIDGE_TARGET_ARN environment variable not set");
    }

    const roleArn = process.env.EVENTBRIDGE_ROLE_ARN;

    if (!roleArn) {
      throw new Error("EVENTBRIDGE_ROLE_ARN environment variable not set");
    }

    await eventBridgeClient.send(
      new PutTargetsCommand({
        Rule: ruleName,
        Targets: [
          {
            Id: `target-${userId}`,
            Arn: targetArn,
            RoleArn: roleArn,
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

    console.log(`EventBridge rule ${ruleName} created successfully`);
  } catch (error) {
    console.error(`Error creating EventBridge rule for ${userId}:`, error);
    throw error;
  }
}

/**
 * Deletes an EventBridge rule and its targets
 */
export async function deletePreBillingCheckRule(
  userId: string,
  subscriptionId: string
): Promise<void> {
  // Use same naming pattern as creation
  const userIdShort = userId.substring(0, 8);
  const subIdShort = subscriptionId.slice(-8);
  const ruleName = `pre-billing-${userIdShort}-${subIdShort}`;

  try {
    // First, remove all targets
    const targets = await eventBridgeClient.send(
      new ListTargetsByRuleCommand({
        Rule: ruleName,
      })
    );

    if (targets.Targets && targets.Targets.length > 0) {
      const targetIds = targets.Targets.map((t) => t.Id!);
      await eventBridgeClient.send(
        new RemoveTargetsCommand({
          Rule: ruleName,
          Ids: targetIds,
        })
      );
    }

    // Then delete the rule
    await eventBridgeClient.send(
      new DeleteRuleCommand({
        Name: ruleName,
      })
    );

    console.log(`EventBridge rule ${ruleName} deleted successfully`);
  } catch (error) {
    if (error instanceof Error && error.name === "ResourceNotFoundException") {
      console.log(`EventBridge rule ${ruleName} not found, skipping deletion`);
      return;
    }
    console.error(`Error deleting EventBridge rule ${ruleName}:`, error);
    throw error;
  }
}
