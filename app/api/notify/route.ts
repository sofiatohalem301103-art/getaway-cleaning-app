import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// ----------------------------------------------------------------------
// PDF Generation Function
// ----------------------------------------------------------------------
async function generateVoucherPDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Black & White Palette
    const COLOR_BLACK = '#000000';
    const COLOR_TEXT_DARK = '#1A1A1A';
    const COLOR_TEXT_MUTED = '#555555';
    const COLOR_BORDER = '#CCCCCC';
    const COLOR_BG_HEADER = '#F2F2F2';

    // 1. Header Section
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

    // 2. Info Grid
    const infoY = 85;

    // Left Column: Customer
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(7.5).font('Helvetica');
    doc.text('Customer Name', 30, infoY);
    doc.text('Address', 30, infoY + 11);
    doc.text('Tax ID', 30, infoY + 22);
    doc.text('Contact', 30, infoY + 33);

    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica-Bold');
    doc.text(data.customerName || 'Sofia Ross', 110, infoY);
    doc.font('Helvetica');
    doc.text(data.room || 'Cleaning Service | Standard Package', 110, infoY + 11, { width: 180 });
    doc.text('CY10437383C', 110, infoY + 22);
    doc.text('Getaway Support', 110, infoY + 33);

    // Right Column: Metadata
    const rightX = 360;
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(7.5).font('Helvetica');
    doc.text('Receipt No.', rightX, infoY);
    doc.text('Date', rightX, infoY + 11);
    doc.text('Due Date', rightX, infoY + 22);
    doc.text('Reference', rightX, infoY + 33);

    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica-Bold');
    doc.text(data.refNumber || 'REF-487879', rightX + 60, infoY);
    doc.font('Helvetica');
    doc.text(data.date || '2026-08-26', rightX + 60, infoY + 11);
    doc.text(data.date || '2026-08-26', rightX + 60, infoY + 22);
    doc.text('CONFIRMED', rightX + 60, infoY + 33);

    doc.moveTo(30, infoY + 48).lineTo(565, infoY + 48).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

    // Issuer Info Block
    const companyY = infoY + 54;
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(7.5).font('Helvetica');
    doc.text('Issued By', 30, companyY);
    doc.text('Address', 30, companyY + 11);

    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica');
    doc.text('REALSOL CYPRUS LIMITED', 110, companyY);
    doc.text('Neofytou Nikolaidis 61, Saint Theodoros, 8011 Paphos, Cyprus', 110, companyY + 11, { width: 220 });

    doc.fillColor(COLOR_TEXT_MUTED);
    doc.text('Tax ID', rightX, companyY);
    doc.text('Phone', rightX, companyY + 11);

    doc.fillColor(COLOR_TEXT_DARK);
    doc.text('1234567890', rightX + 60, companyY);
    doc.text('+357 12 345 678', rightX + 60, companyY + 11);

    // 3. Itemized Table
    const tableTop = companyY + 30;
    const tableLeft = 30;
    const tableWidth = 535;
    const tableHeight = 170;

    doc.rect(tableLeft + 1, tableTop + 1, tableWidth - 2, 18).fill(COLOR_BG_HEADER);
    doc.moveTo(tableLeft, tableTop + 19).lineTo(tableLeft + tableWidth, tableTop + 19).strokeColor(COLOR_BLACK).lineWidth(0.8).stroke();

    doc.fillColor(COLOR_BLACK).fontSize(8).font('Helvetica-Bold');
    doc.text('No.', 40, tableTop + 5);
    doc.text('Item Description', 85, tableTop + 5);
    doc.text('Qty', 370, tableTop + 5, { width: 35, align: 'center' });
    doc.text('Unit Price', 420, tableTop + 5, { width: 60, align: 'right' });
    doc.text('Amount', 490, tableTop + 5, { width: 65, align: 'right' });

    const items = [
      { id: '1', name: `Service: ${data.room || 'Cleaning Service | Standard Package'}`, qty: '1', price: `${data.amount || '90.00'} €`, total: `${data.amount || '90.00'} €` },
      { id: '2', name: 'Service Charge & Mandatory Taxes', qty: '1', price: '0.00 €', total: '0.00 €' }
    ];

    let rowY = tableTop + 25;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR_TEXT_DARK);

    items.forEach((item) => {
      doc.text(item.id, 40, rowY);
      doc.text(item.name, 85, rowY, { width: 270 });
      doc.text(item.qty, 370, rowY, { width: 35, align: 'center' });
      doc.text(item.price, 420, rowY, { width: 60, align: 'right' });
      doc.text(item.total, 490, rowY, { width: 65, align: 'right' });
      rowY += 16;
    });

    const summaryDividerY = tableTop + 115;
    doc.moveTo(tableLeft, summaryDividerY).lineTo(tableLeft + tableWidth, summaryDividerY).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

    // 4. Summary Section
    const summaryY = summaryDividerY + 6;
    const sumLabelX = 370;
    const sumValX = 490;

    doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(8).text('Remarks', 40, summaryY);
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').fontSize(7.5)
       .text('Thank you for choosing Getaway Cleaning. Present this receipt upon service.', 40, summaryY + 10, { width: 260 });

    doc.fillColor(COLOR_TEXT_MUTED).fontSize(8).font('Helvetica');
    doc.text('Subtotal', sumLabelX, summaryY);
    doc.text('VAT (7%)', sumLabelX, summaryY + 10);
    doc.text('Discount', sumLabelX, summaryY + 20);

    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica');
    doc.text(`${data.amount || '90.00'} €`, sumValX, summaryY, { width: 65, align: 'right' });
    doc.text('0.00 €', sumValX, summaryY + 10, { width: 65, align: 'right' });
    doc.text('0.00 €', sumValX, summaryY + 20, { width: 65, align: 'right' });

    const grandTotalY = summaryY + 31;
    doc.save();
    doc.roundedRect(tableLeft + 1, grandTotalY, tableWidth - 2, 170 - (grandTotalY - tableTop) - 1, 3).fill('#E5E5E5');
    doc.restore();

    doc.fillColor(COLOR_BLACK).fontSize(8.5).font('Helvetica-Bold');
    doc.text('Total Amount Paid', 40, grandTotalY + 5);
    doc.fontSize(9.5).text(`${data.amount || '90.00'} €`, sumValX, grandTotalY + 4, { width: 65, align: 'right' });

    doc.roundedRect(tableLeft, tableTop, tableWidth, tableHeight, 4).strokeColor(COLOR_BLACK).lineWidth(1).stroke();

    // 5. Payment Method Section
    const bottomY = tableTop + 185;
    const rawMethod = String(data.paymentMethod || '').toLowerCase();

    let isBank = rawMethod.includes('bank') || rawMethod.includes('transfer') || rawMethod.includes('โอน') || rawMethod.includes('promptpay') || rawMethod.includes('qr') || rawMethod.includes('scb') || rawMethod.includes('kbank') || rawMethod.includes('bbl');
    let isCash = rawMethod.includes('cash') || rawMethod.includes('เงินสด');
    let isCard = rawMethod.includes('card') || rawMethod.includes('credit') || rawMethod.includes('debit') || rawMethod.includes('stripe') || rawMethod.includes('visa') || rawMethod.includes('mastercard');

    if (!isBank && !isCash && !isCard) {
      isBank = true;
    }

    doc.fillColor(COLOR_BLACK).fontSize(8.5).font('Helvetica-Bold').text('Payment Method', 30, bottomY);

    // Option 1: Cash
    doc.circle(35, bottomY + 15, 3.5).strokeColor(COLOR_BLACK).lineWidth(1).stroke();
    if (isCash) doc.circle(35, bottomY + 15, 2).fill(COLOR_BLACK);
    doc.fillColor(COLOR_TEXT_DARK).fontSize(7.5).font('Helvetica').text('Cash', 44, bottomY + 11);

    // Option 2: Credit / Debit Card
    doc.circle(35, bottomY + 27, 3.5).strokeColor(COLOR_BLACK).lineWidth(1).stroke();
    if (isCard) doc.circle(35, bottomY + 27, 2).fill(COLOR_BLACK);
    doc.fillColor(COLOR_TEXT_DARK).fontSize(7.5).font('Helvetica').text('Credit / Debit Card', 44, bottomY + 23);

    // Option 3: Bank Transfer
    doc.circle(35, bottomY + 39, 3.5).strokeColor(COLOR_BLACK).lineWidth(1).stroke();
    if (isBank) doc.circle(35, bottomY + 39, 2).fill(COLOR_BLACK);
    doc.fillColor(COLOR_TEXT_DARK).fontSize(7.5).font('Helvetica').text('Bank Transfer', 44, bottomY + 35);

    // Notes Column
    doc.fillColor(COLOR_BLACK).fontSize(8.5).font('Helvetica-Bold').text('Terms & Notes', 200, bottomY);
    doc.fillColor(COLOR_TEXT_MUTED).fontSize(7).font('Helvetica')
       .text('• This receipt confirms payment completion for your service.\n• Non-refundable policy applies as per terms of service.', 200, bottomY + 12, { width: 365 });

    doc.moveTo(30, bottomY + 55).lineTo(565, bottomY + 55).strokeColor(COLOR_BLACK).lineWidth(1).stroke();

    doc.end();
  });
}

// ----------------------------------------------------------------------
// Main API Handler (POST)
// ----------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, customerName, room, date, time, amount, paymentMethod, refNumber } = body;

    // 1. กำหนด Email ผู้ส่ง (Gmail) และ Email แอดมิน
    const gmailUser = process.env.GMAIL_USER || 'sofiatohalem301103@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = 'info@getaway-homes.com'; // อีเมลของแอดมิน

    if (!gmailPass) {
      console.error('GMAIL_APP_PASSWORD is missing in .env.local file');
      return NextResponse.json(
        { error: 'GMAIL_APP_PASSWORD is missing in environment variables. Please check .env.local file and restart server.' },
        { status: 500 }
      );
    }

    // 2. ตั้งค่า Nodemailer SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const isOtpRequest = 
      paymentMethod === 'Email OTP Service' || 
      paymentMethod === 'Verification System' || 
      room === 'OTP Verification';

    // 3. กำหนดรายชื่อผู้รับ (แยกเคส OTP กับ ใบเสร็จ)
    let recipients: string[] = [];

    if (isOtpRequest) {
      // ✅ เคสที่ 1: OTP -> ส่งหาผู้ใช้คนเดียวเท่านั้น (ไม่ส่งหาแอดมิน)
      if (to) recipients.push(to);
    } else {
      // ✅ เคสที่ 2: ใบเสร็จการจอง -> ส่งหาทั้งแอดมิน (info@getaway-homes.com) และลูกค้า
      recipients.push(adminEmail);
      if (to && to !== adminEmail) {
        recipients.push(to);
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipient email specified' }, { status: 400 });
    }

    // HTML Email Templates
    const otpHtml = `
      <div style="font-family: Arial, sans-serif; padding: 32px 24px; border: 1px solid #1a1a1a; border-radius: 12px; max-width: 480px; margin: 0 auto; background-color: #ffffff; text-align: center;">
        <h2 style="color: #000000; margin-top: 0; font-size: 22px;">🔐 Getaway Cleaning Verification Code</h2>
        <p style="color: #444444; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          Please use the verification code below to complete your request.
        </p>
        <div style="background-color: #f4f4f4; padding: 18px; text-align: center; font-size: 32px; font-weight: bold; color: #000000; border-radius: 8px; border: 1px solid #000000; letter-spacing: 6px; margin-bottom: 20px;">
          ${amount}
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

    const voucherHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 2px solid #000000; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px dashed #cccccc; padding-bottom: 16px;">
          <h1 style="color: #000000; margin: 0; font-size: 24px;">🧹 GETAWAY CLEANING</h1>
          <p style="color: #333333; font-weight: bold; font-size: 15px; margin: 4px 0 0 0; letter-spacing: 0.5px;">PAYMENT RECEIPT & VOUCHER</p>
        </div>
        
        <div style="margin: 20px 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
          <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
          <p>Your payment for booking reference <strong>${refNumber || 'REF-487879'}</strong> has been successfully processed.</p>
          
          <div style="background-color: #f9f9f9; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #000000; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">Booking Details:</p>
            <p style="margin: 4px 0 0 0;">• Service: ${room || 'Cleaning Package'}</p>
            <p style="margin: 2px 0 0 0;">• Date / Time: ${date || '-'} (${time || '-'})</p>
            <p style="margin: 2px 0 0 0;">• Paid Amount: ${amount || '0'} €</p>
            <p style="margin: 2px 0 0 0;">• Payment Method: ${paymentMethod || 'Card'}</p>
          </div>

          <p>📎 <strong>We have attached your Payment Receipt PDF to this email.</strong></p>
        </div>

        <div style="border-top: 1px solid #cccccc; margin-top: 24px; padding-top: 16px; text-align: center; color: #555555; font-size: 11px; line-height: 1.5;">
          <strong style="color: #000000;">REALSOL CYPRUS LIMITED</strong><br />
          VAT No.: CY10437383C<br />
          Office Address: Neofytou Nikolaidis 61, Saint Theodoros, 8011 Paphos, Cyprus<br />
          Contact: info@getaway-homes.com | +357 12 345 678
        </div>
      </div>
    `;

    let subject = 'Official Receipt & Voucher - Getaway Cleaning';
    let htmlContent = voucherHtml;
    let attachments: any[] = [];

    if (isOtpRequest) {
      subject = `[${amount}] is your OTP verification code - Getaway Cleaning`;
      htmlContent = otpHtml;
    } else {
      subject = `🔔 [New Booking] Receipt & Voucher [${refNumber || 'REF-487879'}] - ${customerName || 'Customer'}`;
      
      const pdfBuffer = await generateVoucherPDF({ 
        customerName: customerName || 'Sofia Ross', 
        room, 
        date, 
        time, 
        amount, 
        paymentMethod,
        refNumber
      });
      
      attachments.push({
        filename: `Getaway_Cleaning_Receipt_${refNumber || 'Confirmed'}.pdf`,
        content: pdfBuffer,
      });
    }

    // 4. สั่งส่งอีเมลหาผู้รับตามที่กำหนดไว้
    const info = await transporter.sendMail({
      from: `"Getaway Cleaning" <${gmailUser}>`,
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent,
      attachments: attachments,
    });

    return NextResponse.json({ success: true, data: info });
  } catch (error: any) {
    console.error('Notify API Catch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}