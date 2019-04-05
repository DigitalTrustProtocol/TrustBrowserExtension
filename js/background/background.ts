import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupServer } from "./TrustGraphPopupServer";

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
storageServer.ready().then(() => {
    console.log("StorageServer ready");
});
// /**
//  * Promise wrapper for chrome.tabs.sendMessage
//  * @param tabId
//  * @param item
//  * @returns {Promise<any>}
//  */
// function sendMessagePromise(tabId, item) {
//     return new Promise((resolve, reject) => {
//         chrome.tabs.sendMessage(tabId, {item}, response => {
//             if(response.complete) {
//                 resolve();
//             } else {
//                 reject('Something wrong');
//             }
//         });
//     });
// }
// waiting for tasks from background
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//     const item = msg.item;

//     // ..process your "item"

//     sendResponse({complete: true}); // telling that CS has finished its job

//     // return true from the event listener to indicate you wish to send a response asynchronously
//     // (this will keep the message channel open to the other end until sendResponse is called).
//     return true;
// });

// background.js
// Notice the `async` keyword.
// chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
//     if (request.command === 'openDialog') {
//         profileData = request.data;
//         contentTabId = sender.tab.id;
//         // Open up the Popup window
//         GetpopupWindow(function(window) {
//             // Make sure the reuse an existing popup if exists.
//             if(!window)
//                 OpenDialog(request, contentTabId);
//             else
//                 SendMessageToDialog('showTarget', profileData, contentTabId, null);
//         });
//         return true;
//     }

//     // Waiting for the request of data from the Popup
//     if (request.command === 'requestData') {
//         // Response with the profile data to the popup
//         //chrome.windows.update(popupWindow.id, {focused:true });
//         //return { data: profileData, contentTabId: contentTabId };
//         requestData().then(result => {
//             sendResponse(result);
//         });
//         return true;
//     }

//     // Waiting for the request to update the client window after new trust has been issued.
//     // if (request.command === 'updateContent') {
//     //     // Send message to the client window
//     //     chrome.tabs.sendMessage(request.tabId, request, function(result) {
//     //         sendResponse(result);
//     //         //console.log(result);
//     //     });
//     //     return true;
//     // }

//     // if (request.command) {

//     //     sendMessage2(request.tabId, request).then(result => {
//     //         sendResponse(result);
//     //     });
//     //     return true;

//     //     // chrome.tabs.sendMessage(request.tabId, request, function(result) {

//     //     //     return result;
//     //     // });
//     // }

//     return false;
// });


// async function sendMessage2(tabId, request) {
//     chrome.tabs.sendMessage(request.tabId, request, function(result) {
//         return result;
//     });
// }
