import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import jsPDF from 'jspdf';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServer = createClient(supabaseUrl, supabaseKey);

function cleanText(value: any, fallback: string = '-'): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return fallback;
  return str;
}

function parseAndFormatDate(inputDate: string | null): string {
  const clean = cleanText(inputDate, '');
  if (!clean || clean === '-') {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  let cleanDateStr = clean.includes('(') ? clean.split('(')[0].trim() : clean;
  const parsedDate = new Date(cleanDateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return cleanDateStr;
}

function parseAndFormatTime(inputTime: string | null): string {
  let timeStr = cleanText(inputTime, '');
  if (timeStr && timeStr !== '-') {
    let cleanTime = timeStr.trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) cleanTime = cleanTime.substring(0, 5);
    cleanTime = cleanTime.replace('.', ':');
    if (!cleanTime.toLowerCase().includes('hrs') && !cleanTime.toLowerCase().includes('am') && !cleanTime.toLowerCase().includes('pm')) {
      cleanTime += ' hrs';
    }
    return cleanTime;
  }
  return 'Not Specified';
}

function generatePdfBuffer(params: any): Buffer {
  const { customerName, program, room, receiptNo, paymentMode, receiptDate, date, time, price } = params;
  const formattedDate = parseAndFormatDate(date);
  const formattedTime = parseAndFormatTime(time);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 15;
  const pageWidth = 210;
  const rightX = pageWidth - marginX;

  let leftY = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('GETAWAY CLEANING LTD', marginX, leftY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);

  leftY += 4.5; doc.text('HE 495919', marginX, leftY);
  leftY += 4; doc.text('TAX No. 60385711Z', marginX, leftY);
  leftY += 4; doc.text('Neofytou Nikolaidis 61, Paphos', marginX, leftY);
  leftY += 4; doc.text('Paphos, 8011, Cyprus.', marginX, leftY);
  leftY += 4; doc.text('+357 96330400', marginX, leftY);
  leftY += 4; doc.text('info@getaway-cleaning.com', marginX, leftY);

  try {
    const publicDir = path.join(process.cwd(), 'public');
    const possibleLogos = ['logo.jpeg', 'logo.jpg', 'logo.png'];
    let logoPath = '';
    for (const logoName of possibleLogos) {
      const fullPath = path.join(publicDir, logoName);
      if (fs.existsSync(fullPath)) { logoPath = fullPath; break; }
    }
    if (logoPath) {
      const logoBuffer = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).substring(1).toUpperCase();
      const format = ext === 'JPG' ? 'JPEG' : ext;
      const logoBase64 = `data:image/${ext.toLowerCase()};base64,${logoBuffer.toString('base64')}`;
      doc.addImage(logoBase64, format, rightX - 60, 18, 60, 24);
    }
  } catch (err) {
    console.error('Logo render error:', err);
  }

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, 48, rightX, 48);

  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('SALES RECEIPT', marginX, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Sales Receipt# ${receiptNo}`, marginX, y);

  y += 9;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To', marginX, y);

  const dateColX = marginX + 115;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Receipt Date', dateColX, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(receiptDate, rightX, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(customerName, marginX, y);

  y += 10;
  const tableTopY = y;
  doc.setFillColor(248, 248, 248);
  doc.rect(marginX, tableTopY, pageWidth - (marginX * 2), 6.5, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, tableTopY, rightX, tableTopY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('#', marginX + 3, tableTopY + 4.5);
  doc.text('Item & Description', marginX + 12, tableTopY + 4.5);
  doc.text('Qty', marginX + 120, tableTopY + 4.5, { align: 'right' });
  doc.text('Rate', marginX + 148, tableTopY + 4.5, { align: 'right' });
  doc.text('Amount', rightX - 3, tableTopY + 4.5, { align: 'right' });

  const headerBottomY = tableTopY + 6.5;
  doc.line(marginX, headerBottomY, rightX, headerBottomY);

  let itemY = headerBottomY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  doc.text('1', marginX + 3, itemY);

  doc.setFont('helvetica', 'bold');
  const programLines = doc.splitTextToSize(program, 100);
  doc.text(programLines, marginX + 12, itemY);

  let subY = itemY + (programLines.length * 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);

  const roomLines = doc.splitTextToSize(`Property : ${room}`, 100);
  doc.text(roomLines, marginX + 12, subY);
  subY += (roomLines.length * 4);

  doc.text(`Date : ${formattedDate}`, marginX + 12, subY);
  subY += 4;
  doc.text(`Time : ${formattedTime}`, marginX + 12, subY);

  const selectedPrice = parseFloat(price) || 50.0;
  const subTotalNum = selectedPrice / 1.19;
  const vatNum = selectedPrice - subTotalNum;
  const formatAmount = (num: number) => num.toFixed(2);

  doc.setTextColor(0, 0, 0);
  doc.text('1.00', marginX + 120, itemY, { align: 'right' });
  doc.text(formatAmount(subTotalNum), marginX + 148, itemY, { align: 'right' });
  doc.text(formatAmount(subTotalNum), rightX - 3, itemY, { align: 'right' });

  const lineAfterItemsY = subY + 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, lineAfterItemsY, rightX, lineAfterItemsY);

  const boxX = marginX;
  const boxY = lineAfterItemsY + 6;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(boxX, boxY, 85, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Details', boxX + 4, boxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Payment Mode', boxX + 4, boxY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(paymentMode, boxX + 38, boxY + 16);

  let sumY = lineAfterItemsY + 10;
  const labelX = marginX + 130;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Sub Total', labelX, sumY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatAmount(subTotalNum), rightX, sumY, { align: 'right' });

  sumY += 6;
  doc.setTextColor(80, 80, 80);
  doc.text('VAT (19%)', labelX, sumY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatAmount(vatNum), rightX, sumY, { align: 'right' });

  sumY += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(labelX - 15, sumY, rightX, sumY);

  sumY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Total', labelX, sumY);
  doc.text(`€ ${formatAmount(selectedPrice)}`, rightX, sumY, { align: 'right' });

  sumY += 3.5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(labelX - 15, sumY, rightX, sumY);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🟢 1. Handle OTP Email (English Version Only)
    if (body.otp) {
      const targetEmail = cleanText(body.email, '');
      if (!targetEmail) {
        return NextResponse.json({ success: false, error: 'Email is required for OTP' }, { status: 400 });
      }

      const otpString = String(body.otp).trim();
      const userPrefix = targetEmail.split('@')[0];

      const otpDigitsHtml = otpString
        .split('')
        .map(
          (digit) =>
            `<span style="display: inline-block; width: 34px; max-width: 38px; height: 44px; line-height: 44px; margin: 0 2px; font-size: 24px; font-weight: 800; color: #111827; background-color: #f3f4f6; border-radius: 6px; text-align: center; box-sizing: border-box;">${digit}</span>`
        )
        .join('');

      const otpHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 20px 10px; margin: 0; color: #1f2937;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; padding: 24px 16px; border: 1px solid #f1f5f9; border-radius: 16px;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 800; color: #1E2B37; letter-spacing: -0.5px;">Getaway Cleaning</span>
            </div>
            <p style="font-size: 15px; color: #374151; margin-bottom: 12px; font-weight: 500;">
              Hi ${userPrefix},
            </p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 20px;">
              Here is your verification code to log in or complete your request at Getaway Cleaning.
            </p>
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px; font-weight: 500; text-align: center;">
              Use this code in the app:
            </p>
            
            <!-- OTP 6-digits block -->
            <div style="text-align: center; margin-bottom: 16px; white-space: nowrap;">
              ${otpDigitsHtml}
            </div>

            <!-- Tap & hold to copy block -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 8px 16px; user-select: all; -webkit-user-select: all;">
                <span style="font-size: 12px; color: #64748b; font-weight: 500;">Verification Code: </span>
                <strong style="font-size: 16px; color: #006AFF; letter-spacing: 2px; font-family: monospace;">${otpString}</strong>
              </div>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 6px; margin-bottom: 0;">
                (Tap and hold the code above to copy)
              </p>
            </div>

            <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              If you didn’t request a verification code, you can safely ignore this message.
            </p>
          </div>
        </body>
        </html>
      `;

      const { data: otpData, error: otpError } = await resend.emails.send({
        from: 'Getaway Cleaning <noreply@getaway-cleaning.com>',
        to: [targetEmail],
        subject: `${otpString} is your Getaway Cleaning verification code`,
        html: otpHtml,
      });

      if (otpError) {
        return NextResponse.json({ success: false, error: otpError }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'OTP sent successfully', otpEmailData: otpData });
    }

    // -------------------------------------------------------------
    // 🔵 2. Booking Notification Handlers (All English)
    // -------------------------------------------------------------
    const { 
      action = 'confirm_payment',
      userId,
      email, 
      customerName, 
      phone,
      bookingRef, 
      room, 
      program, 
      date, 
      time, 
      amount, 
      paymentMethod 
    } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const validCustomerName = cleanText(customerName, 'Valued Customer');
    const cleanRef = cleanText(bookingRef, 'REF-000000');
    const validRoom = cleanText(room, '-');
    const selectedProgram = cleanText(program, 'Cleaning Service');
    const validDate = cleanText(date, '-');
    const validTime = cleanText(time, '-');
    const validPhone = cleanText(phone, '-');
    const validEmail = cleanText(email, '');
    const validPaymentMethod = cleanText(paymentMethod, 'Cash on Service');
    const numAmount = parseFloat(String(amount || '').replace(/[^0-9.]/g, '') || '0.00');
    const formattedAmount = numAmount.toFixed(2);

    // =========================================================================
    // Case A: action === 'acknowledge_quote'
    // =========================================================================
    if (action === 'acknowledge_quote') {
      const acknowledgeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; padding: 20px 10px; margin: 0; color: #1f2937;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px sm:padding: 36px; box-sizing: border-box;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 800; color: #111827;">Getaway Cleaning</span>
            </div>

            <h1 style="font-size: 19px; font-weight: 700; color: #111827; margin-bottom: 14px;">
              We've Received Your Request!
            </h1>
            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              Dear ${validCustomerName},<br>
              Thank you for choosing Getaway Cleaning. We have received your custom cleaning request for booking <strong>${cleanRef}</strong>. Our team is currently reviewing your property details and calculating your price quotation.
            </p>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px sm:padding: 20px; border-radius: 8px; margin: 18px 0;">
              <div style="font-size: 13px; font-weight: 700; color: #0284c7; margin-bottom: 8px;">📋 Request Summary</div>
              <div style="font-size: 13px; color: #4b5563; line-height: 1.8; word-break: break-word;">
                <strong>Service:</strong> ${selectedProgram}<br>
                <strong>Property / Address:</strong> ${validRoom}<br>
                <strong>Requested Date:</strong> ${validDate}<br>
                <strong>Requested Time:</strong> ${validTime}
              </div>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
              <p style="font-size: 13px; color: #0369a1; margin: 0; line-height: 1.5;">
                ℹ️ <strong>Status: Under Review.</strong> We will send you an official quotation via email as soon as the price evaluation is complete.
              </p>
            </div>

            <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 14px;">
              Questions? Reach us at +357 96330400 or info@getaway-cleaning.com.
            </p>
          </div>
        </body>
        </html>
      `;

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Getaway Cleaning <noreply@getaway-cleaning.com>',
        to: [validEmail],
        subject: `Request Received: #${cleanRef} (Under Price Review) - Getaway Cleaning`,
        html: acknowledgeHtml,
      });

      if (emailError) {
        console.error('Acknowledge Email Error:', emailError);
        return NextResponse.json({ success: false, error: emailError }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Acknowledge email sent', emailData });
    }

    // =========================================================================
    // Case B: action === 'send_quote'
    // =========================================================================
    if (action === 'send_quote') {
      const quoteHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; padding: 20px 10px; margin: 0; color: #1f2937;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px sm:padding: 36px; box-sizing: border-box;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 800; color: #111827;">Getaway Cleaning</span>
            </div>

            <h1 style="font-size: 19px; font-weight: 700; color: #111827; margin-bottom: 14px;">
              Your Price Quotation is Ready!
            </h1>
            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              Dear ${validCustomerName},<br>
              We have completed the price evaluation for your custom cleaning booking <strong>${cleanRef}</strong>. Here are the approved quote details:
            </p>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px sm:padding: 20px; border-radius: 8px; margin: 18px 0;">
              <div style="font-size: 13px; color: #166534;">Estimated Total Amount</div>
              <div style="font-size: 26px; font-weight: 800; color: #16a34a;">€ ${formattedAmount}</div>
              <div style="font-size: 13px; color: #374151; margin-top: 12px; line-height: 1.8; word-break: break-word;">
                <strong>Service:</strong> ${selectedProgram}<br>
                <strong>Property / Address:</strong> ${validRoom}<br>
                <strong>Scheduled Date:</strong> ${validDate}<br>
                <strong>Scheduled Time:</strong> ${validTime}
              </div>
            </div>

            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
              <p style="font-size: 13px; color: #854d0e; margin: 0; line-height: 1.5;">
                💵 You can pay this amount in cash directly to our cleaning crew upon arrival or complete via bank transfer. An official Sales Receipt will be issued once payment is received.
              </p>
            </div>

            <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 14px;">
              Questions? Reach us at +357 96330400 or info@getaway-cleaning.com.
            </p>
          </div>
        </body>
        </html>
      `;

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Getaway Cleaning <noreply@getaway-cleaning.com>',
        to: [validEmail],
        subject: `Price Quote Ready: #${cleanRef} (€${formattedAmount}) - Getaway Cleaning`,
        html: quoteHtml,
      });

      if (emailError) {
        console.error('Send Quote Email Error:', emailError);
        return NextResponse.json({ success: false, error: emailError }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Price quotation email sent', emailData });
    }

    // =========================================================================
    // Case C: action === 'confirm_order'
    // =========================================================================
    if (action === 'confirm_order') {
      const orderConfirmedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 20px 10px; margin: 0; color: #1f2937;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px sm:padding: 36px; box-sizing: border-box;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 800; color: #111827;">Getaway Cleaning</span>
            </div>

            <h1 style="font-size: 19px; font-weight: 700; color: #111827; margin-bottom: 14px;">
              Booking Confirmed & Scheduled!
            </h1>
            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              Dear ${validCustomerName},<br>
              Our team has confirmed your booking schedule <strong>${cleanRef}</strong>. Our cleaning crew is scheduled to arrive at your property as details below:
            </p>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px sm:padding: 20px; border-radius: 8px; margin: 18px 0;">
              <div style="font-size: 13px; color: #6b7280;">Amount to Pay (Upon Arrival)</div>
              <div style="font-size: 24px; font-weight: 800; color: #006AFF;">€ ${formattedAmount}</div>
              <div style="font-size: 13px; color: #4b5563; margin-top: 12px; line-height: 1.8; word-break: break-word;">
                <strong>Service:</strong> ${selectedProgram}<br>
                <strong>Property / Address:</strong> ${validRoom}<br>
                <strong>Date:</strong> ${validDate}<br>
                <strong>Time:</strong> ${validTime}<br>
                <strong>Payment Method:</strong> ${validPaymentMethod}
              </div>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
              <p style="font-size: 13px; color: #065f46; margin: 0; line-height: 1.5;">
                💵 <strong>Payment Notice:</strong> Please prepare the exact cash amount of <strong>€${formattedAmount}</strong> to hand directly to our cleaning crew upon arrival. Once payment is received, an official Sales Receipt will be issued to your email.
              </p>
            </div>

            <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 14px;">
              If you have any questions or need to reschedule, please contact us at +357 96330400 or info@getaway-cleaning.com.
            </p>
          </div>
        </body>
        </html>
      `;

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Getaway Cleaning <noreply@getaway-cleaning.com>',
        to: [validEmail],
        subject: `Booking Confirmed: #${cleanRef} - Getaway Cleaning`,
        html: orderConfirmedHtml,
      });

      if (emailError) {
        console.error('Order Confirmation Email Error:', emailError);
        return NextResponse.json({ success: false, error: emailError }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Booking confirmation order email sent successfully', 
        emailData 
      });
    }

    // =========================================================================
    // Case D: action === 'confirm_payment' (Sales Receipt PDF attached)
    // =========================================================================
    const today = new Date();
    const receiptDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    let receiptNo = '';
    let existingDetails: any = {};

    try {
      const { data: currentBooking } = await supabaseServer
        .from('bookings')
        .select('details')
        .eq('booking_ref', cleanRef)
        .maybeSingle();

      if (currentBooking?.details) {
        existingDetails = typeof currentBooking.details === 'string'
          ? JSON.parse(currentBooking.details)
          : currentBooking.details;
      }

      if (existingDetails.receipt_no) {
        receiptNo = existingDetails.receipt_no;
      } else {
        const { count, error: countError } = await supabaseServer
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed')
          .gt('total_amount', 0)
          .neq('booking_ref', cleanRef);

        const previousCount = (!countError && count !== null) ? count : 0;
        const nextReceiptNum = previousCount + 1;
        receiptNo = `SR-${String(nextReceiptNum).padStart(5, '0')}`;
      }
    } catch (err) {
      console.error('Error calculating receipt number:', err);
      receiptNo = 'SR-00001';
    }

    const bookingDetails = {
      ...existingDetails,
      customer_name: validCustomerName,
      customer_email: validEmail,
      customer_phone: validPhone,
      payment_method: validPaymentMethod,
      payment_status: 'paid',
      receipt_no: receiptNo,
      receipt_date: receiptDate,
    };

    const { error: dbError } = await supabaseServer
      .from('bookings')
      .upsert(
        [
          {
            user_id: userId || null,
            customer_id: userId || null,
            booking_ref: cleanRef,
            address_line: validRoom,
            program_name: selectedProgram,
            scheduled_date: validDate !== '-' ? validDate : null,
            scheduled_time: validTime !== '-' ? validTime : null,
            total_amount: numAmount,
            details: JSON.stringify(bookingDetails),
            status: 'confirmed',
            updated_at: new Date().toISOString()
          }
        ],
        { onConflict: 'booking_ref' }
      );

    if (dbError) {
      console.error('Failed to save/update booking in Supabase:', dbError);
    }

    const pdfBuffer = generatePdfBuffer({
      customerName: validCustomerName,
      program: selectedProgram,
      room: validRoom,
      receiptNo: receiptNo,
      paymentMode: validPaymentMethod,
      receiptDate: receiptDate,
      date: validDate,
      time: validTime,
      price: formattedAmount
    });

    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 20px 10px; margin: 0; color: #1f2937;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px sm:padding: 36px; box-sizing: border-box;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: 800; color: #111827;">Getaway Cleaning</span>
          </div>

          <h1 style="font-size: 19px; font-weight: 700; color: #111827; margin-bottom: 14px;">
            Payment Confirmed!
          </h1>
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">
            Dear ${validCustomerName},<br>
            Your payment for booking <strong>${cleanRef}</strong> has been received and confirmed by our team.
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px sm:padding: 20px; border-radius: 8px; margin: 18px 0;">
            <div style="font-size: 13px; color: #6b7280;">Total Paid</div>
            <div style="font-size: 24px; font-weight: 800; color: #111827;">€ ${formattedAmount}</div>
            <div style="font-size: 13px; color: #4b5563; margin-top: 10px; line-height: 1.8; word-break: break-word;">
              <strong>Receipt No:</strong> ${receiptNo}<br>
              <strong>Payment Method:</strong> ${validPaymentMethod}<br>
              <strong>Property:</strong> ${validRoom}<br>
              <strong>Date:</strong> ${validDate} @ ${validTime}
            </div>
          </div>

          <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
            We have attached your official PDF Sales Receipt to this email. Thank you for choosing Getaway Cleaning!
          </p>
        </div>
      </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Getaway Cleaning <noreply@getaway-cleaning.com>',
      to: [validEmail],
      subject: `Payment Confirmed & Receipt [${receiptNo}] - Getaway Cleaning`,
      html: customerEmailHtml,
      attachments: [
        {
          filename: `Receipt-${receiptNo}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (emailError) {
      console.error('Resend Email Error:', emailError);
      return NextResponse.json({ success: false, error: emailError }, { status: 400 });
    }

    return NextResponse.json({ success: true, receiptNo, emailData });
  } catch (error: any) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}