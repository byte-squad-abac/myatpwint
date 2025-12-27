import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    // Use service role key for admin operations
    this.client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }


  /**
   * Create a new KBZPay order
   */
  async createOrder(orderData: {
    merchant_order_id: string;
    user_id: string;
    book_ids: string[];
    amounts: number[];
    total_amount: number;
    currency: string;
    status: string;
  }) {
    const { data, error } = await this.client
      .from('kbzpay_orders')
      .insert({
        merchant_order_id: orderData.merchant_order_id,
        user_id: orderData.user_id,
        book_ids: orderData.book_ids,
        amounts: orderData.amounts,
        total_amount: orderData.total_amount,
        currency: orderData.currency,
        status: orderData.status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update order status
   */
  async updateOrder(
    orderId: string,
    updates: {
      status?: string;
      prepay_id?: string;
      kbz_order_id?: string;
      paid_amount?: number;
      paid_at?: string;
      error_code?: string;
      error_message?: string;
      kbzpay_response?: unknown;
      webhook_data?: unknown;
    }
  ) {
    const { data, error } = await this.client
      .from('kbzpay_orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find order by merchant order ID
   */
  async findOrderByMerchantOrderId(merchantOrderId: string) {
    const { data, error } = await this.client
      .from('kbzpay_orders')
      .select('*')
      .eq('merchant_order_id', merchantOrderId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find order by ID
   */
  async findOrderById(orderId: string) {
    const { data, error } = await this.client
      .from('kbzpay_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get books by IDs
   */
  async getBooksByIds(bookIds: string[]) {
    const { data, error } = await this.client
      .from('books')
      .select('id, name, price')
      .in('id', bookIds);

    if (error) throw error;
    return data;
  }

  /**
   * Create purchase records
   */
  async createPurchases(purchases: Array<{
    user_id: string;
    book_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    payment_id: string;
    status: string;
    purchased_at: string;
  }>) {
    const { data, error } = await this.client
      .from('purchases')
      .insert(purchases)
      .select();

    if (error) throw error;
    return data;
  }
}

