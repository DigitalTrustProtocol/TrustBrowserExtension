import { browser, Windows, Runtime } from "webextension-polyfill-ts";
import { MessageHandler } from "../Shared/MessageHandler";
import * as $ from 'jquery';
import { PopupHandler } from "./PopupHandler";

export class IdentityPopupServer {
    private handlerName: string = "IdentityPopup";
    private popupHandler: PopupHandler;

    constructor(messageHandler: MessageHandler) {
        this.popupHandler = new PopupHandler("IdentityPopup", "IdentityPopup.html", messageHandler);
    }

    init() : void {
        this.popupHandler.init();
    }

}
