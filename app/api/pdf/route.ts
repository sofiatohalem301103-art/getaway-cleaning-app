import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ----------------------------------------------------
// Helper: ฟังก์ชั่นดึงค่า Text ที่ปลอดภัย (กันคำว่า "undefined" และ "null")
// ----------------------------------------------------
function getSafeParam(paramValue: string | null, defaultValue: string): string {
  if (
    !paramValue || 
    paramValue.trim() === '' || 
    paramValue.trim().toLowerCase() === 'undefined' || 
    paramValue.trim().toLowerCase() === 'null'
  ) {
    return defaultValue;
  }
  return paramValue.trim();
}

// ----------------------------------------------------
// Helper: ฟังก์ชั่นจัดรูปแบบวันที่ให้อ่านง่าย
// ----------------------------------------------------
function parseAndFormatDate(inputDate: string | null): string {
  const clean = getSafeParam(inputDate, '');
  if (!clean) {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  let cleanDateStr = clean;
  if (cleanDateStr.includes('(')) {
    cleanDateStr = cleanDateStr.split('(')[0].trim();
  }

  const parsedDate = new Date(cleanDateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return cleanDateStr;
}

// ----------------------------------------------------
// Helper: ฟังก์ชั่นสกัดและจัดรูปแบบเวลา
// ----------------------------------------------------
function parseAndFormatTime(inputTime: string | null, rawDateParam: string | null): string {
  let timeStr = getSafeParam(inputTime, '');

  if (!timeStr && rawDateParam && rawDateParam.includes('(')) {
    const parts = rawDateParam.split('(');
    if (parts[1]) {
      timeStr = parts[1].replace(')', '').trim();
    }
  }

  if (timeStr) {
    let cleanTime = timeStr.trim();

    if (/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) {
      cleanTime = cleanTime.substring(0, 5);
    }

    cleanTime = cleanTime.replace('.', ':');

    if (!cleanTime.toLowerCase().includes('hrs') && 
        !cleanTime.toLowerCase().includes('am') && 
        !cleanTime.toLowerCase().includes('pm')) {
      cleanTime += ' hrs';
    }

    return cleanTime;
  }

  return 'Not Specified';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ----------------------------------------------------
  // 1. วันที่ออกใบเสร็จ (Receipt Date) Real-time
  // ----------------------------------------------------
  const today = new Date();
  const realTimeReceiptDate = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // ----------------------------------------------------
  // 2. ดึงข้อมูลจาก Query Parameters พร้อมความปลอดภัยระดับสูง
  // ----------------------------------------------------
  const customerName = getSafeParam(
    searchParams.get('customerName') || searchParams.get('name'), 
    'Getaway Homes'
  );

  // ✅ จุดสำคัญ: ดักจับทั้ง program, service, serviceName, title และเช็กไม่ให้เป็น 'undefined'
  const rawProgram = searchParams.get('program') || 
                     searchParams.get('service') || 
                     searchParams.get('serviceName') || 
                     searchParams.get('title');
  const program = getSafeParam(rawProgram, 'Cleaning Service');

  const room = getSafeParam(
    searchParams.get('room') || searchParams.get('roomName') || searchParams.get('property'), 
    '-'
  );

  // Running Number สำหรับ Sales Receipt#
  let rawReceiptNo = searchParams.get('receiptNo') || searchParams.get('bookingRef') || searchParams.get('ref');
  let receiptNo = getSafeParam(rawReceiptNo, '');

  if (!receiptNo) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    receiptNo = `SR-${randomSuffix}`;
  } else if (!receiptNo.startsWith('SR-') && !receiptNo.startsWith('REF-')) {
    const numOnly = receiptNo.replace(/[^0-9]/g, '');
    if (numOnly) {
      receiptNo = `SR-${numOnly.padStart(5, '0')}`;
    }
  }

  const paymentMode = getSafeParam(
    searchParams.get('paymentMode') || searchParams.get('paymentMethod') || searchParams.get('payment'), 
    'Credit / Debit Card'
  );

  const receiptDate = getSafeParam(searchParams.get('receiptDate'), realTimeReceiptDate);

  const rawDateParam = searchParams.get('date') || searchParams.get('serviceDate') || searchParams.get('bookingDate') || searchParams.get('selectedDate');
  const rawTimeParam = searchParams.get('time') || searchParams.get('serviceTime') || searchParams.get('bookingTime') || searchParams.get('selectedTime');

  const rawDate = parseAndFormatDate(rawDateParam);
  const rawTime = parseAndFormatTime(rawTimeParam, rawDateParam);

  // ----------------------------------------------------
  // 3. การคำนวณราคา Net, VAT 19% และ Total
  // ----------------------------------------------------
  const rawPriceParam = searchParams.get('price') || searchParams.get('amount') || '50.00';
  const cleanPriceStr = rawPriceParam.replace(/[^0-9.]/g, '');
  const selectedPrice = parseFloat(cleanPriceStr) || 50.00;

  const hoursParam = searchParams.get('hours') || searchParams.get('duration');

  const totalNum = selectedPrice;
  const subTotalNum = totalNum / 1.19;
  const vatNum = totalNum - subTotalNum;

  const formatAmount = (num: number) => num.toFixed(2);

  // ----------------------------------------------------
  // 4. สร้างเอกสาร PDF
  // ----------------------------------------------------
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginX = 15;
  const pageWidth = 210;
  const rightX = pageWidth - marginX;

  // --- HEADER: ข้อมูลบริษัท ---
  let leftY = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('GETAWAY CLEANING LTD', marginX, leftY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);

  leftY += 4.5;
  doc.text('HE 495919', marginX, leftY);
  leftY += 4;
  doc.text('TAX No. 60385711Z', marginX, leftY);
  leftY += 4;
  doc.text('Neofytou Nikolaidis 61, Paphos', marginX, leftY);
  leftY += 4;
  doc.text('Paphos, 8011, Cyprus.', marginX, leftY);
  leftY += 4;
  doc.text('+357 96330400', marginX, leftY);
  leftY += 4;
  doc.text('info@getaway-cleaning.com', marginX, leftY);

  // --- HEADER: LOGO ---
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
      doc.addImage(logoBase64, format, rightX - 60, 18, 60, 24);
    }
  } catch (err) {
    console.error('Logo error:', err);
  }

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, 48, rightX, 48);

  // --- SALES RECEIPT INFO ---
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

  // --- BILL TO & RECEIPT DATE ---
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

  // --- TABLE HEADER ---
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

  // --- TABLE BODY ---
  let itemY = headerBottomY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  doc.text('1', marginX + 3, itemY);
  
  // ✅ บรรทัดนี้จะแสดงชื่อโปรแกรม/บริการอย่างถูกต้อง ไม่ว่างเปล่า ไม่เป็น - และไม่เป็น undefined แน่นอน
  doc.text(program, marginX + 12, itemY);

  let subY = itemY + 4.5;
  doc.setTextColor(90, 90, 90);
  doc.text(`Property : ${room}`, marginX + 12, subY);
  subY += 4;
  doc.text(`Date : ${rawDate}`, marginX + 12, subY);
  subY += 4;
  doc.text(`Time : ${rawTime}`, marginX + 12, subY);

  if (hoursParam) {
    subY += 4;
    doc.text(`Duration : ${hoursParam} hrs`, marginX + 12, subY);
  }

  doc.setTextColor(0, 0, 0);
  doc.text('1.00', marginX + 120, itemY, { align: 'right' });
  doc.text(formatAmount(subTotalNum), marginX + 148, itemY, { align: 'right' });
  doc.text(formatAmount(subTotalNum), rightX - 3, itemY, { align: 'right' });

  const lineAfterItemsY = subY + 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, lineAfterItemsY, rightX, lineAfterItemsY);

  // --- PAYMENT DETAILS BOX ---
  const boxX = marginX;
  const boxY = lineAfterItemsY + 6;
  const boxWidth = 85;
  const boxHeight = 28;

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

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

  // --- SUMMARY SECTION ---
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
  doc.text(`€${formatAmount(totalNum)}`, rightX, sumY, { align: 'right' });

  sumY += 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(labelX - 15, sumY, rightX, sumY);

  // ----------------------------------------------------
  // 5. ส่งไฟล์ PDF กลับไป
  // ----------------------------------------------------
  const pdfOutput = doc.output('arraybuffer');
  const buffer = Buffer.from(pdfOutput);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="SalesReceipt_${receiptNo}.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}