import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Comprehensive translations for Arabic UI
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
    'match_device_settings': 'Match your device settings',
    'dashboard': 'Dashboard',
    'profile_information': 'Profile Information',
    'account_details_status': 'Your account details and status',
    'email_address': 'Email Address',
    'member_since': 'Member Since',
    'email_verified': 'Email Verified',
    'mfa_enabled': 'MFA Enabled',
    'mfa_disabled': 'MFA Disabled',
    'account_secured_2fa': 'Your account is secured with 2FA',
    'enable_2fa_security': 'Enable 2FA for enhanced security',
    'enable_mfa': 'Enable MFA',
    'security_risk': 'Security Risk',
    'mfa_protection_warning': 'Your account is not protected with multi-factor authentication. Enable MFA now to secure your email data and prevent unauthorized access.',
    'excellent_mfa_protection': 'Excellent! Your account is protected with multi-factor authentication.',
    'authenticators_configured': 'authenticator(s) configured',
    'totp_authenticator_app': 'TOTP Authenticator App',
    'remove': 'Remove',
    'privacy_first_enabled': 'Emails are NOT stored (maximum privacy)',
    'data_storage_consented': 'You have consented to email storage',
    'no_emails_stored': 'No emails are stored (privacy-first mode)',
    'emails_stored_90_days': 'Emails are stored for 90 days',
    'storage_disabled': 'Storage Disabled',
    'storage_active': 'Storage Active',
    'export_data': 'Export Data',
    'download_all_data': 'Download all your data',
    'export': 'Export',
    'account_actions': 'Account Actions',
    'important_account_management': 'Important account management and session controls',
    'end_session': 'End Session',
    'securely_sign_out': 'Securely sign out of your Mail Guard account',
    'sign_out': 'Sign Out',
    'signing_out_notice': 'Signing out will end your current session and you\'ll need to authenticate again to access Mail Guard.',
    'secure_account': 'Secure Account',
    'multi_factor_auth_settings': 'Multi-factor authentication and security settings',
    'protected': 'Protected',
    'privacy_first_mode_enabled': 'Privacy-First Mode Enabled',
    'data_storage_enabled': 'Data Storage Enabled',
    'maximum_privacy_mode': 'Emails will not be stored permanently (maximum privacy)',
    'consented_storage': 'You have consented to email storage for enhanced features',
    'language_updated': 'Language Updated',
    'language_changed_arabic': 'Language changed to Arabic',
    'language_changed_english': 'Language changed to English',
    'error': 'Error',
    'failed_update_setting': 'Failed to update setting. Please try again.'
  },
  ar: {
    'account_settings': 'إعدادات الحساب',
    'security_center': 'مركز الأمان',
    'privacy_data': 'الخصوصية والبيانات',
    'preferences': 'التفضيلات',
    'notifications': 'الإشعارات',
    'privacy_first_mode': 'وضع الخصوصية أولاً',
    'data_retention': 'الاحتفاظ بالبيانات',
    'display_language': 'لغة العرض',
    'appearance_theme': 'مظهر التطبيق',
    'light_mode': 'الوضع المضيء',
    'dark_mode': 'الوضع المظلم',
    'system_default': 'إعدادات النظام',
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
    'match_device_settings': 'مطابقة إعدادات الجهاز',
    'dashboard': 'لوحة التحكم',
    'profile_information': 'معلومات الملف الشخصي',
    'account_details_status': 'تفاصيل حسابك وحالته',
    'email_address': 'عنوان البريد الإلكتروني',
    'member_since': 'عضو منذ',
    'email_verified': 'تم تأكيد البريد الإلكتروني',
    'mfa_enabled': 'تم تفعيل المصادقة متعددة العوامل',
    'mfa_disabled': 'تم تعطيل المصادقة متعددة العوامل',
    'account_secured_2fa': 'حسابك محمي بالمصادقة ثنائية العوامل',
    'enable_2fa_security': 'فعّل المصادقة ثنائية العوامل لحماية إضافية',
    'enable_mfa': 'تفعيل المصادقة متعددة العوامل',
    'security_risk': 'خطر أمني',
    'mfa_protection_warning': 'حسابك غير محمي بالمصادقة متعددة العوامل. فعّل المصادقة متعددة العوامل الآن لحماية بيانات بريدك الإلكتروني ومنع الوصول غير المصرح به.',
    'excellent_mfa_protection': 'ممتاز! حسابك محمي بالمصادقة متعددة العوامل.',
    'authenticators_configured': 'تطبيق مصادقة مُكوّن',
    'totp_authenticator_app': 'تطبيق المصادقة TOTP',
    'remove': 'إزالة',
    'privacy_first_enabled': 'لا يتم تخزين رسائل البريد الإلكتروني (خصوصية قصوى)',
    'data_storage_consented': 'لقد وافقت على تخزين البيانات',
    'no_emails_stored': 'لا يتم تخزين رسائل البريد الإلكتروني (وضع الخصوصية أولاً)',
    'emails_stored_90_days': 'يتم تخزين رسائل البريد الإلكتروني لمدة ٩٠ يوماً',
    'storage_disabled': 'التخزين معطل',
    'storage_active': 'التخزين نشط',
    'export_data': 'تصدير البيانات',
    'download_all_data': 'تحميل جميع بياناتك',
    'export': 'تصدير',
    'account_actions': 'إجراءات الحساب',
    'important_account_management': 'إدارة الحساب المهمة وضوابط الجلسة',
    'end_session': 'إنهاء الجلسة',
    'securely_sign_out': 'تسجيل خروج آمن من حساب Mail Guard',
    'sign_out': 'تسجيل الخروج',
    'signing_out_notice': 'سيؤدي تسجيل الخروج إلى إنهاء جلستك الحالية وستحتاج إلى المصادقة مرة أخرى للوصول إلى Mail Guard.',
    'secure_account': 'حساب آمن',
    'multi_factor_auth_settings': 'إعدادات المصادقة متعددة العوامل والأمان',
    'protected': 'محمي',
    'privacy_first_mode_enabled': 'تم تفعيل وضع الخصوصية أولاً',
    'data_storage_enabled': 'تم تفعيل تخزين البيانات',
    'maximum_privacy_mode': 'لن يتم تخزين رسائل البريد الإلكتروني بشكل دائم (خصوصية قصوى)',
    'consented_storage': 'لقد وافقت على تخزين البيانات للحصول على ميزات محسّنة',
    'language_updated': 'تم تحديث اللغة',
    'language_changed_arabic': 'تم تغيير اللغة إلى العربية',
    'language_changed_english': 'تم تغيير اللغة إلى الإنجليزية',
    'error': 'خطأ',
    'failed_update_setting': 'فشل في تحديث الإعداد. يرجى المحاولة مرة أخرى.'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguageState(savedLanguage);
      applyLanguageToDOM(savedLanguage);
    }
  }, []);

  const applyLanguageToDOM = (lang: string) => {
    // Apply to document immediately
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Add CSS class for RTL styling
    if (lang === 'ar') {
      document.documentElement.classList.add('rtl');
      document.body.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
      document.body.classList.remove('rtl');
    }
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);
    applyLanguageToDOM(lang);
  };

  const t = (key: string): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en;
    const translation = currentTranslations[key as keyof typeof currentTranslations];
    return translation || key;
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