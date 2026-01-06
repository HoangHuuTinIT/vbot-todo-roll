/**
 * Bridge to communicate with Android native app via JavaScript Interface
 * 
 * This utility provides safe access to the Android JavaScript Interface
 * for receiving auth data (uid, session_id, projectCode, access_token)
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
