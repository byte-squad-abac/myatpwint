/**
 * Payment Status Tracking Service
 */

import { createClient } from '@supabase/supabase-js';
import { stripe } from '../stripe/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'requires_action' | 'canceled';

export interface PaymentRecord {
  id: string;
  user_id: string;
  book_id: string;
  delivery_type: 'physical' | 'digital';
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_price: number;
  status: 'completed' | 'pending' | 'cancelled';
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get payment history for a user
 */
export async function getUserPaymentHistory(userId: string): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      books (
        id,
        name,
        author,
        image_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch payment history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get payment status by Stripe session ID
 */
export async function getPaymentByStripeSession(sessionId: string): Promise<PaymentRecord | null> {
  try {
    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.payment_intent) {
      return null;
    }

    // Find payment in database
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('stripe_payment_intent_id', session.payment_intent)
      .single();

    if (error) {
      console.error('Error fetching payment by session:', error);
      return null;
    }

    return data as PaymentRecord;
  } catch (error) {
    console.error('Error getting payment by Stripe session:', error);
    return null;
  }
}

/**
 * Check if user has purchased a specific book
 */
export async function hasUserPurchasedBook(userId: string, bookId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'completed')
    .limit(1);

  if (error) {
    console.error('Error checking book purchase:', error);
    return false;
  }

  return (data || []).length > 0;
}

/**
 * Get purchase statistics for publisher dashboard
 */
export async function getPaymentStats(): Promise<{
  totalRevenue: number;
  totalOrders: number;
  completedPayments: number;
  pendingPayments: number;
  cancelledPayments: number;
}> {
  try {
    // Get all completed payments
    const { data: completedPayments, error: completedError } = await supabase
      .from('purchases')
      .select('total_price')
      .eq('status', 'completed');

    if (completedError) throw completedError;

    // Get payment counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('purchases')
      .select('status');

    if (statusError) throw statusError;

    const totalRevenue = (completedPayments || [])
      .reduce((sum, payment) => sum + Number(payment.total_price), 0);

    const totalOrders = statusCounts?.length || 0;
    const completed = statusCounts?.filter(p => p.status === 'completed').length || 0;
    const pending = statusCounts?.filter(p => p.status === 'pending').length || 0;
    const cancelled = statusCounts?.filter(p => p.status === 'cancelled').length || 0;

    return {
      totalRevenue,
      totalOrders,
      completedPayments: completed,
      pendingPayments: pending,
      cancelledPayments: cancelled,
    };
  } catch (error) {
    console.error('Error getting payment stats:', error);
    throw error;
  }
}