import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import IConfig from "../Interfaces/IConfig";
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import * as $ from 'jquery';
import Crypto = require('../Crypto');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import IProfile from "../IProfile";
import IGraphData from './IGraphData';
import { MessageHandler } from '../Shared/MessageHandler';
import Profile = require("../Profile");
import ProfileModal = require("../Model/ProfileModal");
import AjaxErrorParser = require("../Shared/AjaxErrorParser");

class UrlApp {

    public config: IConfig = null;
    public sessionProfiles: Array<ProfileModal> = [];
    public selectedProfileView: ProfileModal;


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
                this.updateIcon(this.selectedProfileView.trustResult);
            }
        });

        browser.runtime.onMessage.addListener(async (request, sender) => {
            if(request.handler === "profileHandler") {
                if(request.action === "getProfiles") {

                    return {
                        selectedUserId : this.selectedProfileView.profile.userId,
                        profileViews: this.sessionProfiles
                    };
                }
            }

            if(request.handler === "profileHandler") {
                if(request.params.action === "updateProfile") {

                    let pv = this.sessionProfiles.filter(p => p.profile.userId === request.params.data.profile.userId).pop();
                    if(!pv) 
                        this.sessionProfiles.push(pv = new ProfileModal());
                    
                    pv.setup(request.params.data);
                    this.selectedProfileView = pv;
                    
                    return true;
                }
            }
        });

    }


    buildProfiles() : void {
        let url = this.getSanitizedUrl();

        let defaultProfile = new Profile(<IProfile>{
            userId: Crypto.toDTPAddress(Crypto.Hash160(url)),
            screen_name: window.location.hostname,
            alias: url,
            scope: "url"
        });
        this.sessionProfiles.push(new ProfileModal(defaultProfile));
        this.config.profileRepository.setProfile(defaultProfile);

        let hostname = window.location.hostname;
        if(hostname != url) {
            let hostnameProfile = new Profile(<IProfile>{
                userId: Crypto.toDTPAddress(Crypto.Hash160(hostname)),
                screen_name: hostname,
                alias: hostname,
                scope: "url"
            });
            this.sessionProfiles.push(new ProfileModal(hostnameProfile));
            this.config.profileRepository.setProfile(hostnameProfile);
        }

        this.buildHtmlEntities();

        this.selectedProfileView = this.sessionProfiles[0];
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

        $.each(profiles, (name, profile) => {
            this.sessionProfiles.push(new ProfileModal(profile));
            this.config.profileRepository.setProfile(profile);
        })
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
        let profiles = this.sessionProfiles.map(p=>p.profile);
        return this.config.dtpService.Query(profiles, scope).then((response, queryResult) => {
            // Process the result
            DTP.trace("Query result: "+JSON.stringify(queryResult, null, 2));
            
            let trustResults = this.config.trustStrategy.createTrustResults(queryResult) || {};
            this.sessionProfiles.forEach((pv) => {
                pv.queryResult = queryResult;
                pv.trustResult = trustResults[pv.profile.userId] || new BinaryTrustResult();
            })
            this.updateIcon(this.sessionProfiles[0].trustResult);
        }).fail((xhr, errorMessage) => {
            console.log(AjaxErrorParser.formatErrorMessage(xhr, errorMessage));
        })
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
