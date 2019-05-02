import { PopupClient } from "./PopupClient";
import { MessageHandler } from "./MessageHandler";

export class IdentityPopupClient {

    private popupClient: PopupClient;

    constructor(messageHandler : MessageHandler) {
        this.popupClient = new PopupClient("IdentityPopup", messageHandler);
    }

    openDialog(url: string, text: string) {
        this.popupClient.openPopup(
            { 
                "url": url,
                "text": text
            } 
            );
    }

}
