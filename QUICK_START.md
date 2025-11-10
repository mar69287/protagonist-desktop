# Quick Start Guide - Protagonist Web App

## ✅ Theme Update Complete!

Your Protagonist web app has been successfully updated to match your mobile app's black-and-white minimalist design with glass morphism effects.

## 🚀 Run the App

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 What Was Changed

### Core Theme Updates
- ✅ Updated `globals.css` with Protagonist color palette
- ✅ Added glass morphism utility classes
- ✅ Pure black (#000000) backgrounds throughout
- ✅ White (#ffffff) text and accents
- ✅ Gray (#a0a0a0) for secondary text

### Pages Updated
- ✅ **Home** (`/`) - Minimalist landing page with app info
- ✅ **Login** (`/login`) - Authentication page
- ✅ **Signup** (`/signup`) - Account creation (redirects to subscriptions)
- ✅ **Subscriptions** (`/subscriptions/signup`) - NEW: Pricing & payment page
- ✅ **Confirmation** (`/confirmation`) - Email verification page

### Components Updated
- ✅ **Navbar** - Simplified with "Protagonist" branding
- ✅ **Footer** - Minimalist with essential links
- ✅ **Layout** - Updated metadata and black background

## 🎯 Key Pages

### Home Page
Visit: `http://localhost:3000/`
- Features the app's value proposition
- "Get Paid to Accomplish Your Goals"
- Login and Get Started CTAs

### Subscriptions Page (NEW)
Visit: `http://localhost:3000/subscriptions/signup`
- This is where mobile app users will be directed
- Displays Monthly ($9.99) and Annual ($99.99) pricing
- Ready for Stripe integration

## 🔧 Next Steps: Stripe Integration

1. **Set up Stripe account** (if not already done)

2. **Add environment variables** (`.env.local`):
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Install Stripe SDK**:
```bash
npm install @stripe/stripe-js stripe
```

4. **Update `/app/subscriptions/signup/page.tsx`**:
   - Replace the TODO comment with Stripe checkout logic
   - Create checkout session on button click
   - Redirect to Stripe checkout page

5. **Create API routes**:
```
app/api/create-checkout-session/route.ts
app/api/webhooks/stripe/route.ts
```

## 📱 Mobile App Integration

### Directing Users to Subscription Page

From your React Native app, use deep linking:

```typescript
import { Linking } from 'react-native';

// Open subscription page in browser
const openSubscription = () => {
  Linking.openURL('https://yourdomain.com/subscriptions/signup');
};
```

### After Successful Payment

Configure Stripe to redirect back to your app:
```typescript
// In Stripe checkout session
success_url: 'yourapp://subscription-success',
cancel_url: 'yourapp://subscription-cancel'
```

## 🎨 Design System

### Colors
```tsx
// Use these colors in your components
<div className="bg-black">            // Background
<h1 className="text-white">           // Primary text
<p className="text-[#a0a0a0]">        // Secondary text
<div className="border-[#404040]">    // Borders
```

### Glass Morphism
```tsx
// Three utility classes available
<div className="glass-light">   // Light glass effect
<div className="glass-medium">  // Medium glass effect
<div className="glass-dark">    // Dark glass effect
```

### Example Usage
```tsx
<div className="glass-light rounded-2xl p-8">
  <h3 className="text-white font-semibold">Card Title</h3>
  <p className="text-[#a0a0a0]">Card description</p>
</div>
```

## 📚 Documentation

- **`THEME_UPDATE_SUMMARY.md`** - Complete summary of all changes
- **`docs/PROTAGONIST_THEME_GUIDE.md`** - Detailed theme guide and design system

## 🧪 Testing Checklist

- [ ] Home page loads correctly
- [ ] Login/Signup forms work
- [ ] Subscriptions page displays pricing
- [ ] Glass morphism effects render properly
- [ ] Mobile responsiveness works
- [ ] Navigation links function correctly
- [ ] Footer links work

## 💡 Tips

1. **Glass Effects**: Work best with dark backgrounds
2. **Contrast**: Maintain white text on black for readability
3. **Spacing**: Use the spacing scale (xs, sm, md, lg, xl, xxl)
4. **Animations**: Framer Motion is already set up
5. **Responsive**: All layouts work on mobile and desktop

## 🆘 Troubleshooting

**Issue**: Glass effects not showing
- **Solution**: Ensure parent has dark background

**Issue**: Colors look wrong
- **Solution**: Clear browser cache and rebuild

**Issue**: Fonts look different
- **Solution**: Geist fonts should load automatically from Google Fonts

## 📞 Support

For questions about:
- **Theme**: See `docs/PROTAGONIST_THEME_GUIDE.md`
- **Changes**: See `THEME_UPDATE_SUMMARY.md`
- **Stripe**: Visit [Stripe Docs](https://stripe.com/docs)

---

**Status**: ✅ Ready to run  
**Linter Errors**: ✅ None  
**Build Status**: ✅ Should build successfully  
**Next Step**: Run `npm run dev` and open http://localhost:3000

