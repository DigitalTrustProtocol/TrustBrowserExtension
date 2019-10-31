import { MessageHandler } from "./MessageHandler";
import { TrustGraphPopupServer } from "../background/TrustGraphPopupServer";
import { browser, Runtime } from "webextension-polyfill-ts";
import IProfile from "../IProfile";
import IGraphData from "../content/IGraphData";
import { ProfileModal } from "../Model/ProfileModal";

export class TrustGraphPopupClient {
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};



    public requestGraphDataHandler = (params, sender) => { return null; };
    public selectProfileHandler = (params, sender) => { return; };
    
    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;

        this.methods["requestGraphData"] = (params, sender) => { return this.requestGraphDataHandler(params, sender) };
        this.methods["selectProfile"] = (params, sender) => { this.selectProfileHandler(params, sender) };

        this.messageHandler.receive(TrustGraphPopupServer.handlerName, (params: any, sender: any) => {
            let method = this.methods[params.action];
            if (method)
                return method(params, sender);
        });

    }

   
    public requestGraphData(profileId: any): Promise<any> {
        let message = {
            action: "requestGraphData",
            profileId: profileId
        };
        return this.messageHandler.send(TrustGraphPopupServer.handlerName, message);
    }

    public selectProfile(profile: IProfile, callback?: (err: any, value: any) => void) : Promise<any>
    {
        let message = { 
                action: "selectProfile",
                profile
        };
        return this.messageHandler.send(TrustGraphPopupServer.handlerName, message, result => {
            if(callback)
                callback(null, result);
        });     
    }
    

    public openPopup(source: any) : Promise<any> {
        let opt = TrustGraphPopupServer.action("openDialog");
        
        opt['w'] = 800;
        opt['h'] = 800;
        let wLeft = window.screenLeft ? window.screenLeft : window.screenX;
        let wTop = window.screenTop ? window.screenTop : window.screenY;

        opt['left'] = Math.floor((window.screen.availWidth / 2) - (opt['w'] / 2));
        opt['top'] = Math.floor((window.screen.availHeight / 2) - (opt['h'] / 2));

        for (var key in source) {
            if (source.hasOwnProperty(key)) opt[key] = source[key];
        }

        return this.messageHandler.send(TrustGraphPopupServer.handlerName, opt);
    }
   
}