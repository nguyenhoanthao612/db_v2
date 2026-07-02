'use client';

import React, { createContext, useContext } from 'react';

export interface AdminContextType {
  syncTrigger: number;
  onSyncComplete: () => void;
  currentUser: any;
  userRole: 'Admin' | 'Student' | null;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminLayout');
  }
  return context;
}
