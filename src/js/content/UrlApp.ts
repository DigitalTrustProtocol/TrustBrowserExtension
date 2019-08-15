import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import IConfig from "../Interfaces/IConfig";
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import * as $ from 'jquery';
import Crypto = require('../Crypto');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import IProfile from "../IProfile";
import Profile = require("../Profile");

class UrlApp {

    public config: IConfig = null;
    public profile : IProfile = new Profile({}); // Make sure that we do not have an empty object

    constructor(config:IConfig) {
        this.config = config;
    }


    querySingle(value: string, scope: string): JQueryPromise<BinaryTrustResult> {
        if(value  == null || value.length == 0)
            return $.Deferred<BinaryTrustResult>().resolve(null).promise();

        return this.config.dtpService.QuerySingle(value, scope).then((response, queryResult) => {
            // Process the result
            DTP.trace("Query result: "+JSON.stringify(queryResult, null, 2));

            let trustResult = this.config.trustStrategy.ProcessSingleResult(queryResult);
            DTP.trace("Trust result: "+JSON.stringify(trustResult, null, 2));

             return trustResult;
        });
    }

    bindEvents(): void {
        DTP.trace("Bind events");
        var pushState = window.history.pushState;
        window.history.pushState = function(state) {
            DTP.trace("Push fire: "+window.location.href);
            let result= pushState.apply(window.history, arguments);
            return result;
        };

        window.onpopstate = function(e){
            if(e.state){
                DTP.trace("Pop fire: "+window.location.href);
            }
        };

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible') {
                this.updateIcon(this.profile.trustResult);
            } else {
//                this.updateIcon("dtp");
            }
        });

        browser.runtime.onMessage.addListener(async (request, sender) => {
            if(request.handler === "profileHandler") {
                if(request.action === "getProfile") {
                    DTP.trace("Popup asked for profile: "+JSON.stringify(this.profile, null, 2));
                    //return this.requestProfileHandler(request, sender);
                    return this.profile;
                }
            }
        });

    }

    public async requestProfileHandler(params: any, sender: Runtime.MessageSender) : Promise<IProfile> {
        return this.profile;
    }



    buildProfile() : void {
        let url = this.getSanitizedUrl();
        let urlHash = Crypto.toDTPAddress(Crypto.Hash160(this.getSanitizedUrl()));
        // Check url even that doc is not ready!
        this.profile = new Profile(<IProfile>{
            userId: urlHash,
            screen_name: url,
            alias: url,
            scope: "url"
        });

        DTP.trace("SanitizedUrl: "+this.profile.screen_name);
        DTP.trace("Url hash: "+this.profile.userId);
    }

    updateIcon(result: BinaryTrustResult) : void {
        let state = (result) ? result.state : undefined;

        chrome.runtime.sendMessage({
            handler: 'extensionHandler',
            action: 'updateIcon',
            value: state
        });
    }

    queryProfile() : void {
        let url: string = this.profile.userId;
        DTP.trace("Check url: "+url);
        this.querySingle(url, "url").then( (result : BinaryTrustResult) => {
            this.profile.trustResult = result; // Save the result on content page
            this.updateIcon(result);
        });
    }

    getSanitizedUrl() : string {
        return window.location.href.substring(window.location.protocol.length+2);
    }

    ready(doc: Document): JQueryPromise<void> {
        
        this.buildProfile();

        this.queryProfile();

        return $(doc).ready($=> {
            DTP.trace("Document ready");
            this.bindEvents();
        }).promise(null);
    }
}

export = UrlApp;
