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
    //public profiles: Array<IProfile> = [];

    constructor(config:IConfig) {
        this.config = config;
    }

    bindEvents(): void {
        browser.runtime.onMessage.addListener(async (request, sender) => {
            if(request.handler === "profileHandler") {
                if(request.action === "getProfiles") {

                    return {
                        profiles: this.buildProfiles()
                    };
                }
            }

        });

    }


    buildProfiles() : Array<IProfile> {
        let url = this.getSanitizedUrl();
        let profiles: Array<IProfile> = [];
        let docTitle = window.document.title;
        let hostname = window.location.origin;

        let profile = <IProfile>{
            id: Crypto.toDTPAddress(Crypto.Hash160(docTitle+url)),
            title: docTitle,
            //data:  Buffer.from(url, "utf8"),
            data: url,
            type: 'url'
        };
        profiles.push(profile);
        this.config.profileRepository.setProfile(profile);

        // let hostnameProfile = <IProfile>{
        //     id: Crypto.toDTPAddress(Crypto.Hash160(hostname)),
        //     title: '',
        //     //data: Buffer.from(hostname, "utf8"),
        //     data: hostname,
        //     type: 'url'
        // };
        // this.profiles.push(hostnameProfile);
        // this.config.profileRepository.setProfile(hostnameProfile);

        return this.buildHtmlEntities(profiles);
    }


    buildHtmlEntities(profiles : Array<IProfile>) : Array<IProfile> {
        let temp : Array<IProfile> = [];
        $("[itemtype='http://digitaltrustprotocol.org/entity']").each((i, element) => {
            let profile = <IProfile>{};
            profile.type = "alias";
            profile.title = $(element).find("[itemprop='alias']").text();
            profile.id = $(element).find("[itemprop='id']").text();
            let proof = $(element).find("[itemprop='proof']").attr('itemvalue');

            if(profile.title && profile.id && proof) {
                let valid = Crypto.Verify(profile.title, profile.id, proof);
                if(!valid) {
                    console.log(`Entity profile ${profile.title} (${profile.id}) do not have a valid signature ${proof}`);
                    return;
                }
            }
            if(profile.id)
                temp[profile.id] = profile;
        });

        $.each(temp, (name, profile) => {
            profiles.push(profile);
            this.config.profileRepository.setProfile(profile);
        })
        return profiles;
    }

    getSanitizedUrl() : string {
        let url = window.location.href;
        while(url.length > 0 && url[url.length-1] === '/') 
            url = url.slice(0, -1);
        return url;
    }

    ready(doc: Document): JQueryPromise<void> {
        return $(doc).ready($=> {
            this.bindEvents();
        }).promise(null);
    }
}