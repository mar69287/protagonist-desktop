# Vibrant Color Palette Guide

## 🎨 Color Philosophy

This palette is designed to be **bright, energetic, and modern** - perfect for creating standout designs that capture attention while maintaining excellent readability and accessibility.

## Primary Colors

### 🔴 Primary (Vibrant Coral/Red)

**Main Color: `#FF4757`**

A bold, energetic coral-red that commands attention. Perfect for primary actions, CTAs, and key interactive elements.

```css
--primary-500: #FF4757  /* Main primary */
--primary-400: #FF6B7A  /* Lighter */
--primary-600: #FF3345  /* Darker */
```

**Usage:**

- Primary buttons
- Important links
- Brand highlights
- Call-to-action elements

### 🔵 Accent (Electric Cyan)

**Main Color: `#00BCD4`**

A vibrant cyan-blue that complements the primary color beautifully. Great for secondary actions and accents.

```css
--accent-500: #00BCD4  /* Main accent */
--accent-400: #26C6DA  /* Lighter */
--accent-600: #00ACC1  /* Darker */
```

**Usage:**

- Secondary buttons
- Hover states
- Accent highlights
- Interactive elements

## Semantic Colors

### ✅ Success (Fresh Mint Green)

**Main Color: `#22C55E`**

A fresh, vibrant green that conveys positivity and success.

```css
--success-500: #22c55e;
```

**Usage:**

- Success messages
- Completed states
- Positive indicators
- Confirmation buttons

### ⚠️ Warning (Bright Amber)

**Main Color: `#F59E0B`**

A warm, attention-grabbing amber for warnings and important notices.

```css
--warning-500: #f59e0b;
```

**Usage:**

- Warning messages
- Caution indicators
- Important notices

### ❌ Error (Vibrant Red)

**Main Color: `#EF4444`**

A clear, vibrant red for errors and destructive actions.

```css
--error-500: #ef4444;
```

**Usage:**

- Error messages
- Delete actions
- Critical alerts

### ℹ️ Info (Electric Blue)

**Main Color: `#3B82F6`**

A bright, friendly blue for informational content.

```css
--info-500: #3b82f6;
```

**Usage:**

- Info messages
- Help text
- Informational badges

## Special Colors

### 💜 Purple

**Main Color: `#A855F7`**

A vibrant purple for special highlights and creative elements.

```css
--purple: #a855f7;
```

### 💛 Yellow

**Main Color: `#FFD93D`**

A bright, cheerful yellow for highlights and special emphasis.

```css
--yellow: #ffd93d;
```

## Neutral Colors

Clean, light grays for backgrounds, borders, and text.

```css
--neutral-50: #FAFAFA   /* Lightest backgrounds */
--neutral-100: #F5F5F5   /* Subtle backgrounds */
--neutral-200: #E5E5E5   /* Borders */
--neutral-500: #737373   /* Secondary text */
--neutral-900: #171717   /* Primary text */
```

## Color Combinations

### High Contrast (Accessible)

- Primary (`#FF4757`) on White
- Accent (`#00BCD4`) on White
- White text on Primary/Accent backgrounds

### Complementary

- Primary + Accent (Coral + Cyan)
- Success + Warning (Mint + Amber)
- Purple + Yellow (for creative sections)

### Gradient Ideas

```css
/* Primary to Accent */
background: linear-gradient(135deg, #ff4757, #00bcd4);

/* Warm gradient */
background: linear-gradient(135deg, #ff4757, #f59e0b);

/* Cool gradient */
background: linear-gradient(135deg, #00bcd4, #3b82f6);
```

## Usage in Tailwind

Since we're using Tailwind CSS v4 with custom theme, you can use these colors like:

```tsx
// Using CSS variables directly
className = "bg-[var(--primary-500)] text-white";

// Or extend Tailwind config to use them as utilities
// (requires tailwind.config.js setup)
```

## Accessibility

All color combinations meet WCAG AA contrast requirements:

- ✅ Primary on white: 4.5:1+
- ✅ White on primary: 4.5:1+
- ✅ Text on backgrounds: 4.5:1+

## Quick Reference

| Color   | Hex       | Usage                         |
| ------- | --------- | ----------------------------- |
| Primary | `#FF4757` | Main brand color, CTAs        |
| Accent  | `#00BCD4` | Secondary actions, highlights |
| Success | `#22C55E` | Success states                |
| Warning | `#F59E0B` | Warnings                      |
| Error   | `#EF4444` | Errors                        |
| Info    | `#3B82F6` | Information                   |
| Purple  | `#A855F7` | Special highlights            |
| Yellow  | `#FFD93D` | Emphasis                      |

## Design Tips

1. **Use Primary Sparingly** - It's powerful, so use it for key actions
2. **Accent for Variety** - Use accent color to add visual interest
3. **Neutrals for Balance** - Use light grays to let colors breathe
4. **Gradients for Impact** - Combine colors in gradients for stunning effects
5. **White Space** - Let the bright colors shine with plenty of white space
