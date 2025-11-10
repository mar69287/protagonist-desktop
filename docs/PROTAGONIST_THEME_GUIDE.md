# Protagonist Theme Guide

This document outlines the new black-and-white minimalist theme applied to the Protagonist web application.

## Overview

The Protagonist web application has been redesigned to match the mobile app's aesthetic: a sleek, minimalist black-and-white design with glass morphism effects. The design emphasizes high contrast, clean lines, and a premium feel.

## Color Palette

### Base Colors
- **Black**: `#000000` - Primary background color
- **Dark Gray**: `#1a1a1a` - Secondary backgrounds
- **Medium Gray**: `#2a2a2a` - Tertiary backgrounds
- **Light Gray**: `#3a3a3a` - Subtle backgrounds
- **Border Gray**: `#404040` - Border color
- **Text Gray**: `#a0a0a0` - Secondary text color
- **White**: `#ffffff` - Primary text and accent color
- **Off White**: `#f5f5f5` - Hover states

### Glass Morphism Colors
- **Glass Light**: `rgba(255, 255, 255, 0.1)` - Light glass effect
- **Glass Medium**: `rgba(255, 255, 255, 0.05)` - Medium glass effect
- **Glass Dark**: `rgba(0, 0, 0, 0.3)` - Dark glass effect
- **Glass Border**: `rgba(255, 255, 255, 0.2)` - Glass borders

### Accent Colors
- **Accent**: `#ffffff` - White for emphasis
- **Accent Dim**: `rgba(255, 255, 255, 0.7)` - Dimmed white

## Design Principles

1. **Minimalist & Modern**: Clean, black-and-white aesthetic with minimal UI elements
2. **High Contrast**: Pure black backgrounds (#000000) with white text (#ffffff) for maximum readability
3. **Glass Morphism**: Subtle glass effects using semi-transparent white layers with backdrop blur
4. **Premium Feel**: Generous spacing, smooth animations, and subtle interactions
5. **Dark-First**: Designed exclusively for dark mode with no light mode variant

## Spacing Scale

```css
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

## Border Radius Scale

```css
sm: 8px
md: 12px
lg: 16px
xl: 24px
round: 999px
```

## Typography

### Font Sizes
- 12px, 14px, 16px, 20px, 24px, 32px, 48px

### Font Weights
- 400 (regular)
- 500 (medium)
- 600 (semibold)
- 700 (bold)

## Glass Morphism Utility Classes

The theme includes three glass morphism utility classes:

```css
.glass-light {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-medium {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Application Structure

### Pages Updated

1. **Home Page** (`/`)
   - Minimalist design with app information
   - Features showcase with glass morphism cards
   - Call-to-action buttons for login and signup

2. **Subscriptions Signup** (`/subscriptions/signup`)
   - NEW: Dedicated subscription/payment page
   - Stripe integration ready
   - Displays pricing plans with features
   - Glass morphism card design

3. **Login Page** (`/login`)
   - Clean authentication form
   - Glass morphism background
   - Links to subscription signup

4. **Signup Page** (`/signup`)
   - Account creation form
   - Glass morphism styling
   - Removed OAuth buttons (simplified)

5. **Confirmation Page** (`/confirmation`)
   - Email verification instructions
   - Glass morphism cards
   - Success state with white accent

### Components Updated

1. **Navbar**
   - Simplified navigation
   - Links: Home, Login, Sign Up
   - Glass morphism background with backdrop blur
   - Brand name changed to "Protagonist"

2. **Footer**
   - Minimalist footer design
   - Essential links only (Home, Pricing, Privacy, Terms)
   - Contact information
   - Glass morphism background

## Usage Examples

### Using Glass Morphism

```tsx
// Light glass effect for cards
<div className="glass-light rounded-2xl p-8">
  <h3 className="text-white">Card Title</h3>
  <p className="text-[#a0a0a0]">Card description</p>
</div>

// Medium glass effect for navbar/header
<nav className="glass-medium border-b border-[#404040]">
  {/* Navigation content */}
</nav>
```

### Color Usage

```tsx
// Primary text (white)
<h1 className="text-white">Heading</h1>

// Secondary text (gray)
<p className="text-[#a0a0a0]">Description text</p>

// Background (black)
<div className="bg-black">Content</div>

// Hover states
<button className="bg-white hover:bg-[#f5f5f5]">
  Button
</button>
```

## Mobile App Integration

The web application is designed to complement the Protagonist mobile app (React Native + Expo):

- **Purpose**: Handles user subscriptions via Stripe
- **Flow**: Mobile app redirects to `/subscriptions/signup` for payment processing
- **Consistent Branding**: Same black-and-white aesthetic as the mobile app
- **Glass Morphism**: Matches the mobile app's UI style

## Next Steps

1. **Stripe Integration**: Implement Stripe checkout in `/subscriptions/signup`
2. **Authentication**: Connect AWS Amplify/Cognito for user authentication
3. **Payment Flow**: Set up webhook handlers for subscription events
4. **Protected Routes**: Add authentication guards for subscriber-only pages

## Notes

- All pages use pure black (#000000) backgrounds for consistency
- Glass morphism effects use white with varying opacity
- Animations use Framer Motion for smooth transitions
- The design is optimized for desktop and mobile viewports
- No light mode - dark theme only for brand consistency

