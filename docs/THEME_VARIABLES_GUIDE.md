# Theme Variables Guide

## ✅ Fixed: Now Using Proper CSS Variable Syntax!

All components now use the **correct** CSS variable syntax with `var()` wrapper.

## Correct Syntax

### ✅ CORRECT
```tsx
className="text-[var(--neon-orange)]"
className="bg-[var(--neon-green)]"
className="border-[var(--neon-yellow)]"
```

### ❌ WRONG (doesn't work)
```tsx
className="text-[--neon-orange]"  // Missing var()!
```

## Available Theme Variables

### Neon Colors (Main Theme)
```tsx
className="text-[var(--neon-orange)]"   // Primary - #FF652F
className="text-[var(--neon-green)]"    // Secondary - #14A76C  
className="text-[var(--neon-yellow)]"   // Accent - #FFE400
```

### Semantic Colors
```tsx
className="text-[var(--primary-500)]"   // Primary color
className="text-[var(--primary-600)]"   // Primary hover
className="text-[var(--accent-500)]"    // Accent color
className="text-[var(--success-500)]"   // Success - #14A76C
className="text-[var(--warning-500)]"   // Warning - #FFE400
className="text-[var(--error-500)]"     // Error - #FF4D4D
className="text-[var(--info-500)]"      // Info - #00BCD4
```

### Backgrounds
```tsx
className="bg-[var(--background)]"      // Main dark (#272727)
className="bg-neutral-800"              // Section backgrounds
className="bg-neutral-700"              // Card backgrounds
```

## Usage Examples

### Buttons
```tsx
// Primary button - neon orange
className="bg-[var(--neon-orange)] hover:bg-[var(--primary-600)]"

// Secondary button - neon green
className="border-[var(--neon-green)] text-[var(--neon-green)]"

// Ghost button - neon yellow on hover
className="hover:text-[var(--neon-yellow)]"
```

### Text Colors
```tsx
// Neon orange text
className="text-[var(--neon-orange)]"

// Neon green text
className="text-[var(--neon-green)]"

// Error text
className="text-[var(--error-500)]"
```

### Opacity
```tsx
// Semi-transparent backgrounds
className="bg-[var(--neon-green)]/20"      // 20% opacity
className="bg-[var(--neon-yellow)]/10"     // 10% opacity
```

### Borders
```tsx
className="border-[var(--neon-orange)]"
className="border-[var(--neon-green)]"
```

## How to Change Theme

### Change ONE color everywhere
In `app/globals.css`:
```css
:root {
  --neon-orange: #YOUR_NEW_COLOR;  /* Updates everywhere! */
}
```

### All 3 main colors
```css
:root {
  --neon-orange: #ff652f;  /* Primary */
  --neon-green: #14a76c;   /* Secondary */
  --neon-yellow: #ffe400;  /* Accent */
}
```

## All Fixed Components

✅ Button - primary, secondary, ghost variants
✅ Badge - all semantic colors  
✅ Alert - success, error, warning, info
✅ Input - focus ring, error state
✅ Spinner - border color
✅ StatWave - icon and value colors
✅ FeatureBlob - (uses inline styles with var())
✅ Navbar - logo and link hover
✅ Footer - links and social icons
✅ HeroSection - badge icon, heading accent
✅ All page sections

## Common Pitfall

**Don't forget `var()` wrapper!**
- ❌ `text-[--neon-orange]` - won't work
- ✅ `text-[var(--neon-orange)]` - works!

The `var()` function is required for CSS variables in Tailwind's arbitrary value syntax.

## Benefits

✅ **One source of truth** - change colors in ONE place
✅ **Maintainable** - no hunting through files
✅ **Type-safe** - still get TypeScript support
✅ **Flexible** - easy to add new colors
✅ **Fast** - CSS-native, no JS overhead

Now your theme colors work everywhere! 🎨✨
