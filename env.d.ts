/// <reference types="vite/client" />
interface Window {
TelegramWebviewProxy?:{
    postEvent: (eventType: string, eventData: string) => void
};

Telegram?:{
    WebView?:{
        receiveEvent?: (eventType: string, eventData: any) => void
    }
};
}
