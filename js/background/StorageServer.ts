import * as localforage from 'localforage';
import { MessageHandler, Callback } from '../Shared/MessageHandler';

export class StorageServer {
    static handlerName: string = "Storage";

    //private storage: LocalForage;
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any } = {};

    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;
    }

    public init() : StorageServer {
        this.methods["getItem"] = this.getItem;
        this.methods["setItem"] = this.setItem;
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
        return promise.then(() => {
            this.messageHandler.receive(StorageServer.handlerName, (params: any, sender: any) => {
                let method = this.methods[params.action];
                if(method)
                    return method(params);
            });
        });
    }

    private getItem(params: any) : Promise<any> {
        console.log(params)
        return localforage.getItem(params.key);
    }

    private setItem(params: any) : void {
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