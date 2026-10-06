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
  doc.text(program, marginX + 12, itemY);

  let subY = itemY + 4.5;
  doc.setTextColor(90, 90, 90);
  doc.text(`Property : ${room}`, marginX + 12, subY);
  subY += 4;
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
  doc.setTextColor(80, 80, 80);
  doc.text('Sub Total', labelX, sumY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatAmount(subTotalNum), rightX, sumY, { align: 'right' });

  sumY += 6;
  doc.setTextColor(80, 80, 80);
  doc.text('VAT (19%)', labelX, sumY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatAmount(vatNum), rightX, sumY, { align: 'right' });

  sumY += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(labelX - 15, sumY, rightX, sumY);

  sumY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Total', labelX, sumY);
  doc.text(`€${formatAmount(selectedPrice)}`, rightX, sumY, { align: 'right' });

  sumY += 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(labelX - 15, sumY, rightX, sumY);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🟢 [จุดที่เพิ่มใหม่] ถ้ามีส่งตัวแปร otp มา ให้ส่งอีเมลรหัส OTP 6 หลักทันที
    if (body.otp) {
      const targetEmail = cleanText(body.email, '');
      if (!targetEmail) {
        return NextResponse.json({ success: false, error: 'Email is required for OTP' }, { status: 400 });
      }

      const otpHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 10px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; text-align: center;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 22px; font-weight: 800; color: #1E2B37;">Getaway Cleaning</span>
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">Verification Code</h2>
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Please use the following 6-digit code to complete your verification:</p>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: inline-block;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1E2B37;">${body.otp}</span>
            </div>

            <p style="font-size: 12px; color: #9ca3af;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        </body>
        </html>
      `;

      const otpEmailData = await resend.emails.send({
        from: 'Getaway Cleaning <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `[${body.otp}] Your Verification Code - Getaway Cleaning`,
        html: otpHtml,
      });

      return NextResponse.json({ success: true, message: 'OTP sent successfully', otpEmailData });
    }

    // 🔵 [ส่วนเดิม] ถ้าไม่มีตัวแปร otp จะทำกระบวนการสร้าง Sales Receipt PDF และส่งอีเมลยืนยันการชำระเงินปกติ
    const { 
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
    const validPaymentMethod = cleanText(paymentMethod, 'Bank Transfer / Card');
    const numAmount = parseFloat(String(amount || '').replace(/[^0-9.]/g, '') || '0.00');
    const formattedAmount = numAmount.toFixed(2);

    // 1. บันทึก / อัปเดต รายการจองลง Supabase
    const { error: dbError } = await supabaseServer
      .from('bookings')
      .upsert(
        [
          {
            user_id: userId || null,
            booking_ref: cleanRef,
            customer_name: validCustomerName,
            email: validEmail,
            phone: validPhone,
            location: validRoom,
            program: selectedProgram,
            scheduled_date: validDate,
            scheduled_time: validTime,
            amount: numAmount,
            payment_method: validPaymentMethod,
            payment_status: 'PAID',
            status: 'CONFIRMED',
            updated_at: new Date().toISOString()
          }
        ],
        { onConflict: 'booking_ref' }
      );

    if (dbError) {
      console.error('Failed to save/update booking in Supabase:', dbError);
    }

    // 2. สร้าง PDF ใบเสร็จรับเงิน
    const today = new Date();
    const receiptDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const receiptNo = `SR-${cleanRef.replace(/[^0-9]/g, '').slice(-5) || '00001'}`;

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

    // 3. ส่งอีเมลยืนยันการชำระเงิน + ใบเสร็จแนบไปให้ลูกค้า
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 40px 10px; margin: 0; color: #1f2937;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 36px;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #111827;">Getaway Cleaning</span>
          </div>

          <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">
            Payment Confirmed!
          </h1>
          <p style="font-size: 14px; color: #374151; line-height: 1.6;">
            Dear ${validCustomerName},<br>
            Your payment for booking <strong>${cleanRef}</strong> has been verified and confirmed by our team.
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="font-size: 13px; color: #6b7280;">Total Paid</div>
            <div style="font-size: 24px; font-weight: 800; color: #111827;">€${formattedAmount}</div>
            <div style="font-size: 13px; color: #4b5563; margin-top: 8px;">
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

    const emailData = await resend.emails.send({
      from: 'Getaway Cleaning <onboarding@resend.dev>',
      to: [validEmail],
      subject: `Payment Confirmed & Receipt [${cleanRef}] - Getaway Cleaning`,
      html: customerEmailHtml,
      attachments: [
        {
          filename: `Receipt-${cleanRef}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true, emailData });
  } catch (error: any) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}