import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// ดึงค่า Secret Key จากไฟล์ .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const { amount, currency = 'eur' } = await req.json();

    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    const amountInCents = Math.round(numericAmount * 100);

    if (isNaN(amountInCents) || amountInCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
    });

    return NextResponse.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret, 
      status: paymentIntent.status 
    });
  } catch (error: any) {
    console.error('❌ Stripe Error Details:', error?.raw || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}