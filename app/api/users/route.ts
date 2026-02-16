// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";

// Force Node.js runtime for Netlify compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log(`🚀 [Users API] GET request received`);
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    console.log(`🔑 [Users API] userId from query params: ${userId}`);

    if (!userId) {
      console.error(`❌ [Users API] No userId provided`);
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get user from DynamoDB
    const command = new GetCommand({
      TableName: TableNames.USERS,
      Key: {
        userId: userId,
      },
    });

    const response = await dynamoDb.send(command);

    if (!response.Item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check payment history for successful payments to determine if this is first subscription
    console.log(`🔍 [Users API] Checking payment history for userId: ${userId}`);
    let isFirstSubscription = true;
    try {
      console.log(`📊 [Users API] Scanning payment history table: ${TableNames.PAYMENT_HISTORY}`);
      console.log(`📊 [Users API] Filter: userId = ${userId}, type = payment, status = succeeded`);
      
      const paymentHistoryScan = await dynamoDb.send(
        new ScanCommand({
          TableName: TableNames.PAYMENT_HISTORY,
          FilterExpression: "userId = :userId AND #type = :type AND #status = :status",
          ExpressionAttributeNames: {
            "#type": "type",
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":type": "payment",
            ":status": "succeeded",
          },
        })
      );

      const successfulPayments = paymentHistoryScan.Items || [];
      console.log(`✅ [Users API] Payment history scan completed. Found ${successfulPayments.length} successful payment(s)`);
      
      // Log each payment found
      if (successfulPayments.length > 0) {
        console.log(`📋 [Users API] Successful payments found:`);
        successfulPayments.forEach((payment, index) => {
          console.log(`   Payment ${index + 1}:`, {
            paymentId: payment.paymentId,
            userId: payment.userId,
            subscriptionId: payment.subscriptionId,
            type: payment.type,
            status: payment.status,
            amount: payment.amount,
            createdAt: payment.createdAt,
          });
        });
        console.log(`❌ [Users API] User has already had a subscription - isFirstSubscription = false`);
      } else {
        console.log(`✅ [Users API] No successful payments found - this is their first subscription - isFirstSubscription = true`);
      }
      
      // If there are any successful payments, it's not their first subscription
      isFirstSubscription = successfulPayments.length === 0;
      console.log(`🎯 [Users API] Final isFirstSubscription value: ${isFirstSubscription}`);
    } catch (paymentError) {
      console.error("❌ [Users API] Error checking payment history:", paymentError);
      console.error("❌ [Users API] Error details:", {
        message: paymentError instanceof Error ? paymentError.message : String(paymentError),
        stack: paymentError instanceof Error ? paymentError.stack : undefined,
      });
      // If we can't check payment history, default to first subscription to be safe
      isFirstSubscription = true;
      console.log(`⚠️ [Users API] Defaulting to isFirstSubscription = true due to error`);
    }

    console.log(`📤 [Users API] Returning response with isFirstSubscription: ${isFirstSubscription}`);
    
    return NextResponse.json({
      user: response.Item,
      isFirstSubscription,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
