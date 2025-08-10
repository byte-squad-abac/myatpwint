/**
 * Payment Status Tracking Service
 */

import supabase from '../supabaseClient';
import { stripe } from '../stripe/config';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'requires_action' | 'canceled';

export interface PaymentRecord {
  id: string;
  user_id: string;
  book_id: string;
  purchase_price: number;
  purchase_type: 'purchase' | 'rent';
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  purchased_at: string;
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
    .order('purchased_at', { ascending: false });

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
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string, 
  status: PaymentStatus,
  metadata?: Record<string, any>
): Promise<void> {
  const updateData: any = {
    payment_status: status,
  };

  if (metadata) {
    updateData.metadata = metadata;
  }

  const { error } = await supabase
    .from('purchases')
    .update(updateData)
    .eq('id', paymentId);

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
}

/**
 * Get pending payments for a user
 */
export async function getPendingPayments(userId: string): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('payment_status', 'pending')
    .order('purchased_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending payments: ${error.message}`);
  }

  return data || [];
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
    .eq('payment_status', 'succeeded')
    .limit(1);

  if (error) {
    console.error('Error checking book purchase:', error);
    return false;
  }

  return (data || []).length > 0;
}

/**
 * Get purchase statistics for admin dashboard
 */
export async function getPaymentStats(): Promise<{
  totalRevenue: number;
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}> {
  try {
    // Get all successful payments
    const { data: successfulPayments, error: successError } = await supabase
      .from('purchases')
      .select('purchase_price')
      .eq('payment_status', 'succeeded');

    if (successError) throw successError;

    // Get payment counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('purchases')
      .select('payment_status');

    if (statusError) throw statusError;

    const totalRevenue = (successfulPayments || [])
      .reduce((sum, payment) => sum + Number(payment.purchase_price), 0);

    const totalOrders = statusCounts?.length || 0;
    const successful = statusCounts?.filter(p => p.payment_status === 'succeeded').length || 0;
    const failed = statusCounts?.filter(p => p.payment_status === 'failed').length || 0;
    const pending = statusCounts?.filter(p => p.payment_status === 'pending').length || 0;

    return {
      totalRevenue,
      totalOrders,
      successfulPayments: successful,
      failedPayments: failed,
      pendingPayments: pending,
    };
  } catch (error) {
    console.error('Error getting payment stats:', error);
    throw error;
  }
}

/**
 * Retry failed payment with new payment method
 */
export async function retryFailedPayment(paymentId: string): Promise<string> {
  try {
    const { data: payment, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      throw new Error('Payment not found');
    }

    if (payment.payment_status !== 'failed') {
      throw new Error('Payment is not in failed state');
    }

    // Create new checkout session for retry
    // This would redirect to a new payment flow
    // Implementation depends on your retry strategy

    return 'retry_initiated';
  } catch (error) {
    console.error('Error retrying payment:', error);
    throw error;
  }
}