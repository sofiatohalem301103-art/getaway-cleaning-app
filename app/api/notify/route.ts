import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// เรียกใช้งาน Resend SDK ผ่าน API Key จาก env
const resend = new Resend(process.env.RESEND_API_KEY);

// ----------------------------------------------------------------------
// 1. PDF Generation Function (ฟังก์ชันสร้างใบเสร็จ PDF)
// ----------------------------------------------------------------------
async function generateVoucherPDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Colors
    const COLOR_BLACK = '#000000';
    const COLOR_TEXT_DARK = '#1A1A1A';
    const COLOR_TEXT_MUTED = '#555555';
    const COLOR_BORDER = '#CCCCCC';
    const COLOR_BG_HEADER = '#F2F2F2';

    // Header Section
    doc.y = 30;
    doc.fillColor(COLOR_BLACK).fontSize(20).font('Helvetica-Bold').text('Receipt', 30, 30);
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(8.5).font('Helvetica').text('CONFIRMATION VOUCHER', 30, 54);

    // Header Logo Right
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpeg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 370, 20, { fit: [180, 50], align: 'right' });
      } else {
        doc.fillColor(COLOR_BLACK).fontSize(14).font('Helvetica-Bold').text('Getaway Cleaning', 380, 30, { align: 'right', width: 185 });
      }
    } catch (e) {
      doc.fillColor(COLOR_BLACK).fontSize(14).font('Helvetica-Bold').text('Getaway Cleaning', 380, 30, { align: 'right', width: 185 });
    }

    doc.moveTo(30, 75).lineTo(565, 75).strokeColor(COLOR_BLACK).lineWidth(1).stroke();

    // Info Section
    let currentY = 88;

    // Customer Name
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(8).font('Helvetica').text('Customer Name', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica-Bold').text(data.customerName || 'Valued Customer', 115, currentY);

    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Receipt No.', 360, currentY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica-Bold').text(data.bookingRef || data.refNumber || 'REF-487879', 425, currentY);
    currentY += 18;

    // Customer Phone (เพิ่มเบอร์โทรตรงนี้)
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Contact Phone', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').text(data.phone || '-', 115, currentY);

    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Issued Date', 360, currentY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').text(data.date || new Date().toISOString().split('T')[0], 425, currentY);
    currentY += 18;

    // Service Room
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Service Room', 30, currentY);
    const roomTextY = currentY;
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').text(data.room || 'Cleaning Service | Standard Package', 115, currentY, { width: 220 });

    doc.fillColor(COLOR_TEXT_MUTED).text('Status', 360, roomTextY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica-Bold').text('PAID / CONFIRMED', 425, roomTextY);

    const roomHeight = doc.heightOfString(data.room || 'Cleaning Service | Standard Package', { width: 220 });
    currentY += Math.max(18, roomHeight + 4);

    // Service Date
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Service Date', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text(`${data.date || '-'} (${data.time || '-'})`, 115, currentY);

    doc.fillColor(COLOR_TEXT_MUTED).text('Reference', 360, currentY);
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').text(data.bookingRef || data.refNumber || 'CONFIRMED', 425, currentY);
    currentY += 18;

    // Support Email
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').text('Support Email', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text('getawaycleaning.paphos@gmail.com', 115, currentY);
    currentY += 24;

    doc.moveTo(30, currentY).lineTo(565, currentY).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
    currentY += 10;

    // Issuer Info Block
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(8).font('Helvetica').text('Issued By', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text('REALSOL CYPRUS LIMITED', 115, currentY);

    doc.fillColor(COLOR_TEXT_MUTED).text('VAT No.', 360, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text('CY10437383C', 425, currentY);
    currentY += 16;

    doc.fillColor(COLOR_TEXT_MUTED).text('Address', 30, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text('Neofytou Nikolaidis 61, Saint Theodoros, 8011 Paphos, Cyprus', 115, currentY, { width: 220 });

    doc.fillColor(COLOR_TEXT_MUTED).text('Phone', 360, currentY);
    doc.fillColor(COLOR_TEXT_DARK).text('+357 12 345 678', 425, currentY);
    currentY += 28;

    // Table Section
    const tableTop = currentY;
    const tableLeft = 30;
    const tableWidth = 535;
    const tableHeight = 185;

    doc.rect(tableLeft + 1, tableTop + 1, tableWidth - 2, 20).fill(COLOR_BG_HEADER);
    doc.moveTo(tableLeft, tableTop + 21).lineTo(tableLeft + tableWidth, tableTop + 21).strokeColor(COLOR_BLACK).lineWidth(0.8).stroke();

    doc.fillColor(COLOR_BLACK).fontSize(8).font('Helvetica-Bold');
    doc.text('No.', 40, tableTop + 6);
    doc.text('Item Description', 85, tableTop + 6);
    doc.text('Qty', 370, tableTop + 6, { width: 35, align: 'center' });
    doc.text('Unit Price', 420, tableTop + 6, { width: 60, align: 'right' });
    doc.text('Amount', 490, tableTop + 6, { width: 65, align: 'right' });

    const items = [
      { id: '1', name: `Cleaning Service: ${data.room || 'Standard Package'}`, qty: '1', price: `${data.amount || '0.00'} €`, total: `${data.amount || '0.00'} €` },
      { id: '2', name: 'Service Charge & Mandatory Taxes', qty: '1', price: '0.00 €', total: '0.00 €' }
    ];

    let rowY = tableTop + 28;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR_TEXT_DARK);

    items.forEach((item) => {
      doc.text(item.id, 40, rowY);
      doc.text(item.name, 85, rowY, { width: 270 });
      doc.text(item.qty, 370, rowY, { width: 35, align: 'center' });
      doc.text(item.price, 420, rowY, { width: 60, align: 'right' });
      doc.text(item.total, 490, rowY, { width: 65, align: 'right' });
      rowY += 18;
    });

    const summaryDividerY = tableTop + 105;
    doc.moveTo(tableLeft, summaryDividerY).lineTo(tableLeft + tableWidth, summaryDividerY).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

    // Summary Section
    const summaryY = summaryDividerY + 8;
    const sumLabelX = 370;
    const sumValX = 490;

    doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(8).text('Remarks', 40, summaryY);
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').fontSize(7.5)
       .text('Thank you for choosing Getaway Cleaning. Present this receipt upon service.', 40, summaryY + 12, { width: 260 });

    doc.fillColor(COLOR_TEXT_MUTED).fontSize(8).font('Helvetica');
    doc.text('Subtotal', sumLabelX, summaryY);
    doc.text('VAT Inclusive', sumLabelX, summaryY + 12);
    doc.text('Discount', sumLabelX, summaryY + 24);

    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica');
    doc.text(`${data.amount || '0.00'} €`, sumValX, summaryY, { width: 65, align: 'right' });
    doc.text('0.00 €', sumValX, summaryY + 12, { width: 65, align: 'right' });
    doc.text('0.00 €', sumValX, summaryY + 24, { width: 65, align: 'right' });

    const grandTotalY = tableTop + 158;
    doc.save();
    doc.roundedRect(tableLeft + 1, grandTotalY, tableWidth - 2, 26, 0).fill('#E5E5E5');
    doc.restore();

    doc.fillColor(COLOR_BLACK).fontSize(8.5).font('Helvetica-Bold');
    doc.text('Total Amount Paid', 40, grandTotalY + 8);
    doc.fontSize(9.5).text(`${data.amount || '0.00'} €`, sumValX, grandTotalY + 7, { width: 65, align: 'right' });

    doc.roundedRect(tableLeft, tableTop, tableWidth, tableHeight, 4).strokeColor(COLOR_BLACK).lineWidth(1).stroke();

    // Footer Terms
    const bottomY = tableTop + tableHeight + 16;
    doc.fillColor(COLOR_BLACK).fontSize(8.5).font('Helvetica-Bold').text('Terms & Notes', 30, bottomY);
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(7.5).font('Helvetica')
       .text('• This receipt confirms payment completion for your service.\n• Non-refundable policy applies as per terms of service.', 30, bottomY + 14, { width: 535, lineGap: 3 });

    doc.moveTo(30, bottomY + 45).lineTo(565, bottomY + 45).strokeColor(COLOR_BLACK).lineWidth(1).stroke();

    doc.end();
  });
}

// ----------------------------------------------------------------------
// 2. Main API Handler (POST)
// ----------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    if (!rawText || rawText.trim() === '') {
      return NextResponse.json({ error: 'Empty request body received' }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch (pErr) {
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }

    // ดึงและแปลงค่าข้อมูลลูกค้า
    const recipientEmail = body.email || body.to;
    const customerName = body.customerName || body.name || 'Valued Customer';
    const phone = body.phone || body.mobile || body.phoneNumber || '-';
    const room = body.room || body.location || 'Cleaning Package';
    const date = body.date || '-';
    const time = body.time || '-';
    const amount = body.amount || body.price || '0';
    const paymentMethod = body.paymentMethod || 'Credit/Debit Card';
    const refNumber = body.bookingRef || body.refNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfBase64 = body.pdfBase64;
    const otpCode = body.otp || body.code || amount;

    // ตรวจสอบ Resend API Key
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY missing in environment variables.' },
        { status: 500 }
      );
    }

    // ตรวจสอบว่าเป็น OTP Request หรือไม่
    const isOtpRequest = 
      paymentMethod === 'Email OTP Service' || 
      paymentMethod === 'Verification System' || 
      room === 'OTP Verification';

    // Template อีเมล OTP
    const otpHtml = `
      <div style="font-family: Arial, sans-serif; padding: 32px 24px; border: 1px solid #1a1a1a; border-radius: 12px; max-width: 480px; margin: 0 auto; background-color: #ffffff; text-align: center;">
        <h2 style="color: #000000; margin-top: 0; font-size: 22px;">🔐 Getaway Cleaning Verification Code</h2>
        <p style="color: #444444; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          Please use the verification code below to complete your request.
        </p>
        <div style="background-color: #f4f4f4; padding: 18px; text-align: center; font-size: 32px; font-weight: bold; color: #000000; border-radius: 8px; border: 1px solid #000000; letter-spacing: 6px; margin-bottom: 20px;">
          ${otpCode}
        </div>
        <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0 0 16px 0;">
          This code will expire in 10 minutes. Do not share this code with anyone.
        </p>
        <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; color: #888888; font-size: 11px;">
          If you did not request this code, please ignore this email.<br />
          © Getaway Cleaning. All rights reserved.
        </div>
      </div>
    `;

    // Template อีเมลส่งใบเสร็จ (แสดง Customer Name และ Phone)
    const voucherHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 2px solid #000000; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px dashed #cccccc; padding-bottom: 16px;">
          <h1 style="color: #000000; margin: 0; font-size: 24px;">🧹 GETAWAY CLEANING</h1>
          <p style="color: #333333; font-weight: bold; font-size: 15px; margin: 4px 0 0 0; letter-spacing: 0.5px;">PAYMENT RECEIPT & VOUCHER</p>
        </div>
        
        <div style="margin: 20px 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your payment for booking reference <strong>${refNumber}</strong> has been confirmed by our team.</p>
          
          <div style="background-color: #f9f9f9; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #000000; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">Booking Details:</p>
            <p style="margin: 4px 0 0 0;">• Customer Name: ${customerName}</p>
            <p style="margin: 2px 0 0 0;">• Phone: ${phone}</p>
            <p style="margin: 2px 0 0 0;">• Service: ${room}</p>
            <p style="margin: 2px 0 0 0;">• Date / Time: ${date} (${time})</p>
            <p style="margin: 2px 0 0 0;">• Paid Amount: ${amount} €</p>
          </div>

          <p>📎 <strong>Your Official Payment Receipt PDF is attached to this email.</strong></p>
        </div>

        <div style="border-top: 1px solid #cccccc; margin-top: 24px; padding-top: 16px; text-align: center; color: #555555; font-size: 11px; line-height: 1.5;">
          <strong style="color: #000000;">REALSOL CYPRUS LIMITED</strong><br />
          VAT No.: CY10437383C<br />
          Office Address: Neofytou Nikolaidis 61, Saint Theodoros, 8011 Paphos, Cyprus<br />
          Contact: getawaycleaning.paphos@gmail.com | +357 12 345 678
        </div>
      </div>
    `;

    // ----------------------------------------------------------------------
    // 3. Logic ส่งอีเมลผ่าน Resend
    // ----------------------------------------------------------------------
    if (isOtpRequest) {
      if (!recipientEmail) {
        return NextResponse.json({ error: 'Customer email is required for OTP request' }, { status: 400 });
      }

      const data = await resend.emails.send({
        from: 'Getaway Cleaning <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `[${otpCode}] is your OTP verification code - Getaway Cleaning`,
        html: otpHtml,
      });

      return NextResponse.json({ success: true, message: 'OTP sent to customer', data });

    } else {
      if (!recipientEmail) {
        return NextResponse.json({ error: 'Customer email is required to send receipt' }, { status: 400 });
      }

      let pdfBuffer: Buffer;
      if (pdfBase64) {
        pdfBuffer = Buffer.from(pdfBase64, 'base64');
      } else {
        pdfBuffer = await generateVoucherPDF({ 
          customerName, 
          phone,
          room, 
          date, 
          time, 
          amount, 
          paymentMethod,
          bookingRef: refNumber
        });
      }

      const data = await resend.emails.send({
        from: 'Getaway Cleaning <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `🧾 Official Receipt & Voucher [${refNumber}] - Getaway Cleaning`,
        html: voucherHtml,
        attachments: [
          {
            filename: `Getaway_Cleaning_Receipt_${refNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      return NextResponse.json({ success: true, message: 'Receipt sent to customer', data });
    }

  } catch (error: any) {
    console.error('Notify API Catch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}