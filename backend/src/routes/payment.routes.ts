import { Router, Request, Response, NextFunction } from 'express';
import { createPayment } from '../controllers/payment.controller';
import { verifyPayment } from '../controllers/payment.controller';
import { handleKBZPayCallback } from '../controllers/payment.controller';

const router = Router();

/**
 * POST /create-payment
 * Creates a KBZPay payment order
 * Body: { userId: string, bookIds: string[], amounts: number[] }
 */
router.post('/create-payment', createPayment);

/**
 * POST /verify-payment
 * Verifies payment status with KBZPay
 * Body: { merchantOrderId: string }
 */
router.post('/verify-payment', verifyPayment);

/**
 * POST /kbzpay-callback
 * Receives webhook callbacks from KBZPay
 * Body: { Request: {...} }
 */
router.post('/kbzpay-callback', handleKBZPayCallback);

export function createPaymentRouter(): Router {
  return router;
}

