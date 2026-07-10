'use client';

import { useEffect, useState } from 'react';

export default function F12Blocker() {
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_f12');
      return val !== null ? val === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    const getSetting = () => {
      if (typeof window !== 'undefined') {
        const val = localStorage.getItem('ic3_block_f12');
        return val !== null ? val === 'true' : true;
      }
      return true;
    };

    // Listen to changes triggered by the admin toggling the setting
    const handleSettingChange = () => {
      setIsBlocked(getSetting());
    };

    window.addEventListener('f12BlockSettingChanged', handleSettingChange);
    window.addEventListener('storage', handleSettingChange);

    return () => {
      window.removeEventListener('f12BlockSettingChanged', handleSettingChange);
      window.removeEventListener('storage', handleSettingChange);
    };
  }, []);

  useEffect(() => {
    if (!isBlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Block F12 (key code 123)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 2. Block Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Mac specific check for Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 3. Block Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Mac specific check for Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 4. Block Ctrl+Shift+C / Cmd+Option+C (Inspect elements)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Mac specific check for Cmd+Option+C
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 5. Block Ctrl+U / Cmd+Option+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Mac specific check for Cmd+Option+U
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 6. Block Ctrl+S / Cmd+S (Save page, can view local source files)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isBlocked]);

  return null;
}
