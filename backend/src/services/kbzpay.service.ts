import crypto from 'crypto';

export interface KBZPayOrder {
  merch_order_id: string;
  total_amount: number;
  title?: string;
  callback_info?: string;
}

export interface KBZPayPrecreateResponse {
  result: string;
  code: string;
  msg: string;
  prepay_id?: string;
  merch_order_id?: string;
  nonce_str: string;
  sign_type: string;
  sign: string;
  // Additional fields for query response
  trade_status?: string;
  total_amount?: string;
  mm_order_id?: string;
  pay_success_time?: string;
}

export class KBZPayService {
  private readonly appId: string;
  private readonly merchantCode: string;
  private readonly appKey: string;
  private readonly baseUrl: string;
  private readonly notifyUrl: string;
  private readonly pwaBaseUrl: string;

  constructor() {
    this.appId = process.env.KBZPAY_APP_ID!;
    this.merchantCode = process.env.KBZPAY_MERCHANT_CODE!;
    this.appKey = process.env.KBZPAY_APP_KEY!;
    this.baseUrl = process.env.KBZPAY_BASE_URL!;
    this.notifyUrl = process.env.KBZPAY_NOTIFY_URL!;
    this.pwaBaseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.KBZPAY_PWA_PROD_URL!
      : process.env.KBZPAY_PWA_UAT_URL!;

    // Validate required environment variables
    if (!this.appId || !this.merchantCode || !this.appKey || !this.baseUrl || !this.notifyUrl) {
      throw new Error('Missing required KBZPay configuration. Please check your environment variables.');
    }
  }

  /**
   * Generate random nonce string (32 characters max)
   */
  private generateNonceStr(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate Unix timestamp in seconds
   */
  private generateTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Generate SHA256 signature following KBZPay specification
   */
  private generateSignature(params: Record<string, unknown>): string {
    // Step 1: Sort parameters alphabetically and build query string
    const sortedKeys = Object.keys(params)
      .filter(
        (key) =>
          key !== 'sign' &&
          key !== 'sign_type' &&
          params[key] !== '' &&
          params[key] !== null &&
          params[key] !== undefined
      )
      .sort();

    const queryPairs = sortedKeys.map((key) => `${key}=${params[key]}`);
    const stringA = queryPairs.join('&');

    // Step 2: Add app key and generate signature
    const stringToSign = `${stringA}&key=${this.appKey}`;
    const signature = crypto.createHash('sha256').update(stringToSign, 'utf8').digest('hex').toUpperCase();

    return signature;
  }

  /**
   * Create KBZPay order for PWAAPP payment
   */
  async createOrder(orderData: KBZPayOrder): Promise<KBZPayPrecreateResponse> {
    const timestamp = this.generateTimestamp();
    const nonceStr = this.generateNonceStr();

    // Build biz_content with optional fields
    const bizContent: Record<string, string> = {
      appid: this.appId,
      merch_code: this.merchantCode,
      merch_order_id: orderData.merch_order_id,
      trade_type: 'PWAAPP',
      total_amount: orderData.total_amount.toString(),
      trans_currency: 'MMK',
      timeout_express: '120m',
    };

    // Add optional fields
    if (orderData.title) {
      bizContent.title = orderData.title;
    }
    if (orderData.callback_info) {
      bizContent.callback_info = encodeURIComponent(orderData.callback_info);
    }

    // Build request parameters according to KBZPay specification
    const requestParams = {
      timestamp: timestamp.toString(),
      notify_url: this.notifyUrl,
      method: 'kbz.payment.precreate',
      nonce_str: nonceStr,
      sign_type: 'SHA256',
      version: '1.0',
      biz_content: bizContent,
    };

    // Flatten biz_content for signature generation
    const flatParams: Record<string, unknown> = {
      ...requestParams,
      ...requestParams.biz_content,
    };
    delete flatParams.biz_content;

    // Generate signature
    const signature = this.generateSignature(flatParams);

    // Build final request body
    const requestBody = {
      Request: {
        ...requestParams,
        sign: signature,
      },
    };

    // Make API request
    try {
      const response = await fetch(`${this.baseUrl}/precreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.Response as KBZPayPrecreateResponse;
    } catch (error) {
      console.error('KBZPay API Error:', error);
      throw new Error(
        `Failed to create KBZPay order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate PWA payment URL with order signature
   */
  generatePWAPaymentUrl(prepayId: string): string {
    const timestamp = this.generateTimestamp();
    const nonceStr = this.generateNonceStr();

    // Build order info parameters for PWA redirect
    const orderInfo = {
      appid: this.appId,
      merch_code: this.merchantCode,
      prepay_id: prepayId,
      timestamp,
      nonce_str: nonceStr,
    };

    // Generate signature for order info
    const signature = this.generateSignature(orderInfo);

    // Build PWA URL with signed parameters
    const params = new URLSearchParams({
      ...orderInfo,
      timestamp: timestamp.toString(),
      sign: signature,
    });

    return `${this.pwaBaseUrl}?${params.toString()}`;
  }

  /**
   * Verify webhook signature from KBZPay callback
   */
  verifyWebhookSignature(params: Record<string, unknown>): boolean {
    if (!params.sign) {
      return false;
    }

    const receivedSignature = params.sign as string;
    const expectedSignature = this.generateSignature(params);

    return receivedSignature === expectedSignature;
  }

  /**
   * Query order status
   */
  async queryOrder(merchantOrderId: string): Promise<KBZPayPrecreateResponse> {
    const timestamp = this.generateTimestamp();
    const nonceStr = this.generateNonceStr();

    const requestParams = {
      timestamp: timestamp.toString(),
      method: 'kbz.payment.queryorder',
      nonce_str: nonceStr,
      sign_type: 'SHA256',
      version: '3.0',
      biz_content: {
        appid: this.appId,
        merch_code: this.merchantCode,
        merch_order_id: merchantOrderId,
      },
    };

    // Flatten for signature
    const flatParams: Record<string, unknown> = {
      ...requestParams,
      ...requestParams.biz_content,
    };
    delete flatParams.biz_content;

    const signature = this.generateSignature(flatParams);

    const requestBody = {
      Request: {
        ...requestParams,
        sign: signature,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/queryorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.Response;
    } catch (error) {
      console.error('KBZPay Query Error:', error);
      throw new Error(
        `Failed to query KBZPay order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

