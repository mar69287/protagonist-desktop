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
    const searchParams = request.nextUrl.searchParams;
    const priceIds = searchParams.get("priceIds");

    if (!priceIds) {
      return NextResponse.json(
        { error: "priceIds query parameter is required" },
        { status: 400 }
      );
    }

    // Parse comma-separated price IDs
    const priceIdArray = priceIds.split(",").map((id) => id.trim());

    console.log(`🔍 [Prices API] Fetching prices for: ${priceIdArray.join(", ")}`);

    // Fetch all prices from Stripe with expanded product
    const prices = await Promise.all(
      priceIdArray.map(async (priceId) => {
        try {
          const price = await stripe.prices.retrieve(priceId, {
            expand: ['product'],
          });
          
          // Get product name - product can be a string ID or an expanded Product object
          let productName = '';
          if (typeof price.product === 'string') {
            // If product is just an ID, fetch it
            try {
              const product = await stripe.products.retrieve(price.product);
              productName = product.name || '';
            } catch (err) {
              console.warn(`⚠️ [Prices API] Could not fetch product ${price.product}:`, err);
            }
          } else if (price.product && typeof price.product === 'object') {
            // Product is already expanded
            productName = (price.product as any).name || '';
          }
          
          console.log(`✅ [Prices API] Retrieved price ${priceId}:`, {
            amount: price.unit_amount,
            currency: price.currency,
            productName: productName,
            metadata: price.metadata,
          });

          return {
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
          };
        } catch (error: any) {
          // Check if it's a "not found" error
          if (error?.code === 'resource_missing' || error?.statusCode === 404) {
            console.warn(`⚠️ [Prices API] Price ${priceId} not found in Stripe. Make sure:`);
            console.warn(`   1. The price ID is correct`);
            console.warn(`   2. You're using the correct Stripe mode (test vs live)`);
            console.warn(`   3. The price exists in your Stripe account`);
          } else {
            console.error(`❌ [Prices API] Error fetching price ${priceId}:`, error);
          }
          return null;
        }
      })
    );

    // Filter out null values (failed fetches)
    const validPrices = prices.filter((price) => price !== null);

    if (validPrices.length === 0) {
      console.warn(`⚠️ [Prices API] No valid prices found. Check your price IDs and Stripe configuration.`);
    } else {
      console.log(`✅ [Prices API] Returning ${validPrices.length} price(s) out of ${priceIdArray.length} requested`);
    }

    return NextResponse.json({ 
      prices: validPrices,
      requested: priceIdArray.length,
      found: validPrices.length,
    });
  } catch (error) {
    console.error("❌ [Prices API] Error fetching prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
