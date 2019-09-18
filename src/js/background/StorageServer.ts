import localforage from 'localforage';
import { MessageHandler, Callback } from '../Shared/MessageHandler';
import { Runtime } from 'webextension-polyfill-ts';

export class StorageServer {
    static handlerName: string = "Storage";

    //private storage: LocalForage;
    public messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};
    private whenReady: Promise<void>;

    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;
    }

    public init() : StorageServer {
        this.methods["getItem"] = (params: any, sender: Runtime.MessageSender) => this.getItem(params, sender);
        this.methods["setItem"] = (params: any, sender: Runtime.MessageSender) => this.setItem(params, sender);
        return this;
    }

    public ready(): Promise<void> {
        

        this.init();

        localforage.config({
            name        : 'DTP',
            version     : 1.0,
            storeName   : 'DTP1', // Should be alphanumeric, with underscores.
            description : 'DTP Client browser extension'
        });
        //this.storage = localforage;

        let promise = localforage.ready();

        this.whenReady = promise.then(() => {
            this.messageHandler.receive(StorageServer.handlerName, (params: any, sender: Runtime.MessageSender) => {
                let method = this.methods[params.action];
                if(method)
                    return method(params);
            });
        });
        return this.whenReady;
    }

    public getItem(params: any, sender: Runtime.MessageSender) : Promise<any> {
        console.log(params)
        return localforage.getItem(params.key);
    }

    public setItem(params: any, sender: Runtime.MessageSender) : void {
        console.log(params);
        localforage.setItem(params.key, params.value);
    }

    public static action(action: string, key: string, value?: any) {
        return { 
            action: action, 
            key: key,
            value: value
        };
    }

}