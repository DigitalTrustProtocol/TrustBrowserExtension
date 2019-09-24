import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import IConfig from "../Interfaces/IConfig";
import BinaryTrustResult from "../Model/BinaryTrustResult";
import $ = require('jquery');
import Crypto from "../Crypto";
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import IProfile from "../IProfile";
import IGraphData from './IGraphData';
import { MessageHandler } from '../Shared/MessageHandler';
import { ProfileModal } from "../Model/ProfileModal";
import AjaxErrorParser from "../Shared/AjaxErrorParser";
import { Buffer } from 'buffer';

export default class UrlApp {

    public config: IConfig = null;
    public profiles: Array<IProfile> = [];
    //public selectedProfileView: ProfileModal;


    constructor(config:IConfig) {
        this.config = config;
    }

    bindEvents(): void {
        // var pushState = window.history.pushState;
        // window.history.pushState = function(state) {
        //     DTP.trace("Push fire: "+window.location.href);
        //     let result= pushState.apply(window.history, arguments);
        //     return result;
        // };

        // window.onpopstate = function(e){
        //     if(e.state){
        //         DTP.trace("Pop fire: "+window.location.href);
        //     }
        // };

        // document.addEventListener("visibilitychange", () => {
        //     if (document.visibilityState === 'visible') {
        //         this.updateIcon(this.selectedProfileView.trustResult);
        //     }
        // });

        browser.runtime.onMessage.addListener(async (request, sender) => {
            if(request.handler === "profileHandler") {
                if(request.action === "getProfiles") {

                    return {
                        //selectedUserId : this.selectedProfileView.profile.id,
                        profiles: this.profiles
                    };
                }
                
                // if(request.params.action === "updateProfile") {

                //     let pv = this.sessionProfiles.filter(p => p.profile.id === request.params.data.profile.userId).pop();
                //     if(!pv) 
                //         this.sessionProfiles.push(pv = new ProfileModal());
                    
                //     pv.setup(request.params.data);
                //     //this.selectedProfileView = pv;
                    
                //     return true;
                // }
                
                // if(request.params.action === "resetProfiles") {

                //     this.sessionProfiles = [];
                //     this.buildProfiles();
                    
                //     return true;
                // }
            }

        });

    }


    buildProfiles() : void {
        let url = this.getSanitizedUrl();

        let docTitle = window.document.title;
        let hostname = window.location.origin;

        if(hostname != url) {
            let profile = <IProfile>{
                id: Crypto.toDTPAddress(Crypto.Hash160(docTitle+url)),
                title: docTitle,
                data:  Buffer.from(url, 'UTF8'),
                type: 'url'
            };
            this.profiles.push(profile);
            this.config.profileRepository.setProfile(profile);
        }

        let hostnameProfile = <IProfile>{
            id: Crypto.toDTPAddress(Crypto.Hash160(hostname)),
            title: '',
            data: Buffer.from(hostname, 'UTF8'),
            type: 'url'
        };
        this.profiles.push(hostnameProfile);
        this.config.profileRepository.setProfile(hostnameProfile);

        this.buildHtmlEntities();

        //this.selectedProfileView = this.sessionProfiles[0];
    }


    buildHtmlEntities() : any {
        let profiles = {};
        $("[itemtype='http://digitaltrustprotocol.org/entity']").each((i, element) => {
            let profile = <IProfile>{};
            profile.type = "alias";
            profile.title = $(element).find("[itemprop='alias']").text();
            profile.id = $(element).find("[itemprop='id']").text();
            let proof = $(element).find("[itemprop='aliasProof']").attr('itemvalue');

            if(profile.title && profile.id && proof) {
                let valid = Crypto.Verify(profile.title, profile.id, proof);
                if(!valid) {
                    console.log(`Entity profile ${profile.title} (${profile.id}) do not have a valid signature ${proof}`);
                    return;
                }
            }
            if(profile.id)
                profiles[profile.id] = profile;
        });

        $.each(profiles, (name, profile) => {
            this.profiles.push(profile);
            this.config.profileRepository.setProfile(profile);
        })
    }

    // updateIcon(result: BinaryTrustResult) : void {
    //     let state = (result) ? result.state : undefined;

    //     chrome.runtime.sendMessage({
    //         handler: 'extensionHandler',
    //         action: 'updateIcon',
    //         value: state
    //     });
    // }

    // queryProfiles() : JQueryPromise<void> {
    //     DTP.trace("Query profiles");
    //     let scope = "url";
    //     let profiles = this.sessionProfiles.map(p=>p.profile);
    //     return this.config.dtpService.Query(profiles, scope).then((queryResult) => {
    //         // Process the result
    //         DTP.trace("Query result: "+JSON.stringify(queryResult.body, null, 2));
            
    //         let trustResults = this.config.trustStrategy.createTrustResults(queryResult.body) || {};
    //         this.sessionProfiles.forEach((pv) => {
    //             pv.queryResult = queryResult.body;
    //             pv.trustResult = trustResults[pv.profile.id] || new BinaryTrustResult();
    //         })
    //         //this.updateIcon(this.sessionProfiles[0].trustResult);
    //     }).fail((xhr, errorMessage) => {
    //         console.log(AjaxErrorParser.formatErrorMessage(xhr, errorMessage));
    //     })
    // }


    getSanitizedUrl() : string {
        let url = window.location.href;
        while(url.length > 0 && url[url.length-1] === '/') 
            url = url.slice(0, -1);
        return url;
    }

    ready(doc: Document): JQueryPromise<void> {
        
        this.buildProfiles();

        //this.queryProfiles();
        
        return $(doc).ready($=> {
            this.bindEvents();
        }).promise(null);
    }
}