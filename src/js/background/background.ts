import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupServer } from './TrustGraphPopupServer';
import { SettingsServer } from "./SettingsServer";
// import { PopupHandler } from "./PopupHandler";
import { LoginPopupBackground } from './LoginPopupBackground';

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
let loginPopupBackground = new LoginPopupBackground(messageHandler).init();
let settingsServer = new SettingsServer(messageHandler, storageServer);
storageServer.ready().then(() => {
     console.log("StorageServer ready");
     settingsServer.init();
});


var manifest = chrome.runtime.getManifest();
var injectIntoTab = function (tab) {
     // You could iterate through the content scripts here
     var scripts = manifest.content_scripts[0].js;
     scripts.forEach(script => {
          chrome.tabs.executeScript(tab.id, {
               file: script
          });
     });
}


chrome.runtime.onInstalled.addListener(function listener(details) {
     if (details.reason === "install" || details.reason === "update") {

          // Get all windows
          chrome.windows.getAll({ populate: true }, function (windows) {
               windows.forEach((window) => {
                    window.tabs.forEach((tab) => {
                         if(!tab.url.match(/(http(s)?:\/\/)?(chrome)(:|\.google\.com)/gi)) {
                              console.log("inject : "+tab.url)
                              injectIntoTab(tab);
                         }
                    })
               })
          });
  
       chrome.runtime.onInstalled.removeListener(listener);
     }
   });