///<reference path="../typings/globals/jquery/index.d.ts" />
declare var tce: any;
import ISettings from './Settings.interface';
import ISubject from './SubjectInterface';

class SubjectService  {
    SCRIPT: string;
    settings: ISettings;
    packageBuilder: any;
    subjects = [];
    constructor(settings: ISettings, packageBuilder) {
        this.SCRIPT = "btc-pkh";
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

    BuildBinaryTrust (profile, value, note, expire) {
        let trust = undefined;
        if(profile.screen_name) {
            trust = this.packageBuilder.CreateBinaryTrust(
            this.settings.address, 
            this.SCRIPT, 
            profile.screen_name, //profile.address.toString('base64'),
            value, 
            note,
            profile.scope,
            0,
            expire);
        }

        // if(profile.address) {
        //     trust = this.packageBuilder.CreateBinaryTrust(
        //     this.settings.address, 
        //     this.SCRIPT, 
        //     profile.address.toString('base64'), 
        //     value, 
        //     note,
        //     profile.scope,
        //     0,
        //     expire);
        // }
        
        let trustpackage = this.packageBuilder.CreatePackage(trust);

        if(profile.owner && profile.owner.address) {
            let ownerTrust = this.packageBuilder.CreateBinaryTrust(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.address, 
                value, 
                note,
                "", // Do not use scope on global identity
                0,
                expire);
                trustpackage.trusts.push(ownerTrust);

            if(!this.isNullOrWhitespace(profile.alias)) { 
                let aliastrust = this.packageBuilder.CreateAliasIdentityTrust(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.address,
                    { alias: profile.alias },
                    profile.scope,
                    0,
                    expire);

                    trustpackage.trusts.push(aliastrust);
            }
        }
        return trustpackage;
    }
}
export = SubjectService

