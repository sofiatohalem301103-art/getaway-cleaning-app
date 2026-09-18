import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { toEmail, feedbackId, replyText, customerName } = await req.json();

    if (!toEmail) {
      return NextResponse.json(
        { error: 'Customer email is missing' },
        { status: 400 }
      );
    }

    const response = await resend.emails.send({
      from: 'Admin <onboarding@resend.dev>', // หาก Verify Domain บน Resend แล้ว สามารถใช้เป็น email@yourdomain.com ได้
      to: [toEmail],
      subject: `Response to your feedback #${feedbackId || ''}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Hello ${customerName || 'Valued Customer'},</h2>
          <p>Thank you for giving us your feedback. Here is our response:</p>
          <div style="background-color: #f4f4f5; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; white-space: pre-wrap;">${replyText}</p>
          </div>
          <p style="font-size: 14px; color: #666;">If you have any further questions, please reply directly to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888;">Best regards,<br/><strong>Support Team</strong></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Resend Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}