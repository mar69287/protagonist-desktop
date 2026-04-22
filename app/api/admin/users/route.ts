// app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { requireAdmin } from "@/services/aws/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserRecord = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  subscriptionStatus?: string | null;
  subscriptionType?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  charity?: string;
  timezone?: string;
  days_of_streak?: number;
  currentChallengeId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const users: UserRecord[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const result: any = await dynamoDb.send(
        new ScanCommand({
          TableName: TableNames.USERS,
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: [
            "userId",
            "email",
            "firstName",
            "lastName",
            "isAdmin",
            "subscriptionStatus",
            "subscriptionType",
            "currentPeriodStart",
            "currentPeriodEnd",
            "cancelAtPeriodEnd",
            "charity",
            "#tz",
            "days_of_streak",
            "currentChallengeId",
            "createdAt",
            "updatedAt",
          ].join(", "),
          ExpressionAttributeNames: {
            "#tz": "timezone",
          },
        })
      );

      if (result.Items) {
        users.push(...(result.Items as UserRecord[]));
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Sort: active subscriptions first, then by createdAt desc
    users.sort((a, b) => {
      const aActive = a.subscriptionStatus === "active" ? 0 : 1;
      const bActive = b.subscriptionStatus === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    const totals = {
      total: users.length,
      active: users.filter((u) => u.subscriptionStatus === "active").length,
      trialing: users.filter((u) => u.subscriptionStatus === "trialing").length,
      canceled: users.filter((u) => u.subscriptionStatus === "canceled").length,
    };

    return NextResponse.json({ users, totals });
  } catch (error: any) {
    console.error("[Admin Users API] Error listing users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list users" },
      { status: 500 }
    );
  }
}
