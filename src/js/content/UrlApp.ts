import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import IConfig from "../Interfaces/IConfig";
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import * as $ from 'jquery';
import Crypto = require('../Crypto');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import IProfile from "../IProfile";
import IGraphData from './IGraphData';
import Profile = require("../Profile");

class UrlApp {

    public config: IConfig = null;
    public defaultProfile : IProfile = new Profile({}); // Make sure that we do not have an empty object
    public sessionProfiles: Array<IProfile> = new Array<IProfile>();

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

                    return {
                        profiles: this.sessionProfiles,
                        queryResult: this.sessionProfiles[0].queryResult
                    }; 
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
        this.sessionProfiles.push(this.defaultProfile);
        this.config.profileRepository.setProfile(this.defaultProfile);

        let hostname = window.location.hostname;
        if(hostname != url) {
            let hostnameProfile = new Profile(<IProfile>{
                userId: Crypto.toDTPAddress(Crypto.Hash160(hostname)),
                screen_name: hostname,
                alias: hostname,
                scope: "url"
            });
            this.sessionProfiles.push(hostnameProfile);
            this.config.profileRepository.setProfile(hostnameProfile);
        }

        this.buildHtmlEntities();
    }


    buildHtmlEntities() : any {
        let profiles = {};
        $("[itemtype='http://digitaltrustprotocol.org/entity']").each((i, element) => {
            let profile = new Profile();
            profile.alias = $(element).find("[itemprop='alias']").text();
            profile.userId = $(element).find("[itemprop='entityId']").text();
            profile.aliasProof = $(element).find("[itemprop='aliasProof']").attr('itemvalue');
            profile.avatarImage = $(element).find("[itemprop='avatarImage']").attr('itemvalue');

            if(profile.alias && profile.userId && profile.aliasProof) {
                let valid = Crypto.Verify(profile.alias, profile.userId, profile.aliasProof);
                if(!valid) {
                    console.log(`Entity profile ${profile.alias} (${profile.userId}) do not have a valid signature ${profile.aliasProof}`);
                    return;
                }
            }
            if(profile.userId)
                profiles[profile.userId] = profile;
        });

        $.each(profiles, (name, value) => {
            this.sessionProfiles.push(value);
            this.config.profileRepository.setProfile(value);
        })
    }

    updateIcon(result: BinaryTrustResult) : void {
        let state = (result) ? result.state : undefined;
        if(result.state == 0 && result.trust == 0)
            state = undefined; // No trust given

        chrome.runtime.sendMessage({
            handler: 'extensionHandler',
            action: 'updateIcon',
            value: state
        });
    }

    queryProfiles() : JQueryPromise<void> {
        DTP.trace("Query profiles");
        let scope = "url";
        return this.config.dtpService.Query(this.sessionProfiles, scope).then((response, queryResult) => {
            // Process the result
            DTP.trace("Query result: "+JSON.stringify(queryResult, null, 2));
            
            this.config.trustStrategy.UpdateProfiles(queryResult, this.sessionProfiles);
            this.updateIcon(this.sessionProfiles[0].trustResult);
        });
    }


    getSanitizedUrl() : string {
        let url = window.location.href.substring(window.location.protocol.length+2);
        while(url.length > 0 && url[url.length-1] === '/') 
            url = url.slice(0, -1);
        return url;
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
