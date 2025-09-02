/**
 * Stripe Products and Prices Management
 */

import { stripe } from './config';
import { STRIPE_CONFIG } from '@/constants';
import { stripeConfig } from '@/config';
import { createClient } from '@supabase/supabase-js';
import type { Book } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StripeProduct {
  id: string;
  book_id: string;
  stripe_product_id: string;
  digital_price_id?: string;
  physical_price_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert Myanmar Kyat to USD cents (Stripe's smallest unit for USD)
 * Uses current exchange rate from config
 */
export function mmkToUsdCents(mmk: number): number {
  const usd = mmk * stripeConfig.mmkToUsdRate;
  const cents = Math.round(usd * 100);
  return Math.max(cents, STRIPE_CONFIG.MIN_AMOUNT_CENTS);
}

/**
 * Convert USD cents back to MMK for display
 */
export function usdCentsToMmk(cents: number): number {
  const usd = cents / 100;
  return Math.round(usd / stripeConfig.mmkToUsdRate);
}

/**
 * Sync a book to Stripe as a product with prices for both digital and physical
 */
export async function syncBookToStripe(book: Book): Promise<StripeProduct> {
  try {
    // Check if product already exists
    const { data: existingProduct } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('book_id', book.id)
      .single();

    if (existingProduct) {
      return existingProduct as StripeProduct;
    }

    // Create Stripe product
    let stripeProduct;
    try {
      stripeProduct = await stripe.products.create({
        id: `book_${book.id}`,
        name: book.name,
        description: book.description || undefined,
        images: book.image_url ? [book.image_url] : undefined,
        metadata: {
          book_id: book.id,
          author: book.author,
          category: book.category,
          edition: book.edition || '1st',
        },
        tax_code: 'txcd_99999999', // Digital goods tax code
      });
    } catch (stripeError: unknown) {
      // If product already exists in Stripe, retrieve it
      if (stripeError instanceof Error && 'code' in stripeError && (stripeError as { code: string }).code === 'resource_already_exists') {
        stripeProduct = await stripe.products.retrieve(`book_${book.id}`);
      } else {
        throw stripeError;
      }
    }

    // Create digital price
    let digitalPrice;
    try {
      digitalPrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: stripeConfig.currency,
        unit_amount: mmkToUsdCents(book.price),
        metadata: {
          book_id: book.id,
          delivery_type: 'digital',
          original_price_mmk: book.price.toString(),
        },
      });
    } catch (priceError: unknown) {
      // Try to find existing digital price
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
      });
      
      digitalPrice = prices.data.find(p => p.metadata?.delivery_type === 'digital') || prices.data[0];
      if (!digitalPrice) {
        throw priceError;
      }
    }

    // Create physical price (book price + shipping)
    let physicalPrice;
    try {
      physicalPrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: stripeConfig.currency,
        unit_amount: mmkToUsdCents(book.price), // Base price, shipping added separately
        metadata: {
          book_id: book.id,
          delivery_type: 'physical',
          original_price_mmk: book.price.toString(),
        },
      });
    } catch {
      // Try to find existing physical price
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
      });
      
      physicalPrice = prices.data.find(p => p.metadata?.delivery_type === 'physical');
      if (!physicalPrice) {
        // Fallback to digital price
        physicalPrice = digitalPrice;
      }
    }

    // Save to our database
    const { data, error } = await supabase
      .from('stripe_products')
      .insert({
        book_id: book.id,
        stripe_product_id: stripeProduct.id,
        digital_price_id: digitalPrice.id,
        physical_price_id: physicalPrice.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save Stripe product to database: ${error.message}`);
    }

    return data as StripeProduct;
  } catch (error) {
    console.error('Error syncing book to Stripe:', error);
    throw error;
  }
}

/**
 * Get or create Stripe product for a book
 */
export async function getStripeProductForBook(bookId: string): Promise<StripeProduct> {
  // Try to get existing product
  const { data: existingProduct } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('book_id', bookId)
    .single();

  if (existingProduct) {
    return existingProduct as StripeProduct;
  }

  // Get book details
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  // Create Stripe product
  return syncBookToStripe(book as Book);
}

/**
 * Create shipping price for physical books
 */
export async function getOrCreateShippingPrice(): Promise<string> {
  const shippingAmountMMK = STRIPE_CONFIG.SHIPPING_FEE_MMK;
  
  try {
    // Try to find existing shipping price
    const existingPrices = await stripe.prices.list({
      lookup_keys: ['shipping_mmk'],
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      return existingPrices.data[0].id;
    }

    // Create shipping product if it doesn't exist
    let shippingProduct;
    try {
      shippingProduct = await stripe.products.retrieve('shipping_mmk');
    } catch {
      shippingProduct = await stripe.products.create({
        id: 'shipping_mmk',
        name: 'Shipping Fee',
        description: 'Standard shipping within Myanmar',
        type: 'service',
        tax_code: 'txcd_92010001', // Shipping tax code
      });
    }

    // Create shipping price
    const shippingPrice = await stripe.prices.create({
      product: shippingProduct.id,
      currency: stripeConfig.currency,
      unit_amount: mmkToUsdCents(shippingAmountMMK),
      lookup_key: 'shipping_mmk',
      metadata: {
        original_amount_mmk: shippingAmountMMK.toString(),
      },
    });

    return shippingPrice.id;
  } catch (error) {
    console.error('Error creating shipping price:', error);
    throw error;
  }
}