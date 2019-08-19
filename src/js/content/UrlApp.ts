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
    public defaultProfile : IProfile = new Profile({}); // Make sure that we do not have an empty object
    public profiles: Array<IProfile> = new Array<IProfile>();

    constructor(config:IConfig) {
        this.config = config;
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
                this.updateIcon(this.defaultProfile.trustResult);
            } else {
//                this.updateIcon("dtp");
            }
        });

        browser.runtime.onMessage.addListener(async (request, sender) => {
            if(request.handler === "profileHandler") {
                if(request.action === "getProfiles") {
                    DTP.trace("Popup asked for profiles");
                    return this.profiles;
                }
            }
        });

    }

    public async requestProfileHandler(params: any, sender: Runtime.MessageSender) : Promise<IProfile> {
        return this.defaultProfile;
    }



    buildProfiles() : void {
        let url = this.getSanitizedUrl();

        this.defaultProfile = new Profile(<IProfile>{
            userId: Crypto.toDTPAddress(Crypto.Hash160(url)),
            screen_name: window.location.hostname,
            alias: url,
            scope: "url"
        });
        this.profiles.push(this.defaultProfile);
        this.config.profileRepository.setProfile(this.defaultProfile);

        
        let hostnameProfile = new Profile(<IProfile>{
            userId: Crypto.toDTPAddress(Crypto.Hash160(window.location.hostname)),
            screen_name: window.location.hostname,
            alias: window.location.hostname,
            scope: "url"
        });
        this.profiles.push(hostnameProfile);
        this.config.profileRepository.setProfile(hostnameProfile);

    }

    updateIcon(result: BinaryTrustResult) : void {
        let state = (result) ? result.state : undefined;

        chrome.runtime.sendMessage({
            handler: 'extensionHandler',
            action: 'updateIcon',
            value: state
        });
    }

    queryProfiles() : JQueryPromise<void> {
        DTP.trace("Query profiles");
        let scope = "url";
        return this.config.dtpService.Query(this.profiles, scope).then((response, queryResult) => {
            // Process the result
            DTP.trace("Query result: "+JSON.stringify(queryResult, null, 2));
            
            this.config.trustStrategy.UpdateProfiles(queryResult, this.profiles);
            this.updateIcon(this.profiles[0].trustResult);
        });
    }

    getSanitizedUrl() : string {
        return window.location.href.substring(window.location.protocol.length+2);
    }

    ready(doc: Document): JQueryPromise<void> {
        
        this.buildProfiles();

        this.queryProfiles();

        return $(doc).ready($=> {
            DTP.trace("Document ready");
            this.bindEvents();
        }).promise(null);
    }
}

export = UrlApp;
