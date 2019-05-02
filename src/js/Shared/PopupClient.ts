import { MessageHandler } from "./MessageHandler";
import { TrustGraphPopupServer } from "../background/TrustGraphPopupServer";
import { browser } from "webextension-polyfill-ts";
import { PopupHandler } from "../background/PopupHandler";

export class PopupClient {
    public handlerName: string;
    private messageHandler: MessageHandler;
    
    constructor(name: string, messageHandler : MessageHandler) {
        this.handlerName = name;
        this.messageHandler = messageHandler;
    }

    public openPopup(source: any) : Promise<any> {
        let opt = PopupHandler.action("openDialog");
        
        opt['w'] = 800;
        opt['h'] = 800;
        var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
        var wTop = window.screenTop ? window.screenTop : window.screenY;

        opt['left'] = Math.floor(wLeft + (window.innerWidth / 2) - (opt['w'] / 2));
        opt['top'] = Math.floor(wTop + (window.innerHeight / 2) - (opt['h'] / 2));

        for (var key in source) {
            if (source.hasOwnProperty(key)) opt[key] = source[key];
        }

        return this.messageHandler.send(this.handlerName, opt);
    }
}