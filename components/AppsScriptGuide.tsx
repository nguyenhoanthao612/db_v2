'use client';

import React, { useState } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Check, Copy, ExternalLink, Settings, Database, CloudLightning, ShieldAlert } from 'lucide-react';

interface AppsScriptGuideProps {
  onUrlSaved: () => void;
}

export default function AppsScriptGuide({ onUrlSaved }: AppsScriptGuideProps) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Fetch current code from file or we can just give a reminder
      const response = await fetch('/google-apps-script.js');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setStatus({ type: 'error', message: 'Vui lòng nhập URL hợp lệ.' });
      return;
    }

    setTesting(true);
    setStatus({ type: '', message: '' });

    try {
      const connRes = await DatabaseService.testConnection(url.trim());
      if (connRes.success) {
        DatabaseService.saveSyncConfig(url.trim());
        const syncRes = await DatabaseService.pullFromGoogleSheets();
        if (syncRes.success) {
          setStatus({ type: 'success', message: 'Kết nối và đồng bộ dữ liệu Google Sheets thành công!' });
          onUrlSaved();
        } else {
          setStatus({
            type: 'error',
            message: `Kết nối thành công nhưng đồng bộ thất bại: ${syncRes.message}`,
          });
        }
      } else {
        setStatus({
          type: 'error',
          message: connRes.message || 'Không thể kết nối đến URL Apps Script này. Hãy kiểm tra lại phân quyền "Who has access: Anyone" (Mọi người) khi Deploy.',
        });
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: `Lỗi kết nối: ${err.message || err}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="apps-script-guide" className="bg-blue-50/80 border border-blue-100 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-500 text-white p-2.5 rounded-xl shadow-md shadow-blue-200">
          <Database className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cấu hình đồng bộ Google Sheets 2 chiều</h2>
          <p className="text-xs text-blue-600 font-medium">Bảo toàn vĩnh viễn và đồng bộ dữ liệu tuyệt đối</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm text-gray-600">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
            Chuẩn bị Google Sheet
          </h3>
          <p className="text-xs leading-relaxed">
            Tạo Google Sheet mới và tạo 4 Sheet trống với tên viết chính xác: <strong className="text-blue-700">Admin, Student, Questions, Score</strong>.
          </p>

          <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
            Dán Google Apps Script
          </h3>
          <p className="text-xs leading-relaxed">
            Vào <strong className="text-gray-700">Tiện ích mở rộng (Extensions) → Apps Script</strong>. Copy đoạn mã Apps Script chuyên dụng được xây dựng sẵn của chúng tôi bên dưới và dán vào đó.
          </p>

          <button
            onClick={handleCopy}
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã sao chép mã!' : 'Sao chép mã Apps Script'}
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">3</span>
            Triển khai Web App (Deploy)
          </h3>
          <ul className="text-xs space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Nhấn <strong className="text-gray-700">Triển khai (Deploy) → Triển khai mới (New deployment)</strong>.</li>
            <li>Chọn loại cấu hình: <strong className="text-gray-700">Ứng dụng khách Web (Web App)</strong>.</li>
            <li>Đặt quyền chạy dưới danh nghĩa: <strong className="text-blue-700">Me (Bạn)</strong>.</li>
            <li>Ai có quyền truy cập: <strong className="text-blue-700">Anyone (Mọi người - Kể cả ẩn danh)</strong>.</li>
            <li>Sao chép URL Web App được cấp (có đuôi <code className="bg-blue-100/60 px-1 rounded text-blue-800">/exec</code>).</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
        <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <CloudLightning className="w-4 h-4 text-amber-500" />
          Nhập URL Google Apps Script Web App của bạn để kích hoạt Sync 2 chiều:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={testing}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-bold rounded-lg transition shadow-md shadow-blue-200 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {testing ? (
              <>
                <Settings className="w-4 h-4 animate-spin" />
                Đang kết nối...
              </>
            ) : (
              'Kết nối & Đồng bộ'
            )}
          </button>
        </div>

        {status.message && (
          <div
            className={`mt-4 p-3.5 rounded-lg text-xs flex items-start gap-2 ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${status.type === 'success' ? 'text-green-500' : 'text-red-500'}`} />
            <span>{status.message}</span>
          </div>
        )}
      </form>

      <div className="mt-4 flex justify-between items-center text-[11px] text-gray-400">
        <span>* Bạn vẫn có thể sử dụng database local (LocalStorage) nếu chưa muốn thiết lập ngay.</span>
        <a
          href="https://script.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center gap-0.5"
        >
          Trang chủ Apps Script <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
