import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const { amount, holderName, email } = await req.json();

    const numericAmount = typeof amount === 'number'
      ? amount
      : parseFloat(String(amount).replace(/[^0-9.]/g, ''));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
    }

    const amountInCents = Math.round(numericAmount * 100);

    // ใช้ Test Token 'tok_visa' เพื่อเลี่ยงการส่ง Raw Card Data ในโหมด Dev
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      payment_method: 'pm_card_visa', // ใช้ Test Payment Method ID
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      receipt_email: email || undefined,
      description: `Payment by ${holderName}`,
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