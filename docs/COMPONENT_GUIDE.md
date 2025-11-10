# Component Architecture Guide

## Component Organization Strategy

### Folder Structure

```
components/
├── ui/              # Reusable UI components (atoms & molecules)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── ...
├── sections/        # Page sections (organisms)
│   ├── HeroSection.tsx
│   └── ...
├── layout/          # Layout components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ...
└── features/        # Feature-specific components (optional)
    └── ...
```

## When to Make Components Reusable

### ✅ Make it Reusable When:

1. **Used in 2+ places** - If you're copying code, make it a component
2. **Has clear props interface** - Can be configured for different use cases
3. **Single responsibility** - Does one thing well
4. **Visual consistency** - Needs to look the same across the app
5. **Common patterns** - Button, Card, Input, Badge, etc.

### ❌ Don't Make it Reusable When:

1. **One-time use** - Only appears once
2. **Too specific** - Tightly coupled to one feature
3. **Over-abstracted** - More complex than the original code
4. **Premature optimization** - Wait until you actually need it twice

## Essential Reusable Components

### 1. **Primitive Components** (Atoms)

These are the building blocks:

- **Button** ✅ (you have this)
- **Input** ✅ (just added)
- **Badge** ✅ (just added)
- **Heading** ✅ (just added)
- **Text/Label** - For consistent typography
- **Icon** - Wrapper for icons with consistent sizing
- **Avatar** - User profile images
- **Spinner/Loader** - Loading states

### 2. **Composite Components** (Molecules)

Combine primitives:

- **Card** ✅ (just added)
- **FormField** - Input + Label + Error message
- **ButtonGroup** - Multiple buttons together
- **Alert/Toast** - Notifications
- **Modal/Dialog** - Overlays
- **Dropdown/Select** - Selection components
- **Tabs** - Tab navigation
- **Accordion** - Collapsible content

### 3. **Layout Components** (Organisms)

- **Container** ✅ (just added)
- **Grid** - Responsive grid layouts
- **Stack** - Vertical/horizontal stacks
- **Section** - Page sections with consistent spacing

### 4. **Feature Components** (Optional)

- **ProductCard** - If you have products
- **BlogCard** - If you have a blog
- **TestimonialCard** - If you have testimonials

## Component Design Principles

### 1. **Props Interface**

```tsx
// ✅ Good: Clear, typed props
interface ButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  onClick?: () => void;
}

// ❌ Bad: Too many props, unclear purpose
interface ButtonProps {
  color?: string;
  bgColor?: string;
  fontSize?: number;
  // ... 20 more props
}
```

### 2. **Composition Over Configuration**

```tsx
// ✅ Good: Composable
<Card>
  <Card.Header>
    <Heading>Title</Heading>
  </Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// ❌ Bad: Too many boolean props
<Card hasHeader hasFooter hasPadding hasShadow />
```

### 3. **Default Props**

```tsx
// ✅ Good: Sensible defaults
function Button({ variant = "primary", size = "md", ... }) {
  // ...
}

// ❌ Bad: Required props for everything
function Button({ variant, size, className, ... }) {
  // ...
}
```

### 4. **Forward Refs**

```tsx
// ✅ Good: Works with refs
const Input = forwardRef<HTMLInputElement, InputProps>(({ ...props }, ref) => {
  return <input ref={ref} {...props} />;
});
```

### 5. **className Prop**

```tsx
// ✅ Good: Always allow className override
function Card({ className = "", ... }) {
  return <div className={`base-styles ${className}`} />;
}
```

## Common Patterns

### Variant Pattern

```tsx
const variantStyles = {
  primary: "bg-blue-500 text-white",
  secondary: "bg-gray-200 text-gray-800",
};

className={`base ${variantStyles[variant]}`}
```

### Size Pattern

```tsx
const sizeStyles = {
  sm: "px-2 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};
```

### Compound Components

```tsx
// Card.tsx
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>;
```

## Real-World Examples

### Example 1: Product Card

```tsx
// ✅ Reusable
<ProductCard
  image="/product.jpg"
  title="Product Name"
  price={29.99}
  onAddToCart={() => {}}
/>

// ❌ Too specific
<HomePageProductCard />
<CategoryPageProductCard />
<SearchPageProductCard />
```

### Example 2: Form Input

```tsx
// ✅ Reusable
<Input
  label="Email"
  type="email"
  error={errors.email}
  helperText="We'll never share your email"
/>

// ❌ Copy-paste everywhere
<input className="..." />
<label className="...">Email</label>
{errors.email && <span>...</span>}
```

## Testing Reusability

Ask yourself:

1. **Can I use this in a different context?** (e.g., Card in dashboard, blog, products)
2. **Does it need different data?** (If yes, make it accept props)
3. **Will styling change?** (If yes, add variant/size props)
4. **Is it self-contained?** (Doesn't depend on parent state unnecessarily)

## Migration Strategy

When you find duplicate code:

1. **Extract** - Move to `components/ui/`
2. **Parameterize** - Add props for differences
3. **Replace** - Update all usages
4. **Test** - Make sure it works everywhere

## Your Current Setup

✅ **Good practices you're already using:**

- Separating `ui/` from `sections/`
- Using TypeScript interfaces
- Variant and size props
- Motion animations

🎯 **Components you might want to add:**

- **Card** ✅ (added)
- **Input** ✅ (added)
- **Badge** ✅ (added)
- **Container** ✅ (added)
- **Heading** ✅ (added)
- **Modal/Dialog** - For overlays
- **Toast/Alert** - For notifications
- **Skeleton** - Loading states
- **Avatar** - User images
- **Separator/Divider** - Visual breaks

## Resources

- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Shadcn/ui](https://ui.shadcn.com/) - Great examples of reusable components
- [Radix UI](https://www.radix-ui.com/) - Headless component primitives
- [Chakra UI](https://chakra-ui.com/) - Component library examples
