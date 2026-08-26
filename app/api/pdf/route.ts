import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const customerName = searchParams.get('customerName') || 'Customer';
  const program = searchParams.get('program') || 'Cleaning Program';
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '90€';
  const bookingRef = searchParams.get('bookingRef') || 'REF-456347';

  // 1. กำหนดขนาดกระดาษ A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm

  // 2. โหลด Logo
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.jpeg');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
      
      // แสดงโลโก้ขนาดใหญ่พอดี
      doc.addImage(logoBase64, 'JPEG', (pageWidth - 60) / 2, 20, 60, 25);
    }
  } catch (err) {
    console.error('Failed to load logo image:', err);
  }

  // 3. วาดไอคอนเครื่องหมายถูก (Draw Checkmark Vector)
  const circleX = pageWidth / 2;
  const circleY = 58;

  // วงกลมสีเขียวอ่อน
  doc.setFillColor(209, 250, 229); // emerald-100
  doc.circle(circleX, circleY, 9, 'F');

  // วาดเส้นเครื่องหมายถูก (Checkmark Line) สีเขียวเข้ม
  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(1.5);
  doc.line(circleX - 4, circleY, circleX - 1, circleY + 3);
  doc.line(circleX - 1, circleY + 3, circleX + 4, circleY - 3);

  // 4. Header Text
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Successful!', pageWidth / 2, 75, { align: 'center' });

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Thank you. Your booking has been confirmed, ${customerName}.`, pageWidth / 2, 82, { align: 'center' });

  // 5. กรอบสี่เหลี่ยมรายละเอียด (Card Box)
  const cardX = 30;
  const cardY = 90;
  const cardWidth = 150;
  const cardHeight = 85;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'FD');

  let currentY = cardY + 12;
  const leftX = cardX + 10;
  const rightX = cardX + cardWidth - 10;

  // Booking Ref
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Booking Ref', leftX, currentY);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(bookingRef, rightX, currentY, { align: 'right' });

  // เส้นคั่นที่ 1
  currentY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(leftX, currentY, rightX, currentY);

  // Location / Room
  if (room) {
    currentY += 9;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Location', leftX, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const splitRoom = doc.splitTextToSize(room, 90);
    doc.text(splitRoom, rightX, currentY, { align: 'right' });
    currentY += (splitRoom.length - 1) * 5;
  }

  // Date
  if (date) {
    currentY += 9;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Date', leftX, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(date, rightX, currentY, { align: 'right' });
  }

  // Time
  if (time) {
    currentY += 9;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Time', leftX, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(time, rightX, currentY, { align: 'right' });
  }

  // Program
  if (program) {
    currentY += 9;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Program', leftX, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(program, rightX, currentY, { align: 'right' });
  }

  // เส้นคั่นที่ 2
  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(leftX, currentY, rightX, currentY);

  // Total Paid
  currentY += 10;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid', leftX, currentY);

  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFontSize(14);
  doc.text(price, rightX, currentY, { align: 'right' });

  // 6. Footer Text
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('© Getaway Cleaning Service', pageWidth / 2, 190, { align: 'center' });

  const pdfBuffer = doc.output('arraybuffer');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt_${bookingRef}.pdf"`,
    },
  });
}