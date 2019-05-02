import { browser, Windows, Runtime } from "webextension-polyfill-ts";
import { MessageHandler } from "../Shared/MessageHandler";
import * as $ from 'jquery';

export class PopupHandler {
    public handlerName: string;
    private popurl: string;
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};

    private popupTab = null;
    private popupWindow = null;
    private data: any = null;
    private contentHandler: string = null;
    private contentTabId = null;
    

    constructor(name: string, url: string, messageHandler: MessageHandler) {
        this.handlerName = name;
        this.popurl = url;
        this.messageHandler = messageHandler;
    }

    public init() : PopupHandler {
        this.methods["openDialog"] = (params: any, sender: Runtime.MessageSender) => this.openDialog(params, sender);
        this.methods["requestContentTabId"] = (params: any, sender: Runtime.MessageSender) => this.requestContentTabId(params, sender);

        this.messageHandler.receive(this.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if (method)
                return method(params, sender);
        });
        
        browser.windows.onRemoved.addListener((id) => {
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
        this.data = request.data;
        this.contentHandler = request.contentHandler;
        this.contentTabId = sender.tab.id;
        // Open up the Popup window
        if(this.popupWindow) {
            this.sendMessageToDialog('focus', request.data, sender.tab.id, null);
            browser.windows.update(this.popupWindow.id, { focused:true });
        } else {
            this.createDialog(request, sender.tab.id);
        }
    }

    private createDialog(request, contentTabId) : void
    {
        try {
            browser.tabs.create({
                url: browser.extension.getURL(request.url), 
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

    private requestContentTabId(params: any, sender: Runtime.MessageSender) : any {
        browser.windows.update(this.popupWindow.id, {focused:true });
        return $.Deferred().resolve({ 
                    data: this.data,
                    contentHandler: this.contentHandler,
                    contentTabId: this.contentTabId 
                }).promise();
    }

    private sendMessageToDialog(action: string, data: any, contentTabId: any, cb: any) : void
    {
        let message = { 
            handler: this.handlerName,
            params: {
                action: action, 
                data: data, 
                contentTabId: contentTabId 
            }
        };
        browser.tabs.sendMessage(this.popupTab.id, message, cb);
    }


}