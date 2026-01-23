"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { signIn, signOut, signUp, getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();

    // Listen for auth events
    const hubListener = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          checkAuth();
          break;
        case "signedOut":
          setUser(null);
          break;
      }
    });

    return () => hubListener();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        const currentUser = await getCurrentUser();
        const userAttributes = currentUser.signInDetails?.loginId || "";
        
        setUser({
          id: currentUser.userId,
          email: userAttributes,
          name: currentUser.username,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log("Not authenticated:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signIn({ username: email, password });
      await checkAuth();
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
      // After signup, user needs to verify email before signing in
      // You may want to redirect to a verification page
    } catch (error: any) {
      console.error("Signup error:", error);
      throw new Error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

