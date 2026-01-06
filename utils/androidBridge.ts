/**
 * Bridge to communicate with Android native app via JavaScript Interface
 * 
 * This utility provides safe access to the Android JavaScript Interface
 * for receiving auth data (uid, session_id, projectCode, access_token)
 * and reading language/theme from URL parameters
 */

interface AndroidAuthInfo {
    uid: string;
    session_id: string;
    projectCode: string;
    access_token: string;
}

// Extend Window interface to include Android object
declare global {
    interface Window {
        Android?: {
            getAuthInfo(): string;
        };
    }
}

/**
 * Check if running inside Android WebView with JavaScript Interface
 */
export function isAndroidWebView(): boolean {
    return typeof window !== 'undefined' &&
        typeof window.Android !== 'undefined' &&
        typeof window.Android.getAuthInfo === 'function';
}

/**
 * Get auth info from Android native app
 * Returns null if not running in Android WebView or if call fails
 */
export function getAuthFromAndroid(): AndroidAuthInfo | null {
    if (!isAndroidWebView()) {
        console.log('[AndroidBridge] Not running in Android WebView');
        return null;
    }

    try {
        const jsonStr = window.Android!.getAuthInfo();
        const data = JSON.parse(jsonStr);
        console.log('[AndroidBridge] ✅ Received auth info from Android:', {
            uid: data.uid,
            session_id: data.session_id ? '***' : 'missing',
            projectCode: data.projectCode,
            access_token: data.access_token ? '***' : 'missing'
        });
        return data as AndroidAuthInfo;
    } catch (error) {
        console.error('[AndroidBridge] ❌ Failed to get auth info:', error);
        return null;
    }
}

/**
 * Get language from URL parameters
 * URL format: ?lang=vi or ?lang=en
 * Returns 'vi' or 'en', defaults to 'vi' if not specified
 */
export function getLanguageFromUrl(): 'vi' | 'en' {
    try {
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang');
        if (lang === 'en' || lang === 'vi') {
            console.log('[AndroidBridge] 🌐 Language from URL:', lang);
            return lang;
        }
    } catch (error) {
        console.error('[AndroidBridge] Failed to read language from URL:', error);
    }
    return 'vi'; // default
}

/**
 * Get theme mode from URL parameters
 * URL format: ?theme=auto or ?theme=light or ?theme=dark
 * Returns 'auto', 'light', or 'dark', defaults to 'auto' if not specified
 * - 'auto': Follow system theme
 * - 'light': Force light mode
 * - 'dark': Force dark mode
 */
export function getThemeFromUrl(): 'auto' | 'light' | 'dark' {
    try {
        const params = new URLSearchParams(window.location.search);
        const theme = params.get('theme');
        if (theme === 'auto' || theme === 'light' || theme === 'dark') {
            console.log('[AndroidBridge] 🎨 Theme from URL:', theme);
            return theme;
        }
    } catch (error) {
        console.error('[AndroidBridge] Failed to read theme from URL:', error);
    }
    return 'auto'; // default
}
