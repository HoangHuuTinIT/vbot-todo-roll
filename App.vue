<script setup lang="ts">
	import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
	import { useAuthStore } from '@/stores/auth';
	import { useSocketStore } from '@/stores/socket';
	// 1. IMPORT HÀM ĐỔI NGÔN NGỮ
	import { changeLanguage } from '@/utils/language';
	// 2. IMPORT ANDROID BRIDGE CHO WEBVIEW
	import { getAuthFromAndroid, isAndroidWebView, getLanguageFromUrl, getThemeFromUrl } from '@/utils/androidBridge';
	// 3. IMPORT THEME MANAGER CHO AUTO-FOLLOW SYSTEM THEME
	import { ThemeManager } from '@/utils/themeManager';

	const handleNativeData = async (eventName : string, options : any = null) => {
		console.log(`[${eventName}] Bắt đầu kiểm tra dữ liệu từ Native...`);
		const authStore = useAuthStore();
		const socketStore = useSocketStore();

		let nativeData = null;
		let urlLang: 'vi' | 'en' | null = null;
		let urlTheme: 'auto' | 'light' | 'dark' | null = null;

		// --- PRIORITY 1: JavaScript Interface + URL params (WebView mode) ---
		if (isAndroidWebView()) {
			console.log("-> 📱 WebView mode detected, trying JavaScript Interface...");
			
			// Get auth from JavaScript Interface
			const androidAuth = getAuthFromAndroid();
			if (androidAuth) {
				console.log("-> ✅ Received auth data from JavaScript Interface");
				nativeData = androidAuth;
			}
			
			// Get language and theme from URL parameters
			urlLang = getLanguageFromUrl();
			urlTheme = getThemeFromUrl();
			console.log(`-> 🌐 URL params: lang=${urlLang}, theme=${urlTheme}`);
		}

		// --- PRIORITY 2: Fallback to existing uni-app methods ---
		if (!nativeData) {
			if (options && options.referrerInfo && options.referrerInfo.extraData) {
				console.log("-> Tìm thấy dữ liệu trong options.referrerInfo");
				nativeData = options.referrerInfo.extraData;
			}
			else if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.arguments) {
				console.log("-> Tìm thấy dữ liệu trong plus.runtime.arguments");
				const args = plus.runtime.arguments;
				try {
					nativeData = (typeof args === 'string' && args.startsWith('{')) ? JSON.parse(args) : args;
				} catch (e) {
					console.error("Lỗi parse arguments:", e);
					if (typeof args === 'object') nativeData = args;
				}
			}
			else {
				const launchOpts = uni.getLaunchOptionsSync();
				if (launchOpts && launchOpts.extraData) {
					nativeData = launchOpts.extraData;
				}
			}
		}
		// -----------------------------------------------------

		// 3. XỬ LÝ NGÔN NGỮ - Ưu tiên URL params (WebView) > nativeData
		if (urlLang) {
			console.log("🌐 App.vue: Áp dụng ngôn ngữ từ URL ->", urlLang);
			changeLanguage(urlLang);
		} else if (nativeData && (nativeData.language === 'en' || nativeData.language === 'vi')) {
			console.log("🔥 App.vue: Native yêu cầu ngôn ngữ ->", nativeData.language);
			changeLanguage(nativeData.language);
		}

		// 4. XỬ LÝ THEME - Ưu tiên URL params (WebView) > nativeData
		// Sử dụng ThemeManager để auto-follow system theme khi mode=auto/system
		let themeToApply: 'light' | 'dark' | 'system' = 'system';
		
		if (urlTheme) {
			console.log("🎨 App.vue: Áp dụng theme từ URL ->", urlTheme);
			// Map 'auto' to 'system' for ThemeManager
			themeToApply = urlTheme === 'auto' ? 'system' : urlTheme;
		} else if (nativeData && nativeData.themeMode) {
			console.log("🎨 Native yêu cầu theme:", nativeData.themeMode);
			themeToApply = nativeData.themeMode === 'auto' ? 'system' : nativeData.themeMode;
		}
		
		// Initialize ThemeManager with listener for system theme changes
		ThemeManager.setTheme(themeToApply);
		ThemeManager.init(); // Setup listener for system theme changes
		
		// Also update authStore for compatibility
		authStore.applyTheme(themeToApply === 'system' ? 'auto' : themeToApply);

		// 5. XỬ LÝ AUTH DATA
		if (nativeData && nativeData.uid && nativeData.access_token) {
			console.log("✅ Dữ liệu Auth hợp lệ -> Tiến hành đồng bộ Store");
			await authStore.initFromNative(nativeData);

			if (authStore.isLoggedIn) {
				socketStore.connect();
			}
		} else if (!nativeData) {
			console.log("⚠️ Không tìm thấy dữ liệu auth hợp lệ từ Native ở pha này.");
			if (eventName === 'Launch') {
				console.warn("App Launch thiếu data");
			}
		}
	};

	onLaunch((options : UniApp.LaunchOptions) => {
		console.log(' App Launch');
		handleNativeData('Launch', options);
	});

	onShow((options : UniApp.ShowOptions) => {
		console.log('App Show');
		handleNativeData('Show', options);
	});

	onHide(() => {
		console.log(' App Hide');
	});

	// 6. LISTENER CHO ANDROID PUSH THEME CHANGE
	// Android sẽ gọi window.onSystemThemeChange('dark'/'light') khi system theme thay đổi
	if (typeof window !== 'undefined') {
		(window as any).onSystemThemeChange = (newTheme: 'light' | 'dark') => {
			console.log('🎨 [AndroidBridge] Received system theme change from Android:', newTheme);
			const authStore = useAuthStore();
			
			// Update ThemeManager
			ThemeManager.setTheme(newTheme);
			ThemeManager.applyTheme(newTheme);
			
			// Update authStore for compatibility
			authStore.applyTheme(newTheme);
		};
		console.log('✅ [AndroidBridge] Registered window.onSystemThemeChange listener');
	}
</script>
<style lang="scss">
    @import '@/common/theme.scss';
	
</style>