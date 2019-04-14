/**
 * @author Carsten Keutmann
 * 
 * Original code from 
 * License: zlib/libpng
 * Santo Pfingsten
 * @see https://github.com/Lusito/forget-me-not
 */
import { browser, Runtime } from "webextension-polyfill-ts";

// fixme: types
export type Callback = (params: any, sender: Runtime.MessageSender) => any;
// // export type Callback = (params: any, sender?: browser.runtime.MessageSender) => any;

export interface ReceiverHandle {
    destroy(): void;
}

export type CallbacksMap = { [s: string]: Callback };

export class MessageHandler {
    private callbacksMap: CallbacksMap | null = null;

    private noop = (reason) => { alert(reason); };

    constructor() {
        this.callbacksMap = {};
        //browser.runtime.onMessage.addListener(this.handleMessage);
        browser.runtime.onMessage.addListener((request, sender) => {
            const callback = this.callbacksMap[request.handler];
            if(callback) 
                    return callback(request.params, sender);
        });
    }
   
    private handleMessage(request, sender) : void | Promise<any> {
        const callback = this.callbacksMap[request.handler];
        if(callback) 
                return callback(request.params, sender);
    }

    public send(name: string, params?: any, callback?: (value: any) => any) : Promise<any> {
        const data = {
            handler: name,
            params
        };
        const promise = browser.runtime.sendMessage(data);
        if (callback)
            promise.then(callback);
        promise.catch(this.noop);
        return promise;
    }

    public sendTab(tabId: number, handler: string, params?: any, callback?: (value: any) => any) : Promise<any> {
        const data = {
            handler: handler,
            params
        };
        const promise = browser.tabs.sendMessage(tabId, data);
        if (callback)
            promise.then(callback);
        promise.catch(this.noop);
        return promise;
    }

    public sendSelf(name: string, params: any) : void {
        const callback = this.callbacksMap[name];
        callback(params, {});
    } 

    public receive(name: string, callback: Callback): ReceiverHandle {
        this.callbacksMap[name] = callback;
        return {
            destroy() {
                // const index = callbacks.indexOf(callback);
                // if (index !== -1)
                //     callbacks.splice(index, 1);
            }
        };
    }

    public clearCallbacksMap() {
        this.callbacksMap = null;
    }
}
