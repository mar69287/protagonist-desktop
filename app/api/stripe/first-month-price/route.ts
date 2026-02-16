import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Force Node.js runtime for Netlify compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function GET(request: NextRequest) {
  try {
    const firstMonthPriceId = process.env.STRIPE_PRICE_ID;
    
    if (!firstMonthPriceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID is not configured" },
        { status: 400 }
      );
    }

    console.log(`🔍 [First Month Price API] Fetching price: ${firstMonthPriceId}`);

    try {
      const price = await stripe.prices.retrieve(firstMonthPriceId, {
        expand: ['product'],
      });
      
      // Get product name
      let productName = '';
      if (typeof price.product === 'string') {
        try {
          const product = await stripe.products.retrieve(price.product);
          productName = product.name || '';
        } catch (err) {
          console.warn(`⚠️ [First Month Price API] Could not fetch product ${price.product}:`, err);
        }
      } else if (price.product && typeof price.product === 'object') {
        productName = (price.product as any).name || '';
      }
      
      console.log(`✅ [First Month Price API] Retrieved price:`, {
        amount: price.unit_amount,
        currency: price.currency,
        productName: productName,
        metadata: price.metadata,
      });

      return NextResponse.json({
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring
          ? {
              interval: price.recurring.interval,
              intervalCount: price.recurring.interval_count,
            }
          : null,
        metadata: price.metadata || {},
        product: price.product,
        productName: productName,
      });
    } catch (error: any) {
      if (error?.code === 'resource_missing' || error?.statusCode === 404) {
        console.warn(`⚠️ [First Month Price API] Price ${firstMonthPriceId} not found in Stripe`);
        return NextResponse.json(
          { error: `Price ${firstMonthPriceId} not found` },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ [First Month Price API] Error fetching price:", error);
    return NextResponse.json(
      { error: "Failed to fetch first month price" },
      { status: 500 }
    );
  }
}
