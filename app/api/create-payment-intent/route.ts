import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe ด้วย Secret Key จาก .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // หรือเวอร์ชันล่าสุด
});

export async function POST(req: Request) {
  try {
    const { amount, currency = 'eur' } = await req.json();

    // แปลงจำนวนเงินเป็นหน่วยย่อยที่สุด (เช่น EUR/USD คิดเป็น cents -> 90€ = 9000 cents)
    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    const amountInCents = Math.round(numericAmount * 100);

    if (isNaN(amountInCents) || amountInCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // สร้าง PaymentIntent บน Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Stripe PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}