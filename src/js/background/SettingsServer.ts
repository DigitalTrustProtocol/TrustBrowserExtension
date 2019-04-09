import * as localforage from 'localforage';
import { MessageHandler, Callback, CallbacksMap } from '../Shared/MessageHandler';
import { StorageServer } from './StorageServer';
import { Runtime } from "webextension-polyfill-ts";


export class SettingsServer {
    static handlerName: string = "Settings";

    //private storage: LocalForage;
    private messageHandler: MessageHandler;
    private storageServer: StorageServer;
    private methods: CallbacksMap = {};

    constructor(messageHandler : MessageHandler, storageServer: StorageServer) {
        this.messageHandler = messageHandler;
        this.storageServer = storageServer;
    }

    public init() : SettingsServer {
        this.methods["getItem"] = (params: any, sender: Runtime.MessageSender) => this.getItem(params, sender);
        this.methods["setItem"] = (params: any, sender: Runtime.MessageSender) => this.setItem(params, sender);
        this.messageHandler.receive(SettingsServer.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if(method)
                return method(params, sender);
        });

        return this;
    }

    public getItem(params: any, sender: Runtime.MessageSender) : Promise<any> {
        return this.storageServer.getItem(params, sender);
    }

    public setItem(params: any, sender: Runtime.MessageSender) : void {
        
        this.storageServer.setItem(params, sender);
    }

    public static action(action: string, key: string, value?: any) {
        return { 
            action: action, 
            key: key,
            value: value
        };
    }
}