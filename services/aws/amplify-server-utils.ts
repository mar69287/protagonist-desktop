import { NextServer, createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth/server";
import type { ResourcesConfig } from "aws-amplify";

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

export const { runWithAmplifyServerContext } = createServerRunner({
  config: {
    Auth: authConfig,
  },
});

export async function authenticatedUser(context: NextServer.Context) {
  return await runWithAmplifyServerContext({
    nextServerContext: context,
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        if (!session.tokens) {
          return null;
        }

        const currentUser = await getCurrentUser(contextSpec);
        const user = {
          ...currentUser,
          isAdmin: false,
        };

        // Check for admin groups in the access token
        const groups = session.tokens.accessToken.payload["cognito:groups"] as
          | string[]
          | undefined;
        user.isAdmin = Boolean(groups && groups.includes("Admins"));

        return user;
      } catch (error) {
        console.error("Authentication error:", error);
        return null;
      }
    },
  });
}
