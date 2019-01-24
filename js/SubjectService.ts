declare var tce: any;
import ISettings from './Settings.interface';
import ISubject from './SubjectInterface';
import PackageBuilder = require('./PackageBuilder');
import { Claim } from '../lib/dtpapi/model/Claim';

class SubjectService  {
    SCRIPT: string;
    settings: ISettings;
    packageBuilder: PackageBuilder;
    subjects = [];
    constructor(settings: ISettings, packageBuilder: PackageBuilder) {
        this.SCRIPT = "secp256k1-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    ensureSubject (author) : ISubject {
        let subject = this.subjects[author];
        if (!subject) {
            subject = {
                author: author,
                address:author.hash160().toDTPAddress(),
                scope: window.location.hostname,
                type: "person",
            };
            this.subjects[author]= subject;
        }
        return subject;
    }

   enrichSubject (author, comment) : ISubject {

        let subject = this.ensureSubject(author);

        let $proof = $(comment).find("a[href*='scope=reddit']:contains('Proof')")
        if ($proof.length > 0) {
            let params = this.getQueryParams($proof.attr("href"));
            if(params['name'] == author) {
                if(!subject.owner)
                    subject.owner = params;
                
                subject.owner.author = author;

                if(typeof subject.owner.address === 'string') {
                    subject.owner.address = new tce.buffer.Buffer(subject.owner.address, 'HEX');
                }
            }
        }
        return subject;
    }
     getQueryParams(url) {
        var qparams = {},
            parts = (url || '').split('?'),
            qparts, qpart,
            i = 0;
    
        if (parts.length <= 1) {
            return qparams;
        } else {
            qparts = parts[1].split('&');
            for (let i in qparts) {
    
                qpart = qparts[i].split('=');
                qparams[decodeURIComponent(qpart[0])] =
                               decodeURIComponent(qpart[1] || '');
            }
        }
    
        return qparams;
    };
    isNullOrWhitespace(input) {
        return !input || !input.trim();
    }

    BuildBinaryClaim (profile, value: any, note, expire) {
        let claim: Claim = null;
        if(profile.screen_name) {
            claim = this.packageBuilder.CreateBinaryClaim(
            this.settings.address, 
            this.SCRIPT, 
            profile.screen_name, //profile.address.toString('base64'),
            value, 
            profile.scope,
            0,
            expire,
            note);
        }

        // if(profile.address) {
        //     trust = this.packageBuilder.CreateBinaryClaim(
        //     this.settings.address, 
        //     this.SCRIPT, 
        //     profile.address.toString('base64'), 
        //     value, 
        //     note,
        //     profile.scope,
        //     0,
        //     expire);
        // }
        
        let trustpackage = this.packageBuilder.CreatePackage(claim);

        if(profile.owner && profile.owner.address) {
            let ownerTrust = this.packageBuilder.CreateBinaryClaim(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.address, 
                value, 
                "", // Do not use scope on global identity
                0,
                expire,
                note);
                trustpackage.claims.push(ownerTrust);

            if(!this.isNullOrWhitespace(profile.alias)) { 
                let aliastrust = this.packageBuilder.CreateAliasIdentityClaim(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.address,
                    profile.alias,
                    profile.scope,
                    0,
                    expire);

                    trustpackage.claims.push(aliastrust);
            }
        }
        return trustpackage;
    }
}
export = SubjectService

