"use client";

import { Amplify, type ResourcesConfig } from "aws-amplify";

// Validate required environment variables
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID"
  );
}

export const authConfig: ResourcesConfig["Auth"] = {
  Cognito: {
    userPoolId,
    userPoolClientId,
    loginWith: {
      email: true,
      username: true,
    },
    signUpVerificationMethod: "code",
    userAttributes: {
      email: {
        required: true,
      },
      name: {
        required: true,
      },
    },
  },
};

// Configure Amplify with error handling - only on client side
if (typeof window !== "undefined") {
  try {
    Amplify.configure(
      {
        Auth: authConfig,
      },
      { ssr: true }
    );
  } catch (error) {
    console.error("Failed to configure Amplify:", error);
  }
}

export default function ConfigureAmplifyClientSide() {
  return null;
}
