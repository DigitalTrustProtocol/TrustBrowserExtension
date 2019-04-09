import { StorageServer } from "./StorageServer";
import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupServer } from "./TrustGraphPopupServer";
import { SettingsServer } from "./SettingsServer";

let messageHandler = new MessageHandler();
let storageServer = new StorageServer(messageHandler);
let trustGraphPopupServer = new TrustGraphPopupServer(messageHandler).init();
let settingsServer = new SettingsServer(messageHandler, storageServer);
storageServer.ready().then(() => {
    console.log("StorageServer ready");
    settingsServer.init();
});
