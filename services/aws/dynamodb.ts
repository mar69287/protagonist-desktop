// services/aws/dynamodb.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Create a single instance of the DynamoDB client
const client = new DynamoDBClient({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT!,
  },
});

export const dynamoDb = DynamoDBDocumentClient.from(client);
export const dynamoDbClient = client;

// DynamoDB table names
export const TableNames = {
  USERS: "users",
  PAYMENT_HISTORY: "paymentHistory",
  ONBOARDING_CHAT: "onboarding-chat",
  CHALLENGES: "challenges",
} as const;
