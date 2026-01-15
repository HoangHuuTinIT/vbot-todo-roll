<script setup lang="ts">
	import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
	import { useAuthStore } from '@/stores/auth';
	import { useSocketStore } from '@/stores/socket';
	// 1. IMPORT HÀM ĐỔI NGÔN NGỮ
	import { changeLanguage } from '@/utils/language';
	import { setupNativeEventListener,onNativeEvent } from '@/utils/nativeBridge';
	// 2. IMPORT ANDROID BRIDGE CHO WEBVIEW
	// import { getAuthFromAndroid, isAndroidWebView, getLanguageFromUrl, getThemeFromUrl } from '@/utils/androidBridge';
	// 3. IMPORT THEME MANAGER CHO AUTO-FOLLOW SYSTEM THEME
	import { ThemeManager } from '@/utils/themeManager';

	const handleNativeData = async () => {
  const authStore = useAuthStore();
  const socketStore = useSocketStore();
  
  setupNativeEventListener();
  
  const cleanup = onNativeEvent((eventType, eventData) => {
    if (eventType === 'init_data') {
      const { auth, language, theme } = eventData;
      
      if (language) {
        changeLanguage(language);
      }
      
      if (theme) {
        const themeMode = theme === 'auto' ? 'system' : theme;
        ThemeManager.setTheme(themeMode);
        ThemeManager.init();
        authStore.applyTheme(themeMode);
      }
      
      if (auth?.uid && auth?.access_token) {
        authStore.initFromNative({
          uid: auth.uid,
          session_id: auth.session_id,
          projectCode: auth.projectCode,
          access_token: auth.access_token
        }).then(() => {
          if (authStore.isLoggedIn) {
            socketStore.connect();
          }
        });
      }
    }
    
    if (eventType === 'theme_changed') {
      const { theme } = eventData;
      ThemeManager.setTheme(theme);
      ThemeManager.applyTheme(theme);
      authStore.applyTheme(theme);
    }
  });
};

	onLaunch(() => {
		handleNativeData();
	});

	// onShow((options : UniApp.ShowOptions) => {
	// 	console.log('App Show');
	// 	handleNativeData('Show', options);
	// });

	onHide(() => {
		console.log(' App Hide');
	});

	// 6. LISTENER CHO ANDROID PUSH THEME CHANGE
	// Android sẽ gọi window.onSystemThemeChange('dark'/'light') khi system theme thay đổi
	// if (typeof window !== 'undefined') {
	// 	(window as any).onSystemThemeChange = (newTheme: 'light' | 'dark') => {
	// 		console.log('🎨 [AndroidBridge] Received system theme change from Android:', newTheme);
	// 		const authStore = useAuthStore();
			
	// 		// Update ThemeManager
	// 		ThemeManager.setTheme(newTheme);
	// 		ThemeManager.applyTheme(newTheme);
			
	// 		// Update authStore for compatibility
	// 		authStore.applyTheme(newTheme);
	// 	};
	// 	console.log('✅ [AndroidBridge] Registered window.onSystemThemeChange listener');
	// }
</script>
<style lang="scss">
    @import '@/common/theme.scss';
	
</style>