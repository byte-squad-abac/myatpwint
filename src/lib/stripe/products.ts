/**
 * Stripe Products and Prices Management
 */

import { stripe, stripeConfig } from './config';
import supabase from '../supabaseClient';
import { Book } from '../types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface StripeProduct {
  id: string;
  book_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  currency: string;
  unit_amount: number;
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
  // Ensure minimum amount for Stripe (50 cents)
  return Math.max(cents, 50);
}

/**
 * Convert USD cents back to MMK for display
 */
export function usdCentsToMmk(cents: number): number {
  const usd = cents / 100;
  return Math.round(usd / stripeConfig.mmkToUsdRate);
}

/**
 * Convert pya back to MMK for display (legacy - keeping for compatibility)
 */
export function pyaToMmk(pya: number): number {
  return pya / 100;
}

/**
 * Sync a book to Stripe as a product with price
 */
export async function syncBookToStripe(book: Book, client?: SupabaseClient): Promise<StripeProduct> {
  const supabaseClient = client || supabase;
  try {
    // Check if product already exists
    const { data: existingProduct } = await supabaseClient
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
    } catch (stripeError: any) {
      // If product already exists in Stripe, retrieve it
      if (stripeError.code === 'resource_already_exists') {
        stripeProduct = await stripe.products.retrieve(`book_${book.id}`);
      } else {
        throw stripeError;
      }
    }

    // Create or get Stripe price
    let stripePrice;
    try {
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: stripeConfig.currency,
        unit_amount: mmkToUsdCents(book.price),
        metadata: {
          book_id: book.id,
          original_price_mmk: book.price.toString(),
        },
      });
    } catch (priceError: any) {
      // If price creation fails, try to find existing price for this product
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
        limit: 1,
      });
      
      if (prices.data.length > 0) {
        stripePrice = prices.data[0];
      } else {
        throw priceError;
      }
    }

    // Save to our database
    const { data, error } = await supabaseClient
      .from('stripe_products')
      .insert({
        book_id: book.id,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        currency: stripeConfig.currency,
        unit_amount: mmkToUsdCents(book.price),
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
export async function getStripeProductForBook(bookId: string, client?: SupabaseClient): Promise<StripeProduct> {
  const supabaseClient = client || supabase;
  
  // Try to get existing product
  const { data: existingProduct } = await supabaseClient
    .from('stripe_products')
    .select('*')
    .eq('book_id', bookId)
    .single();

  if (existingProduct) {
    return existingProduct as StripeProduct;
  }

  // Get book details
  const { data: book, error: bookError } = await supabaseClient
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  // Create Stripe product
  return syncBookToStripe(book as Book, client);
}

/**
 * Create shipping price for physical books
 */
export async function getOrCreateShippingPrice(): Promise<string> {
  const shippingAmountMMK = 5000; // 5,000 MMK shipping fee
  
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

/**
 * Sync all books to Stripe (useful for initial setup)
 */
export async function syncAllBooksToStripe(): Promise<void> {
  try {
    const { data: books, error } = await supabase
      .from('books')
      .select('*');

    if (error) {
      throw error;
    }

    if (!books || books.length === 0) {
      console.log('No books found to sync');
      return;
    }

    console.log(`Syncing ${books.length} books to Stripe...`);

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (book) => {
          try {
            await syncBookToStripe(book as Book);
            console.log(`✅ Synced book: ${book.name}`);
          } catch (error) {
            console.error(`❌ Failed to sync book ${book.name}:`, error);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Finished syncing books to Stripe');
  } catch (error) {
    console.error('Error syncing all books to Stripe:', error);
    throw error;
  }
}

/**
 * Update book price in Stripe when changed in database
 */
export async function updateBookPriceInStripe(bookId: string, newPrice: number): Promise<void> {
  try {
    const stripeProduct = await getStripeProductForBook(bookId);
    
    // Create new price (Stripe prices are immutable)
    const newStripePrice = await stripe.prices.create({
      product: stripeProduct.stripe_product_id,
      currency: stripeConfig.currency,
      unit_amount: mmkToUsdCents(newPrice),
      metadata: {
        book_id: bookId,
      },
    });

    // Deactivate old price
    await stripe.prices.update(stripeProduct.stripe_price_id, {
      active: false,
    });

    // Update our database
    await supabase
      .from('stripe_products')
      .update({
        stripe_price_id: newStripePrice.id,
        unit_amount: mmkToUsdCents(newPrice),
        updated_at: new Date().toISOString(),
      })
      .eq('book_id', bookId);

    console.log(`Updated price for book ${bookId} in Stripe`);
  } catch (error) {
    console.error('Error updating book price in Stripe:', error);
    throw error;
  }
}