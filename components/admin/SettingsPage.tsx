'use client';

import React from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import AppsScriptGuide from '@/components/AppsScriptGuide';

export default function SettingsPage() {
  const { onSyncComplete } = useAdmin();

  return (
    <div className="space-y-6">
      <AppsScriptGuide onUrlSaved={onSyncComplete} />
    </div>
  );
}
