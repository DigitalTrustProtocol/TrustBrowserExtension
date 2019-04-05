import { browser, Windows } from "webextension-polyfill-ts";
import { MessageHandler } from "../Shared/MessageHandler";


export class TrustGraphPopupServer {
    static handlerName: string = "TrustGraphPopup";

    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};

    private popupTab = null;
    private popupWindow = null;
    private profileData = null;
    private contentTabId = null;
    

    constructor(messageHandler: MessageHandler) {
        this.messageHandler = messageHandler;
    }

    public init() : TrustGraphPopupServer {
        this.methods["openDialog"] = (params, sender) => { this.openDialog(params, sender) };
        this.methods["requestData"] = (params, sender) => { this.requestData(params, sender) };

        this.messageHandler.receive(TrustGraphPopupServer.handlerName, (params: any, sender: any) => {
            let method = this.methods[params.action];
            if (method)
                return method(params, sender);
        });
        
        browser.windows.onRemoved.addListener(function (id) {
            if (!this.popupWindow)
                return;
    
            if (id == this.popupWindow.id)
                this.popupWindow = null;
        });
        return this;
    }

    public static action(action: string) {
        return { 
            action: action
        };
    }


    private openDialog(request: any, sender: any): void {
        this.profileData = request.data;
        this.contentTabId = sender.tab.id;
        // Open up the Popup window
        if(this.popupWindow) {
            this.sendMessageToDialog('showSubject', request.data, sender.tab.id, null);
            browser.windows.update(this.popupWindow.id, { focused:true });
        } else {
            this.createDialog(request, sender.tab.id);
        }
        // browser.windows.get(this.popupWindow.id, null).then(window => {
        //     if(!window)
        //         this.createDialog(request, sender.tab.id);
        //     else
        //         this.sendMessageToDialog('showTarget', request.data, sender.tab.id, null);
        // });
    }

    private createDialog(request, contentTabId) : void
    {
        
        try {
            browser.tabs.create({
                url: browser.extension.getURL('trustgraph.html'), //'dialog.html'
                active: false
            }).then((tab) => {
                this.popupTab = tab;
                // After the tab has been created, open a window to inject the tab
                let param = {
                    tabId: tab.id,
                    type: 'popup',
                    top: request.top,
                    left: request.left,
                    width: request.w,
                    height: request.h
                    // incognito, top, left, ...
                } as Windows.CreateCreateDataType;

                browser.windows.create(param).then((window) => {
                        this.popupWindow = window;
                    });
            });
        } catch (error) {
            console.log(error);
        }
    }

    private requestData(request: any, sender: any) : any {
        //chrome.windows.update(popupWindow.id, {focused:true });
        return { 
            data: this.profileData, 
            contentTabId: this.contentTabId 
        };
    }

    private sendMessageToDialog(action: string, data: any, contentTabId: any, cb: any) : void
    {
        let message = { 
            handler: TrustGraphPopupServer.handlerName,
            params: {
                action: action, 
                data: data, 
                contentTabId: contentTabId 
            }
        };
        browser.tabs.sendMessage(this.popupTab.id, message, cb);
    }


}