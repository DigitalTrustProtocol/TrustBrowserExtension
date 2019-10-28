import { MessageHandler } from "./MessageHandler";
import { browser, Runtime } from "webextension-polyfill-ts";
import IProfile from "../IProfile";
import IGraphData from "../content/IGraphData";
import { ProfileModal } from "../Model/ProfileModal";
import { LoginPopupBackground } from "../background/LoginPopupBackground";

export class LoginPopupClient {
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};
   
    public userAuthenticatedHandler = (params, sender) => { return; };

    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;
        this.methods["userAuthenticated"] = (params, sender) => { this.userAuthenticatedHandler(params, sender) };

        this.messageHandler.receive(LoginPopupBackground.handlerName, (params: any, sender: any) => {
            let method = this.methods[params.action];
            if (method)
                return method(params, sender);
        });
    }

    public userAuthenticated(user: any): Promise<void> {
        let message = {
            action: "userAuthenticated",
            user: user
        };
        return this.messageHandler.send(LoginPopupBackground.handlerName, message);
    }


    public setUser(user: any): Promise<any> {
        let message = {
            action: "setUser",
            user: user
        };
        return this.messageHandler.send(LoginPopupBackground.handlerName, message);
    }


    public getUser(): Promise<string> {
        let message = {
            action: "getUser"
        };
        return this.messageHandler.send(LoginPopupBackground.handlerName, message);
    }

    public static action(action: string) {
        return { 
            action: action
        };
    }

    public openPopup(source?: any) : Promise<any> {
        let opt = LoginPopupClient.action("openDialog");
        
        opt['w'] = 800;
        opt['h'] = 800;
        let wLeft = window.screenLeft ? window.screenLeft : window.screenX;
        let wTop = window.screenTop ? window.screenTop : window.screenY;

        opt['left'] = Math.floor((window.screen.availWidth / 2) - (opt['w'] / 2));
        opt['top'] = Math.floor((window.screen.availHeight / 2) - (opt['h'] / 2));

        for (var key in source) {
            if (source.hasOwnProperty(key)) opt[key] = source[key];
        }

        return this.messageHandler.send(LoginPopupBackground.handlerName, opt);
    }
   
}