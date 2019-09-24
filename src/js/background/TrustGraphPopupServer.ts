import { browser, Windows, Runtime } from "webextension-polyfill-ts";
import { MessageHandler } from "../Shared/MessageHandler";
import * as $ from 'jquery';
import IOpenDialogResult from "../Model/OpenDialogResult.interface";

export class TrustGraphPopupServer {
    static handlerName: string = "TrustGraphPopup";

    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};

    private popupTab = null;
    private popupWindow = null;
    

    constructor(messageHandler: MessageHandler) {
        this.messageHandler = messageHandler;
    }

    public init() : TrustGraphPopupServer {
        this.methods["openDialog"] = (params: any, sender: Runtime.MessageSender) => { return this.openDialog(params, sender); };

        this.messageHandler.receive(TrustGraphPopupServer.handlerName, (params: any, sender: Runtime.MessageSender) => {
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


    private openDialog(request: any, sender: Runtime.MessageSender): JQueryPromise<IOpenDialogResult> {
        // Open up the Popup window
        let result = $.Deferred<IOpenDialogResult>();
        if(this.popupWindow) {
            browser.windows.remove(this.popupWindow.id).then(()=>  {

                this.createDialog(request, sender).then((data) => {
                    result.resolve(data);
                })
            });
        } else {
            this.createDialog(request, sender).then((data) => {
                result.resolve(data);
            })
        }
        return result.promise();
    }

    private createDialog(request: any, sender: Runtime.MessageSender) : Promise<IOpenDialogResult>
    {
        //let url =  browser.extension.getURL('trustgraph.html')+'?tabId='+sender.tab.id+'&profileId='+request.profileId;
        let url =  browser.extension.getURL('trustgraph.html')+'?profileId='+request.profileId;
        return browser.tabs.create({
            url: url, 
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
            return {
                tabId: tab.id,
                profileId: request.profileId,
                alreadyOpen: false
            } as IOpenDialogResult;
        });
    }
}