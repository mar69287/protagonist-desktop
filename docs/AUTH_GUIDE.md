# Authentication System Guide

## Overview

A complete authentication system with login, signup, and confirmation pages, using React Context for state management.

## File Structure

```
app/
├── (auth)/
│   ├── layout.tsx          # Auth pages layout (no navbar/footer)
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── signup/
│   │   └── page.tsx        # Signup page
│   └── confirmation/
│       └── page.tsx        # Email confirmation page
contexts/
└── AuthContext.tsx         # Auth state management
```

## Features

### ✅ Auth Context (`contexts/AuthContext.tsx`)
- **User state management**
- **Login/Signup/Logout functions**
- **Loading states**
- **LocalStorage persistence**
- **TypeScript types**

### ✅ Login Page (`/login`)
- Email & password inputs
- Remember me checkbox
- Forgot password link
- Social auth buttons (Google, GitHub)
- Link to signup
- Form validation
- Error handling

### ✅ Signup Page (`/signup`)
- Full name, email, password inputs
- Password confirmation
- Terms & conditions checkbox
- Social auth buttons
- Link to login
- Password strength validation
- Error handling

### ✅ Confirmation Page (`/confirmation`)
- Success animation
- Email verification notice
- Step-by-step guide
- Resend email button
- Dashboard link
- Support link

## Usage

### 1. Using the Auth Context

```tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function MyComponent() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={() => login("email", "pass")}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Protecting Routes

Create a protected route wrapper:

```tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? <>{children}</> : null;
}
```

### 3. Adding to Navbar

Update `Navbar.tsx` to show user state:

```tsx
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav>
      {isAuthenticated ? (
        <>
          <span>Welcome, {user?.name}</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  );
}
```

## Auth Context API

### State
```typescript
user: User | null          // Current user object
loading: boolean           // Loading state
isAuthenticated: boolean   // Auth status
```

### Methods
```typescript
login(email: string, password: string): Promise<void>
signup(email: string, password: string, name: string): Promise<void>
logout(): void
```

### User Object
```typescript
interface User {
  id: string;
  email: string;
  name: string;
}
```

## Connecting to Real API

Replace the mock authentication in `AuthContext.tsx`:

```typescript
const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    // Replace this:
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // With your API call:
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) throw new Error("Login failed");
    
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
  } catch (error) {
    throw new Error("Login failed");
  } finally {
    setLoading(false);
  }
};
```

## Theme Integration

All auth pages use the dark neon theme:
- `--color-primary` - Primary buttons and links
- `--color-secondary` - Secondary links
- `--color-success` - Success states
- `--color-error` - Error messages
- `--color-info` - Info messages

## Styling Features

- ✅ Dark theme with neon accents
- ✅ Smooth animations with Framer Motion
- ✅ Responsive design
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Success animations

## Route Groups

The `(auth)` folder is a **route group** in Next.js 15:
- **URL**: Pages are at `/login`, `/signup`, `/confirmation`
- **Layout**: Custom layout without navbar/footer
- **Organization**: Keeps auth pages grouped together

## Next Steps

1. **Connect to your backend API**
2. **Add email verification logic**
3. **Implement forgot password flow**
4. **Add OAuth providers (Google, GitHub)**
5. **Create protected route wrapper**
6. **Add user profile page**
7. **Implement JWT token refresh**

## Security Notes

⚠️ **Current Implementation:**
- Uses localStorage (not secure for production)
- Mock authentication (no real backend)
- No JWT token handling
- No CSRF protection

✅ **For Production:**
- Use httpOnly cookies for tokens
- Implement proper JWT refresh logic
- Add CSRF protection
- Use secure API endpoints
- Implement rate limiting
- Add 2FA support
- Hash passwords properly

