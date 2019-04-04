import * as localforage from 'localforage';
import { MessageHandler, Callback } from '../Shared/MessageHandler';

export class StorageServer {
    static action: string = "Storage";

    //private storage: LocalForage;
    private messageHandler: MessageHandler;
    private methods: { [s: string]: any };

    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;
        this.methods = {};
        this.methods["getItem"] = this.getItem;
        this.methods["setItem"] = this.setItem;
    }

    public ready(): Promise<void> {

        localforage.config({
            name        : 'DTP',
            version     : 1.0,
            storeName   : 'DTP1', // Should be alphanumeric, with underscores.
            description : 'DTP Client browser extension'
        });
        //this.storage = localforage;

        let promise = localforage.ready();
        return promise.then(() => {
            this.messageHandler.receive(StorageServer.action, (params: any, sender: any) => {
                let method = this.methods[params.method];
                if(method)
                    return method(params);
            });
        });
    }

    private handleCall

    private getItem(params: any) : Promise<any> {
        console.log(params)
        return localforage.getItem(params.key);
    }

    private setItem(params: any) : void {
        console.log(params);
        localforage.setItem(params.key, params.value);
    }

    public static command(method: string, key: string, value?: any) {
        return { 
            method: method, 
            key: key,
            value: value
        };
    }

}