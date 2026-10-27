import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code && supabase) {
    try {
      // แลกเปลี่ยน code กับ Session การล็อกอิน
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        const user = data.user;

        // บันทึก/อัปเดตข้อมูลผู้ใช้ลงตาราง users บน Supabase อัตโนมัติ
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Customer',
          phone: user.user_metadata?.phone || null,
          role: 'customer',
        });
      }
    } catch (err) {
      console.error('Callback error:', err);
    }
  }

  // เมื่อกระบวนการเสร็จสิ้น ให้ Redirect ไปยังหน้า Booking
  return NextResponse.redirect(`${requestUrl.origin}/customer/booking`);
}