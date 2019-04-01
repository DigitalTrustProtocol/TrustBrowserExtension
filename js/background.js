
var popupTab = null;
var popupWindow = null;
var profileData = null;
var contentTabId = null;

// background.js
// Notice the `async` keyword.
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.command === 'openDialog') {
        profileData = request.data;
        contentTabId = sender.tab.id;
        // Open up the Popup window
        GetpopupWindow(function(window) {
            // Make sure the reuse an existing popup if exists.
            if(!window)
                OpenDialog(request, contentTabId);
            else
                SendMessageToDialog('showTarget', profileData, contentTabId);
        });
        return true;
    }

    // Waiting for the request of data from the Popup
    if (request.command === 'requestData') {
        // Response with the profile data to the popup
        //chrome.windows.update(popupWindow.id, {focused:true });
        //return { data: profileData, contentTabId: contentTabId };
        requestData().then(result => {
            sendResponse(result);
        });
        return true;
    }

    // Waiting for the request to update the client window after new trust has been issued.
    // if (request.command === 'updateContent') {
    //     // Send message to the client window
    //     chrome.tabs.sendMessage(request.tabId, request, function(result) {
    //         sendResponse(result);
    //         //console.log(result);
    //     });
    //     return true;
    // }

    if (request.command) {

        sendMessage2(request.tabId, request).then(result => {
            sendResponse(result);
        });
        return true;

        // chrome.tabs.sendMessage(request.tabId, request, function(result) {

        //     return result;
        // });
    }

    return false;
});

async function requestData() {
    chrome.windows.update(popupWindow.id, {focused:true });
    return { data: profileData, contentTabId: contentTabId };
}

async function sendMessage2(tabId, request) {
    chrome.tabs.sendMessage(request.tabId, request, function(result) {
        return result;
    });
}


function OpenDialog(request, contentTabId)
{
    try {
        chrome.tabs.create({
            url: chrome.extension.getURL(request.url), //'dialog.html'
            active: false
        }, function(tab) {
            popupTab = tab;
            // After the tab has been created, open a window to inject the tab
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true,
                top: request.top,
                left: request.left,
                width: request.w,
                height: request.h
                // incognito, top, left, ...
            }, 
                function(window) {
                    popupWindow = window;

                    // Replaced by the "requestData" message
                    // setTimeout(function() { 
                    //     SendMessageToDialog('showTarget', request.data, contentTabId); 
                    // }, 100);
                    
                });
        });
    } catch (error) {
        console.log(error);
    }
}

function GetpopupWindow(cb)
{
    if(!popupWindow) 
        cb(null);
    else
        chrome.windows.get(popupWindow.id, null, cb);
}

chrome.windows.onRemoved.addListener(function (id) {
    if(!popupWindow)
        return; 
        
    if(id == popupWindow.id)
        popupWindow = null;
});

function SendMessageToDialog(command, target, contentTabId, cb) 
{
    chrome.tabs.sendMessage(popupTab.id, { command: command, data: target, contentTabId: contentTabId }, cb);
    //chrome.tabs.update(popupTab.id, {active: true});
    chrome.windows.update(popupWindow.id, {focused:true });
}