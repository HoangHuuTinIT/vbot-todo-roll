export function postEventToNative(eventType: string, data:any={}) {
    const jsonData = JSON.stringify(data);
    window.TelegramWebviewProxy?.postEvent(eventType, jsonData);
}

export function setupNativeEventListener(){
    window.Telegram= window.Telegram || {};
    window.Telegram.WebView= window.Telegram.WebView || {};
    window.Telegram.WebView.receiveEvent= (eventType:string , eventData:any)=>{
        const event= new CustomEvent('native-event', {
            detail: {eventType, eventData}
        });
        window.dispatchEvent(event);
    };
}
export function onNativeEvent(callback:(eventType:string,eventData:any)=>void){
    const handler=(e:Event)=>{ 
        const customEvent=e as CustomEvent;
        callback(customEvent.detail.eventType,customEvent.detail.eventData);
    };
    window.addEventListener('native-event', handler);
    return()=>{
        window.removeEventListener('native-event', handler);
    }
}
     
