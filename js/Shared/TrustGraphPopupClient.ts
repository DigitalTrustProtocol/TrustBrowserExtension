import { MessageHandler } from "./MessageHandler";
import { TrustGraphPopupServer } from "../background/TrustGraphPopupServer";
import { browser } from "webextension-polyfill-ts";

export class TrustGraphPopupClient {
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};

    public showSubject = (params, sender) => { return; };
    public updateContent = (params, sender) => { return; };
    
    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;

        this.methods["showSubject"] = (params, sender) => { this.showSubject(params, sender) };
        this.methods["updateContent"] = (params, sender) => { this.updateContent(params, sender) };

        this.messageHandler.receive(TrustGraphPopupServer.handlerName, (params: any, sender: any) => {
            let method = this.methods[params.action];
            if (method)
                return method(params, sender);
        });

    }

    public requestData() : Promise<any> {
        return this.messageHandler.send(TrustGraphPopupServer.handlerName, TrustGraphPopupServer.action("requestData"));
    }

    public openPopup(source: any) : Promise<any> {
        let opt = TrustGraphPopupServer.action("openDialog");
        
        opt['w'] = 800;
        opt['h'] = 800;
        var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
        var wTop = window.screenTop ? window.screenTop : window.screenY;

        opt['left'] = Math.floor(wLeft + (window.innerWidth / 2) - (opt['w'] / 2));
        opt['top'] = Math.floor(wTop + (window.innerHeight / 2) - (opt['h'] / 2));

        for (var key in source) {
            if (source.hasOwnProperty(key)) opt[key] = source[key];
        }

        return this.messageHandler.send(TrustGraphPopupServer.handlerName, opt);
    }


    public sendUpdateContentMessage(tabId: any) : Promise<any>
    {
        let message = { 
            handler: TrustGraphPopupServer.handlerName,
            params: {
                action: "updateContent"
            }
        };
        return browser.tabs.sendMessage(tabId, message);
    }


    
}