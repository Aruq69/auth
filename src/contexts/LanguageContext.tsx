import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Basic translations - you can expand this as needed
const translations = {
  en: {
    'account_settings': 'Account Settings',
    'security_center': 'Security Center',
    'privacy_data': 'Privacy & Data',
    'preferences': 'Preferences',
    'notifications': 'Notifications',
    'privacy_first_mode': 'Privacy-First Mode',
    'data_retention': 'Data Retention',
    'display_language': 'Display Language',
    'appearance_theme': 'Appearance Theme',
    'light_mode': 'Light Mode',
    'dark_mode': 'Dark Mode',
    'system_default': 'System Default',
    'email_notifications': 'Email Notifications',
    'security_alerts': 'Security Alerts',
    'manage_security': 'Manage your security and preferences',
    'control_data_privacy': 'Control your data and privacy settings',
    'customize_experience': 'Customize your Mail Guard experience',
    'notification_preferences': 'Manage your notification preferences',
    'english': 'English',
    'arabic': 'Arabic',
    'bright_clean_interface': 'Bright and clean interface',
    'easy_on_eyes': 'Easy on the eyes in low light',
    'match_device_settings': 'Match your device settings'
  },
  ar: {
    'account_settings': 'إعدادات الحساب',
    'security_center': 'مركز الأمان',
    'privacy_data': 'الخصوصية والبيانات',
    'preferences': 'التفضيلات',
    'notifications': 'الإشعارات',
    'privacy_first_mode': 'وضع الخصوصية الأول',
    'data_retention': 'الاحتفاظ بالبيانات',
    'display_language': 'لغة العرض',
    'appearance_theme': 'مظهر التطبيق',
    'light_mode': 'الوضع المضيء',
    'dark_mode': 'الوضع المظلم',
    'system_default': 'افتراضي النظام',
    'email_notifications': 'إشعارات البريد الإلكتروني',
    'security_alerts': 'تنبيهات الأمان',
    'manage_security': 'إدارة الأمان والتفضيلات',
    'control_data_privacy': 'التحكم في إعدادات البيانات والخصوصية',
    'customize_experience': 'تخصيص تجربة Mail Guard الخاصة بك',
    'notification_preferences': 'إدارة تفضيلات الإشعارات',
    'english': 'الإنجليزية',
    'arabic': 'العربية',
    'bright_clean_interface': 'واجهة مشرقة ونظيفة',
    'easy_on_eyes': 'مريح للعينين في الإضاءة المنخفضة',
    'match_device_settings': 'مطابقة إعدادات الجهاز'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguageState(savedLanguage);
      // Apply to document
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);
    // Apply to document for proper RTL/LTR support
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (key: string): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en;
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};