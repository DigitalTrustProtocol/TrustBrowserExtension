import IStorage from "../Interfaces/IStorage";
import { MessageHandler } from "./MessageHandler";
import { StorageServer } from "../background/StorageServer";

export class StorageClient implements IStorage {
    //public action: string = "Storage";
    private messageHandler: MessageHandler;
    
    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;
    }

    public getItem<T>(key: string, callback?: (err: any, value: T) => void): Promise<T> {
        let param = StorageServer.command("getItem", key);
        return this.messageHandler.send(StorageServer.action, param, result => {
            if(callback)
                callback(null, result);
        });     
    }

    public setItem<T>(key: string, value: T, callback?: (err: any, value: T) => void): Promise<T> {
        let param = StorageServer.command("setItem", key, value);
        return this.messageHandler.send(StorageServer.action, param, result => {
            if(callback)
                callback(null, result);
        });     
    }


}

