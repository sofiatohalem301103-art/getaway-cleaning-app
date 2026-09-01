import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 1. ดึงค่า Data จาก Query String (รองรับทุก key ที่เป็นไปได้)
  const customerName = searchParams.get('customerName') || searchParams.get('name') || 'sofia tohalem';
  const program = searchParams.get('program') || searchParams.get('service') || 'Cleaning Service';
  const room = searchParams.get('room') || searchParams.get('roomName') || 'Beautiful Apartment in Harbour Paphos | Central';
  const price = searchParams.get('price') || searchParams.get('amount') || '90 €';
  const bookingRef = searchParams.get('bookingRef') || searchParams.get('ref') || searchParams.get('receiptNo') || 'REF-655827';

  // แยก Date และ Time
  let rawDate = searchParams.get('date') || searchParams.get('serviceDate') || '2026-09-02';
  let rawTime = searchParams.get('time') || searchParams.get('serviceTime') || '';

  if (rawDate.includes('(')) {
    const parts = rawDate.split('(');
    rawDate = parts[0].trim();
    if (!rawTime && parts[1]) {
      rawTime = parts[1].replace(')', '').trim();
    }
  }
  if (!rawTime) rawTime = '09:00 - 10:00';

  // ตรวจจับวิธีชำระเงิน (ตั้งค่าเริ่มต้นเป็น bank)
  const rawPaymentParam = (
    searchParams.get('paymentMethod') || 
    searchParams.get('payment_method') || 
    searchParams.get('payment') || 
    'bank'
  ).toLowerCase();

  let activeMethod: 'cash' | 'card' | 'bank' = 'bank';

  if (rawPaymentParam.includes('cash') || rawPaymentParam.includes('สด')) {
    activeMethod = 'cash';
  } else if (
    rawPaymentParam.includes('card') || 
    rawPaymentParam.includes('credit') || 
    rawPaymentParam.includes('debit') || 
    rawPaymentParam.includes('stripe')
  ) {
    activeMethod = 'card';
  } else {
    activeMethod = 'bank';
  }

  // 2. สร้างเอกสาร PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startX = 15;
  const contentWidth = 180;
  const rightX = startX + contentWidth;

  // Header
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt', startX, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('CONFIRMATION VOUCHER', startX, 27);

  // Logo (รองรับทั้ง .jpeg, .jpg และ .png)
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const possibleLogos = ['logo.jpeg', 'logo.jpg', 'logo.png'];
    let logoPath = '';
    
    for (const logoName of possibleLogos) {
      const fullPath = path.join(publicDir, logoName);
      if (fs.existsSync(fullPath)) {
        logoPath = fullPath;
        break;
      }
    }

    if (logoPath) {
      const logoBuffer = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).substring(1).toUpperCase();
      const format = ext === 'JPG' ? 'JPEG' : ext;
      const logoBase64 = `data:image/${ext.toLowerCase()};base64,${logoBuffer.toString('base64')}`;
      doc.addImage(logoBase64, format, rightX - 50, 10, 50, 20);
    }
  } catch (err) {
    console.error('Logo error:', err);
  }

  // Line Header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(startX, 32, rightX, 32);

  // Top Info Section
  let y = 39;
  const col1LabelX = startX;
  const col1ValX = startX + 32;
  const col2LabelX = startX + 115;
  const col2ValX = startX + 140;

  doc.setFontSize(8.5);

  // Row 1
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Name', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(customerName, col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No.', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(bookingRef, col2ValX, y);

  // Row 2
  y += 5.5;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Service Room', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  const splitRoom = doc.splitTextToSize(room, 75);
  doc.text(splitRoom, col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.text('Issued Date', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(rawDate, col2ValX, y);

  y += Math.max((splitRoom.length - 1) * 4.5, 0) + 5.5;

  // Row 3: Service Date
  doc.setTextColor(80, 80, 80);
  doc.text('Service Date', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(rawDate, col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.text('Status', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID / CONFIRMED', col2ValX, y);

  // Row 4: Service Time
  y += 5.5;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Service Time', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(rawTime, col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.text('Reference', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(bookingRef, col2ValX, y);

  // Row 5
  y += 5.5;
  doc.setTextColor(80, 80, 80);
  doc.text('Contact Support', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text('info@getaway-homes.com', col1ValX, y);

  // Divider Line
  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(startX, y, rightX, y);

  // Company Info
  y += 5.5;
  doc.setTextColor(80, 80, 80);
  doc.text('Issued By', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text('REALSOL CYPRUS LIMITED', col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.text('VAT No.', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text('CY10437383C', col2ValX, y);

  y += 5.5;
  doc.setTextColor(80, 80, 80);
  doc.text('Address', col1LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text('Neofytou Nikolaidis 61, Saint Theodoros, 8011 Paphos, Cyprus', col1ValX, y);

  doc.setTextColor(80, 80, 80);
  doc.text('Phone', col2LabelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text('+357 12 345 678', col2ValX, y);

  // Items Table Section
  y += 8;
  const tableStartY = y;

  // Header Table Background & Text
  doc.setFillColor(245, 245, 245);
  doc.rect(startX, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  doc.text('No.', startX + 4, y + 5);
  doc.text('Item Description', startX + 18, y + 5);
  doc.text('Qty', startX + 122, y + 5, { align: 'center' });
  doc.text('Unit Price', startX + 152, y + 5, { align: 'right' });
  doc.text('Amount', rightX - 4, y + 5, { align: 'right' });

  y += 7;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(startX, y, rightX, y);

  // Item 1
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('1', startX + 4, y);

  const itemDescText = `${program}: ${room}`;
  const splitItemDesc = doc.splitTextToSize(itemDescText, 95);
  doc.text(splitItemDesc, startX + 18, y);

  doc.text('1', startX + 122, y, { align: 'center' });
  doc.text(price, startX + 152, y, { align: 'right' });
  doc.text(price, rightX - 4, y, { align: 'right' });

  y += Math.max((splitItemDesc.length - 1) * 4.5, 0) + 6;

  // Item 2
  doc.text('2', startX + 4, y);
  doc.text('Service Charge & Mandatory Taxes', startX + 18, y);
  doc.text('1', startX + 122, y, { align: 'center' });
  doc.text('0.00 €', startX + 152, y, { align: 'right' });
  doc.text('0.00 €', rightX - 4, y, { align: 'right' });

  y += 10;

  // Remarks & Summary Line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(startX, y, rightX, y);

  const summaryStartY = y;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Remarks', startX + 4, summaryStartY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Thank you for choosing Getaway Cleaning.', startX + 4, summaryStartY + 10.5);
  doc.text('Present this receipt upon service.', startX + 4, summaryStartY + 14.5);

  let subtotalY = summaryStartY + 5.5;
  const labelX = startX + 152;

  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', labelX, subtotalY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text(price, rightX - 4, subtotalY, { align: 'right' });

  subtotalY += 4.5;
  doc.setTextColor(100, 100, 100);
  doc.text('VAT Inclusive', labelX, subtotalY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text('0.00 €', rightX - 4, subtotalY, { align: 'right' });

  subtotalY += 4.5;
  doc.setTextColor(100, 100, 100);
  doc.text('Discount', labelX, subtotalY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text('0.00 €', rightX - 4, subtotalY, { align: 'right' });

  y = summaryStartY + 20;

  // Total Amount Paid Banner
  doc.setFillColor(238, 238, 238);
  doc.rect(startX, y, contentWidth, 9, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(startX, y, rightX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Total Amount Paid', startX + 4, y + 6);
  doc.setFontSize(11);
  doc.text(price, rightX - 4, y + 6, { align: 'right' });

  y += 9;

  // Border Box สำหรับตาราง
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(startX, tableStartY, contentWidth, y - tableStartY);

  // Payment Method & Terms Section
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Method', startX, y);

  let radioY = y + 5.5;
  const methods = [
    { key: 'cash', label: 'Cash' },
    { key: 'card', label: 'Credit / Debit Card' },
    { key: 'bank', label: 'Bank Transfer' },
  ];

  doc.setFontSize(8.5);
  methods.forEach((item) => {
    const isSelected = item.key === activeMethod;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.circle(startX + 2, radioY - 1, 1.6, 'S');

    if (isSelected) {
      doc.setFillColor(0, 0, 0);
      doc.circle(startX + 2, radioY - 1, 0.8, 'F');
    }

    doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(item.label, startX + 6, radioY);
    radioY += 5;
  });

  // Terms & Notes
  const termsX = startX + 90;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Notes', termsX, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('• This receipt confirms payment completion for your service.', termsX, y + 5.5);
  doc.text('• Non-refundable policy applies as per terms of service.', termsX, y + 10);

  // Bottom Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(startX, y + 22, rightX, y + 22);

  // 3. แปลงเป็น Buffer และส่งตอบกลับ
  const pdfOutput = doc.output('arraybuffer');
  const buffer = Buffer.from(pdfOutput);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt_${bookingRef}.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}