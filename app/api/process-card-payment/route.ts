import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is missing in environment variables' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const { amount, holderName, email } = await req.json();

    const numericAmount = typeof amount === 'number'
      ? amount
      : parseFloat(String(amount).replace(/[^0-9.]/g, ''));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
    }

    const amountInCents = Math.round(numericAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      receipt_email: email || undefined,
      description: `Payment by ${holderName || 'Guest'}`,
    });

    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
      });
    } else {
      return NextResponse.json(
        { error: `Payment status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Stripe Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process card payment' },
      { status: 400 }
    );
  }
}