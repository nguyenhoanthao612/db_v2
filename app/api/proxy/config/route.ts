import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string' || !url.trim()) {
      // Clear the cookie
      const cookieStore = await cookies();
      cookieStore.delete('APPS_SCRIPT_URL');
      return NextResponse.json({ success: true, cleared: true });
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('https://script.google.com/')) {
      return NextResponse.json({
        success: false,
        message: 'URL không hợp lệ. Phải là một URL Google Apps Script Web App bắt đầu bằng https://script.google.com/'
      }, { status: 400 });
    }

    // Test the connection
    const targetUrl = new URL(trimmedUrl);
    targetUrl.searchParams.set('action', 'getExams');

    const testResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!testResponse.ok) {
      return NextResponse.json({
        success: false,
        message: `Không thể kết nối đến Apps Script: HTTP ${testResponse.status}`
      });
    }

    const text = await testResponse.text();
    try {
      const data = JSON.parse(text);
      if (data.success !== true) {
        return NextResponse.json({
          success: false,
          message: data.message || 'Apps Script trả về lỗi hoặc phản hồi không hợp lệ.'
        });
      }
    } catch (e) {
      return NextResponse.json({
        success: false,
        message: 'Phản hồi từ Apps Script không đúng định dạng JSON. Hãy kiểm tra lại phân quyền "Who has access: Anyone" khi Deploy.'
      });
    }

    // Set the cookie securely
    const cookieStore = await cookies();
    cookieStore.set('APPS_SCRIPT_URL', trimmedUrl, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Config test/save error:', err);
    return NextResponse.json({ success: false, message: err.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const hasCookie = !!cookieStore.get('APPS_SCRIPT_URL')?.value;
    const hasEnv = !!process.env.APPS_SCRIPT_URL || !!process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    return NextResponse.json({ configured: hasCookie || hasEnv });
  } catch (err: any) {
    return NextResponse.json({ configured: false });
  }
}
