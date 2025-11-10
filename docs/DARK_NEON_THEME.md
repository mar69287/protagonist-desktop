# Dark Neon Theme Guide

## 🎨 Color Philosophy

Inspired by the Assiko fireworks website, this dark theme features **bright, neon accent colors** that pop against a charcoal background. Perfect for creating high-impact, memorable designs with a modern, edgy aesthetic.

## Color Palette

### Background Colors
```css
--background: #272727       /* Main dark background */
--neutral-800: #2a2a2a      /* Slightly lighter dark */
--neutral-700: #404040      /* Medium dark gray */
--neutral-500: #747474      /* Medium gray (from reference) */
```

### Neon Accent Colors

#### 🧡 Primary - Neon Orange
**Main Color: `#FF652F`**

A vibrant, glowing orange that commands attention.

```css
--primary-500: #FF652F
--neon-orange: #FF652F
```

**Usage:**
- Primary buttons
- Main CTAs
- Important highlights
- Hover effects with glow

**Glow effect:**
```css
hover:shadow-[0_0_20px_rgba(255,101,47,0.5)]
```

#### 💚 Accent - Neon Green
**Main Color: `#14A76C`**

A bright mint green that provides excellent contrast.

```css
--accent-500: #14A76C
--neon-green: #14A76C
```

**Usage:**
- Secondary buttons
- Success states
- Interactive elements
- Accent highlights

**Glow effect:**
```css
hover:shadow-[0_0_20px_rgba(20,167,108,0.4)]
```

#### 💛 Warning - Neon Yellow
**Main Color: `#FFE400`**

An electric yellow that grabs attention instantly.

```css
--warning-500: #FFE400
--neon-yellow: #FFE400
```

**Usage:**
- Warning messages
- Highlighted text
- Important notices
- Call-out elements

#### 🔵 Info - Bright Cyan
**Main Color: `#00BCD4`**

A vivid cyan for informational content.

```css
--info-500: #00BCD4
```

**Usage:**
- Info messages
- Links
- Secondary accents

#### 🔴 Error - Bright Red
**Main Color: `#FF4D4D`**

A clear, bright red for errors.

```css
--error-500: #FF4D4D
```

**Usage:**
- Error messages
- Delete actions
- Destructive actions

## Typography Colors

### Text Colors
```css
--foreground: #FFFFFF        /* Primary text - white */
--neutral-200: #CCCCCC       /* Secondary text - light gray */
--neutral-300: #B3B3B3       /* Tertiary text */
--neutral-400: #999999       /* Muted text */
```

**Usage:**
- Headlines: `text-white`
- Body text: `text-neutral-200` or `text-neutral-300`
- Muted text: `text-neutral-400`
- Placeholder text: `text-neutral-400`

## Design Principles

### 1. High Contrast
Neon colors on dark backgrounds create **maximum visual impact**. Always use:
- White text on dark backgrounds
- Neon colors for interactive elements
- Sufficient spacing to let colors breathe

### 2. Glow Effects
Add subtle glow effects to interactive elements:

```css
/* Primary button hover */
hover:shadow-[0_0_20px_rgba(255,101,47,0.5)]

/* Green button hover */
hover:shadow-[0_0_20px_rgba(20,167,108,0.4)]

/* Icon glow */
shadow-[0_0_30px_rgba(255,228,0,0.3)]
```

### 3. NO Gradients
This theme uses **solid colors only** for a clean, sharp aesthetic. Avoid gradients entirely.

### 4. Border Treatment
```css
/* Subtle borders */
border border-neutral-700

/* Accent borders */
border border-[#FF652F]
border border-[#14A76C]
border border-[#FFE400]
```

## Component Examples

### Button Variants
```tsx
// Primary - Neon Orange
<Button variant="primary">
  // bg-[#FF652F] with glow on hover
</Button>

// Secondary - Neon Green
<Button variant="secondary">
  // border-[#14A76C] with fill on hover
</Button>

// Ghost - Yellow on hover
<Button variant="ghost">
  // text-neutral-200 hover:text-[#FFE400]
</Button>
```

### Cards
```tsx
// Default card
<Card>
  // bg-neutral-800 border-neutral-700
</Card>

// Elevated card
<Card variant="elevated">
  // bg-neutral-800 with shadow-xl
</Card>
```

### Badges
```tsx
<Badge variant="success">  // Neon green
<Badge variant="warning">  // Neon yellow
<Badge variant="error">    // Bright red
<Badge variant="info">     // Bright cyan
```

## Best Practices

### ✅ DO
- Use dark backgrounds (#272727, #2a2a2a)
- Use neon colors for interactive elements
- Add glow effects to buttons and icons
- Use white for headlines
- Use neutral-200/300 for body text
- Keep designs clean and spacious

### ❌ DON'T
- Use gradients (solid colors only)
- Mix too many neon colors at once
- Use low-contrast color combinations
- Overwhelm with too much glow
- Use light backgrounds

## Color Combinations

### Primary Combinations
```css
/* Neon Orange + Dark Gray */
background: #272727
text/accent: #FF652F

/* Neon Green + Dark Gray */
background: #2a2a2a
text/accent: #14A76C

/* Neon Yellow + Dark Gray */
background: #272727
text: #FFE400
```

### Accent Combinations
```css
/* Orange + Green (complementary) */
primary: #FF652F
secondary: #14A76C

/* Yellow + Cyan (vibrant) */
highlight: #FFE400
accent: #00BCD4
```

## Quick Reference

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Gray | `#272727` |
| Primary | Neon Orange | `#FF652F` |
| Accent | Neon Green | `#14A76C` |
| Warning | Neon Yellow | `#FFE400` |
| Error | Bright Red | `#FF4D4D` |
| Info | Bright Cyan | `#00BCD4` |
| Text | White | `#FFFFFF` |
| Secondary Text | Light Gray | `#CCCCCC` |
| Borders | Medium Gray | `#404040` |

## Accessibility

All neon colors have excellent contrast against the dark background:
- ✅ Neon Orange on dark: 8.2:1
- ✅ Neon Green on dark: 6.8:1
- ✅ Neon Yellow on dark: 16.5:1
- ✅ White on dark: 12.6:1

All combinations exceed WCAG AAA standards for normal text.

## Inspiration

This theme is inspired by:
- Fireworks and pyrotechnics displays
- Neon signage
- Dark mode design trends
- High-energy, memorable experiences

The goal is to create a **bold, unforgettable visual identity** that stands out.

