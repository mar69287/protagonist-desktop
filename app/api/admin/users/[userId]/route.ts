// app/api/admin/users/[userId]/route.ts

import { NextResponse } from "next/server";
import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { requireAdmin } from "@/services/aws/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmissionDay = {
  targetDate: string;
  dayOfWeek?: string;
  deadline?: string;
  deadlineLocal?: string;
  status:
    | "pending"
    | "processing"
    | "verified"
    | "denied"
    | "missed"
    | "failed"
    | "double-checking";
  submissionId?: string;
  submittedAt?: string;
};

type ChallengeRecord = {
  challengeId: string;
  userId: string;
  status: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  goalDescription?: string;
  why?: string;
  schedule?: string;
  timezone?: string;
  proofMethod?: string;
  submissionType?: string;
  plan?: string;
  scheduleDays?: string[];
  deadlineTime?: string;
  frequency?: string;
  submissionCalendar?: SubmissionDay[];
  totalSubmissions?: number;
  latestSubmissionId?: string;
  latestSubmissionStatus?: string;
  depositAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  charityContext?: string;
};

async function findChallengesForUser(userId: string): Promise<ChallengeRecord[]> {
  // Try a Query first (in case a userId GSI exists). Fall back to Scan.
  try {
    const result = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.CHALLENGES,
        IndexName: "userId-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      })
    );
    return (result.Items || []) as ChallengeRecord[];
  } catch (err: any) {
    // Index does not exist or query not supported — fall back to scan.
    const items: ChallengeRecord[] = [];
    let lastKey: Record<string, any> | undefined = undefined;
    do {
      const res: any = await dynamoDb.send(
        new ScanCommand({
          TableName: TableNames.CHALLENGES,
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
          ExclusiveStartKey: lastKey,
        })
      );
      if (res.Items) items.push(...(res.Items as ChallengeRecord[]));
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
  }
}

function summarizeCalendar(calendar: SubmissionDay[] | undefined) {
  const summary = {
    verified: 0,
    denied: 0,
    missed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    doubleChecking: 0,
    total: 0,
  };
  if (!calendar) return summary;

  for (const day of calendar) {
    summary.total += 1;
    switch (day.status) {
      case "verified":
        summary.verified += 1;
        break;
      case "denied":
        summary.denied += 1;
        break;
      case "missed":
        summary.missed += 1;
        break;
      case "pending":
        summary.pending += 1;
        break;
      case "processing":
        summary.processing += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "double-checking":
        summary.doubleChecking += 1;
        break;
    }
  }
  return summary;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const userResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.Item as Record<string, any>;

    // Load current challenge (prefer currentChallengeId).
    let currentChallenge: ChallengeRecord | null = null;
    const allChallenges = await findChallengesForUser(userId);

    if (user.currentChallengeId) {
      currentChallenge =
        allChallenges.find((c) => c.challengeId === user.currentChallengeId) ||
        null;

      if (!currentChallenge) {
        // Fallback: fetch directly in case scan/query missed it.
        try {
          const direct = await dynamoDb.send(
            new GetCommand({
              TableName: TableNames.CHALLENGES,
              Key: { challengeId: user.currentChallengeId },
            })
          );
          if (direct.Item) {
            currentChallenge = direct.Item as ChallengeRecord;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!currentChallenge && allChallenges.length > 0) {
      // Prefer active, otherwise most recently updated.
      const active = allChallenges.find((c) => c.status === "active");
      currentChallenge =
        active ||
        allChallenges.sort((a, b) => {
          const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bT - aT;
        })[0] ||
        null;
    }

    const submissionSummary = summarizeCalendar(
      currentChallenge?.submissionCalendar
    );

    // Only expose a safe subset of the user record.
    const safeUser = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
      timezone: user.timezone,
      charity: user.charity,
      days_of_streak: user.days_of_streak,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionType: user.subscriptionType,
      currentPeriodStart: user.currentPeriodStart,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentChallengeId: user.currentChallengeId,
      lastStreakBreak: user.lastStreakBreak,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({
      user: safeUser,
      currentChallenge,
      submissionSummary,
      totalChallenges: allChallenges.length,
    });
  } catch (error: any) {
    console.error("[Admin User Detail API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load user detail" },
      { status: 500 }
    );
  }
}
