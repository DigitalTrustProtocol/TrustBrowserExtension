import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupServer } from "./TrustGraphPopupServer";
import { SettingsServer } from "./SettingsServer";
import { IdentityPopupServer } from "./IdentityPopupServer";
import { PopupHandler } from "./PopupHandler";

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
let identityPopupServer = new IdentityPopupServer(messageHandler).init();
let settingsServer = new SettingsServer(messageHandler, storageServer);
storageServer.ready().then(() => {
    console.log("StorageServer ready");
    settingsServer.init();
});
