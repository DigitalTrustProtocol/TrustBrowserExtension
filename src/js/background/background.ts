import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupServer } from './TrustGraphPopupServer';
import { SettingsServer } from "./SettingsServer";
// import { PopupHandler } from "./PopupHandler";

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
let settingsServer = new SettingsServer(messageHandler, storageServer);
storageServer.ready().then(() => {
     console.log("StorageServer ready");
     settingsServer.init();
});

function updateIcon(val: number) : void {
    let icon = "";

    if(val == 0)
        icon = "";

    if (val > 0)
        icon = "trust";
    
    if(val < 0) 
        icon = "distrust";

    chrome.browserAction.setIcon({
        path : {
          "16": `img/DTP${icon}16a.png`,
          "24": `img/DTP${icon}24a.png`,
          "32": `img/DTP${icon}32a.png`
        }
      });
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
