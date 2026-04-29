// app/api/admin/challenges/[challengeId]/route.ts

import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { requireAdmin } from "@/services/aws/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROOF_METHOD_LENGTH = 4000;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { challengeId } = await params;
  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required" },
      { status: 400 }
    );
  }

  let body: { proofMethod?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const proofMethodRaw =
    typeof body.proofMethod === "string" ? body.proofMethod : undefined;
  const expectedUserId =
    typeof body.userId === "string" ? body.userId.trim() : "";

  if (proofMethodRaw === undefined) {
    return NextResponse.json(
      { error: "proofMethod is required" },
      { status: 400 }
    );
  }
  if (!expectedUserId) {
    return NextResponse.json(
      { error: "userId is required to verify challenge ownership" },
      { status: 400 }
    );
  }

  const proofMethod = proofMethodRaw.trim();
  if (proofMethod.length > MAX_PROOF_METHOD_LENGTH) {
    return NextResponse.json(
      { error: `proofMethod must be at most ${MAX_PROOF_METHOD_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    const existing = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.CHALLENGES,
        Key: { challengeId },
      })
    );

    if (!existing.Item) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (existing.Item.userId !== expectedUserId) {
      return NextResponse.json(
        { error: "Challenge does not belong to this user" },
        { status: 403 }
      );
    }

    const updatedAt = new Date().toISOString();

    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.CHALLENGES,
        Key: { challengeId },
        UpdateExpression: "SET proofMethod = :pm, updatedAt = :ua",
        ExpressionAttributeValues: {
          ":pm": proofMethod,
          ":ua": updatedAt,
        },
      })
    );

    return NextResponse.json({
      proofMethod,
      updatedAt,
    });
  } catch (error: any) {
    console.error("[Admin Challenge PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update challenge" },
      { status: 500 }
    );
  }
}
