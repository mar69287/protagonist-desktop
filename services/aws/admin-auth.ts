// services/aws/admin-auth.ts

import { NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";

type RequireAdminSuccess = {
  ok: true;
  userId: string;
  user: Record<string, any>;
};

type RequireAdminFailure = {
  ok: false;
  response: NextResponse;
};

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure;

/**
 * Ensures the requester is authenticated AND flagged as an admin in DynamoDB.
 * Returns the admin user record on success, or a NextResponse with the
 * appropriate error status on failure.
 */
export async function requireAdmin(req: Request): Promise<RequireAdminResult> {
  const response = NextResponse.next();

  const cognitoUser = await authenticatedUser({
    request: req as any,
    response: response as any,
  });

  if (!cognitoUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.USERS,
        Key: { userId: cognitoUser.userId },
      })
    );

    if (!result.Item) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        ),
      };
    }

    if (!result.Item.isAdmin) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden: admin access required" },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      userId: cognitoUser.userId,
      user: result.Item,
    };
  } catch (error) {
    console.error("[requireAdmin] Error verifying admin:", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 }
      ),
    };
  }
}
