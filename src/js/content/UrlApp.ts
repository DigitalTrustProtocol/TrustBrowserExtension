import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import IConfig from "../Interfaces/IConfig";
import BinaryTrustResult from "../Model/BinaryTrustResult";
import Crypto from "../Crypto";
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import IProfile from "../IProfile";
import IGraphData from './IGraphData';
import { MessageHandler } from '../Shared/MessageHandler';
import { ProfileModal } from "../Model/ProfileModal";
import AjaxErrorParser from "../Shared/AjaxErrorParser";
import { Buffer } from 'buffer';
import { hostname } from "os";

class favIcon {
    /**
     *
     */
    constructor(public rel?: string, public href?: string,public size?: string) {
    }

    // href: string;
    // size: string;
}

export default class UrlApp {

    public config: IConfig = null;

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
        let href = window.location.href;

        let icon = this.getFavIcon(window.location.hostname);

        let profile = <IProfile>{
            id: Crypto.toDTPAddress(Crypto.Hash160(docTitle + url)),
            title: docTitle,
            //data:  Buffer.from(url, "utf8"),
            data: url,
            icon: this.getPageIcon(href, icon),
            type: 'url'
        };
        profiles.push(profile);
        this.config.profileRepository.setProfile(profile);

        this.addOrigin(profiles, url, icon);
        return this.buildHtmlEntities(profiles);
    }
    
    getPageIcon(url: string, icon: favIcon) : string {
        if(!icon || !icon.href) return null;
        return icon.href;
        //  if(url.match("https:\/\/???.com\/(.)+")) {
        //  }
     }

    addOrigin(profiles : Array<IProfile>, url: string, icon : favIcon) : Array<IProfile> {
        let origin = window.location.origin;

        if(url == origin) return; // Already added profile from url
        if(origin.match(/:\/\/$/gi)) return; // Ignore protocol only
        
        let hostnameProfile = <IProfile>{
            id: Crypto.toDTPAddress(Crypto.Hash160(origin)),
            title: origin + " (Domain)",
            //data: Buffer.from(hostname, "utf8"),
            data: origin,
            icon: (icon) ? icon.href : null,
            type: 'origin'
        };
        profiles.push(hostnameProfile);
        this.config.profileRepository.setProfile(hostnameProfile);
        return profiles;
    }


    buildHtmlEntities(profiles : Array<IProfile>) : Array<IProfile> {
        let temp : Array<IProfile> = [];

        let elements = document.querySelectorAll("[itemtype='http://digitaltrustprotocol.org/entity']");
        elements.forEach((element, key) => {
            let profile = <IProfile>{};
            profile.type = "alias";
            profile.title = element.querySelector("[itemprop='alias']").innerHTML;
            profile.id = element.querySelector("[itemprop='id']").innerHTML;
            profile.proof = element.querySelector("[itemprop='proof']").attributes.getNamedItem('itemvalue').textContent;

            if(profile.title && profile.id && profile.proof) {
                let valid = Crypto.Verify(profile.title, profile.id, profile.proof);
                if(!valid) {
                    console.log(`Entity profile ${profile.title} (${profile.id}) do not have a valid signature ${profile.proof}`);
                    return;
                }
            }
            if(profile.id)
                temp[profile.id] = profile;
        });

        elements = document.querySelectorAll("[itemtype='http://digitaltrustprotocol.org/content']");
        elements.forEach((element, key) => {
            let profile = <IProfile>{};
            profile.type = "content";
            profile.id = element.querySelector("[itemprop='id']").getAttribute('itemvalue');
            profile.title = element.querySelector("[itemprop='title']").innerText;
            profile.data = element.querySelector("[itemprop='content']").innerText;
            profile.proof = element.querySelector("[itemprop='proof']").getAttribute('itemvalue');
            profile.entityId = element.querySelector("[itemprop='entityId']").getAttribute('itemvalue');

            if(profile.title && profile.id) {
                let content = profile.entityId + profile.title + this.sanitizeSnippetContent(profile.data);

                let checkId = Crypto.toDTPAddress(Crypto.Hash160(content));
                if(checkId != profile.id) {
                    console.log(`Content ${profile.title} - ID: ${profile.id} do not match hash id of content ${checkId}`);
                    return;
                }

                if(profile.proof || profile.entityId) {
                    let valid = Crypto.Verify(profile.id, profile.entityId, profile.proof);
                    if(!valid) {
                        console.log(`Content ${profile.title} with ID (${profile.id}) from (${profile.entityId}) do not have a valid signature ${profile.proof}`);
                        return;
                    }
                }
            }
            if(profile.id)
                temp[profile.id] = profile;
        });

        for(let key in temp) {
            if (!temp.hasOwnProperty(key)) 
                continue;
            let profile = temp[key];
        
            profiles.push(profile);
            this.config.profileRepository.setProfile(profile);
        }
        
        return profiles;
    }

    sanitizeSnippetContent(text: string) : string {
        let content = text.replace(/[\r\n\t\s\f]+/g,'');
        return content;
    }

    getSanitizedUrl() : string {
        let url = window.location.href;
        while(url.length > 0 && url[url.length-1] === '/') 
            url = url.slice(0, -1);
        return url;
    }

    ready(doc: Document): Promise<void> {
        this.bindEvents();

        return Promise.resolve();
    }

    getFavIcon(hostname: string) : favIcon {
        let icons = this.getIcons();
        if(!icons || icons.length == 0) 
            //return new favIcon("https://www.google.com/s2/favicons?domain="+hostname, null);  //If no icon link is found try out google
            return null;

        for(let key in icons) {
            let item = icons[key];
            console.log("Icon:"+ item);
        }
        let icon = icons.filter(p=>p.size == "60x60").pop(); // Try to find the best match

        if(!icon)
            icon = icons.filter(p=>p.size == "96x96").pop(); // Try to find the best match
        
        if(!icon)
            icon = icons.filter(p=> p.rel.match(/apple\-/gi) || p.href.match(/apple\-/gi)).pop(); // Take the first apple size icon

        if(!icon)
            icon = icons.filter(p=> p.href.match(/(\/|^)(.)+\.ico/gi)).pop(); // Use the FavIcon.ico
        
        if(!icon)   
            icon = icons[0];   // Use what ever that is available

        console.log("Selected: "+icon);
        return icon;
    }

    getIcons() : Array<favIcon> {
        let links = document.getElementsByTagName('link');
        let icons: Array<favIcon> = [];
    
        for(let i = 0; i < links.length; i++) {
            let link = links[i];
    
            //Technically it could be null / undefined if someone didn't set it!
            //People do weird things when building pages!
            let rel = link.getAttribute('rel');
            if(rel) {
                //I don't know why people don't use indexOf more often
                //It is faster than regex for simple stuff like this
                //Lowercase comparison for safety
                if(rel.toLowerCase().indexOf('icon') > -1) {
                    let href = link.getAttribute('href');

                    //Make sure href is not null / undefined            
                    if(href) {
                        let icon = new favIcon(link.getAttribute("rel"), null, link.getAttribute("sizes"));
                        //Relative
                        //Lowercase comparison in case some idiot decides to put the 
                        //https or http in caps
                        //Also check for absolute url with no protocol
                        if(href.toLowerCase().indexOf('https:') == -1 && href.toLowerCase().indexOf('http:') == -1
                            && href.indexOf('//') != 0) {
    
                            //This is of course assuming the script is executing in the browser
                            //Node.js is a different story! As I would be using cheerio.js for parsing the html instead of document.
                            //Also you would use the response.headers object for Node.js below.
    
                            var absoluteHref = window.location.protocol + '//' + window.location.host;
    
                            //We already have a forward slash
                            //On the front of the href
                            if(href.indexOf('/') == 0) {
                                absoluteHref += href;
                            }
                            //We don't have a forward slash
                            //It is really relative!
                            else {
                                var path = window.location.pathname.split('/');
                                path.pop();
                                var finalPath = path.join('/');
    
                                absoluteHref += finalPath + '/' + href;
                            }
    
                            icon.href = absoluteHref;
                        }
                        //Absolute url with no protocol
                        else if(href.indexOf('//') == 0) {
                            var absoluteUrl = window.location.protocol + href;
    
                            icon.href = absoluteUrl;
                        }
                        //Absolute
                        else {
                            icon.href = href;
                        }

                        icons.push(icon);
                    }
                }
            }
        }
    
        return icons;
    }
}