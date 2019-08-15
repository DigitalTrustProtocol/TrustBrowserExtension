import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
// import { TrustGraphPopupServer } from "./TrustGraphPopupServer";
import { SettingsServer } from "./SettingsServer";
// import { IdentityPopupServer } from "./IdentityPopupServer";
// import { PopupHandler } from "./PopupHandler";

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
// let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
// let identityPopupServer = new IdentityPopupServer(messageHandler).init();
let settingsServer = new SettingsServer(messageHandler, storageServer);
storageServer.ready().then(() => {
     console.log("StorageServer ready");
     settingsServer.init();
});

function updateIcon(val: number) : void {
    if(val === undefined || val == 0) {
        chrome.browserAction.setIcon({path: "img/DTP16a.png"});
        return;
    }

    if (val >0) { // if val not undefined!
        chrome.browserAction.setIcon({path: "img/Trust24a.png"});
        return;
    }
    
    if(val < 0) {
        chrome.browserAction.setIcon({path: "img/Distrust24a.png"});
        return;
    }

    
}


chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if(msg.handler ===  "extensionHandler")
        if (msg.action === "updateIcon") {
            updateIcon(msg.value);
        }
});


chrome.tabs.onActivated.addListener(function(activeInfo: chrome.tabs.TabActiveInfo) {
    updateIcon(undefined);
});


// https://stackoverflow.com/questions/10994324/chrome-extension-content-script-re-injection-after-upgrade-or-install/11598753#11598753
