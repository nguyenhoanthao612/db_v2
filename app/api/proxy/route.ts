import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrlString = searchParams.get('url') || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL;
    if (!targetUrlString) {
      return NextResponse.json({ success: false, message: 'Missing target URL' }, { status: 400 });
    }

    const targetUrl = new URL(targetUrlString);
    // Forward all other search params
    searchParams.forEach((value, key) => {
      if (key !== 'url') {
        targetUrl.searchParams.set(key, value);
      }
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Failed to fetch from target: ${response.statusText}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return NextResponse.json({
          success: false,
          message: 'Cấu hình URL không chính xác hoặc quyền truy cập Apps Script chưa đúng. Vui lòng chắc chắn bạn đã chọn mục "Ai có quyền truy cập" là "Mọi người" (Anyone) khi Triển khai (Deploy) Web App.'
        });
      }
      return NextResponse.json({
        success: false,
        message: 'Phản hồi từ Apps Script không đúng định dạng JSON: ' + text.slice(0, 200)
      });
    }
  } catch (error: any) {
    console.error('Proxy GET error:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrlString = searchParams.get('url') || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL;
    if (!targetUrlString) {
      return NextResponse.json({ success: false, message: 'Missing target URL' }, { status: 400 });
    }

    const targetUrl = new URL(targetUrlString);
    // Forward any extra search params if present
    searchParams.forEach((value, key) => {
      if (key !== 'url') {
        targetUrl.searchParams.set(key, value);
      }
    });

    const bodyText = await req.text();

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: bodyText,
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Failed to fetch from target: ${response.statusText}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return NextResponse.json({
          success: false,
          message: 'Cấu hình URL không chính xác hoặc quyền truy cập Apps Script chưa đúng. Vui lòng chắc chắn bạn đã chọn mục "Ai có quyền truy cập" là "Mọi người" (Anyone) khi Triển khai (Deploy) Web App.'
        });
      }
      return NextResponse.json({
        success: false,
        message: 'Phản hồi từ Apps Script không đúng định dạng JSON: ' + text.slice(0, 200)
      });
    }
  } catch (error: any) {
    console.error('Proxy POST error:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
