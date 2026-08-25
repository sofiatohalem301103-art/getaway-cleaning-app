import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// ดึง API Key จากไฟล์ .env.local เท่านั้น (อย่าแปะ Key ลงในไฟล์นี้โดยตรง)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, customerName, room, date, time, amount, paymentMethod } = body;

    // หากอยู่ในช่วง Dev ให้ใช้ fallback เป็นอีเมลที่ลงทะเบียนกับ Resend
    const targetEmail = to || 'sofiatohalem301103@gmail.com';

    // เช็กว่าเป็น request ส่ง OTP หรือไม่
    const isOtpRequest = 
      paymentMethod === 'Email OTP Service' || 
      paymentMethod === 'Verification System' || 
      room === 'OTP Verification' ||
      room === 'OTP Test';

    // 1. Template สำหรับ OTP Verification
    const otpHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #059669; text-align: center; margin-bottom: 8px;">🔐 Getaway OTP Verification</h2>
        <p style="color: #374151; font-size: 14px;">สวัสดีครับ,</p>
        <p style="color: #374151; font-size: 14px;">รหัสยืนยันตัวตน (OTP) สำหรับเข้าใช้งานระบบของคุณ คือ:</p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #166534; margin: 24px 0;">
          ${amount}
        </div>
        
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 16px;">
          รหัสนี้มีอายุการใช้งาน 5 นาที กรุณาอย่าเปิดเผยรหัสนี้แก่ผู้อื่น
        </p>
      </div>
    `;

    // 2. Template สำหรับ Booking Confirmation
    const bookingHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Booking Confirmation</h2>
        <p>Hi <strong>${customerName || 'Customer'}</strong>,</p>
        <p>Thank you for your payment. Here are your booking details:</p>
        <ul>
          <li><strong>Room:</strong> ${room || '-'}</li>
          <li><strong>Date:</strong> ${date || '-'}</li>
          <li><strong>Time:</strong> ${time || '-'}</li>
          <li><strong>Amount:</strong> ${amount || '-'}</li>
          <li><strong>Payment Method:</strong> ${paymentMethod || '-'}</li>
        </ul>
      </div>
    `;

    const subject = isOtpRequest
      ? `[${amount}] คือรหัส OTP ยืนยันตัวตนของคุณ - Getaway`
      : 'Booking Confirmation - Getaway Homes';

    const htmlContent = isOtpRequest ? otpHtml : bookingHtml;

    const mailResult = await resend.emails.send({
      from: 'Getaway Homes <onboarding@resend.dev>',
      to: [targetEmail],
      subject: subject,
      html: htmlContent,
    });

    if (mailResult.error) {
      console.error('Resend Error:', mailResult.error);
      return NextResponse.json({ error: mailResult.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: mailResult });
  } catch (error: any) {
    console.error('Notify API Catch Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}