declare var tce: any;
import ISettings from './Settings.interface';
import ISubject from './SubjectInterface';
import PackageBuilder = require('./PackageBuilder');
import { Claim } from '../lib/dtpapi/model/Claim';
import Crypto = require("./Crypto");
import Profile = require('./Profile');
import { ModelPackage } from '../lib/dtpapi/model/models';

class SubjectService  {
    SCRIPT: string;
    settings: ISettings;
    packageBuilder: PackageBuilder;
    subjects: Array<ISubject> = [];
    constructor(settings: ISettings, packageBuilder: PackageBuilder) {
        this.SCRIPT = "secp256k1-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

//     ensureSubject (author) : ISubject {
//         let subject = this.subjects[author];
//         if (!subject) {
//             subject = {
//                 author: author,
//                 address:Crypto.Hash160(author).toDTPAddress(),
//                 scope: window.location.hostname,
//                 type: "person",
//             };
//             this.subjects[author]= subject;
//         }
//         return subject;
//     }

//    enrichSubject (author, comment) : ISubject {

//         let subject = this.ensureSubject(author);

//         let $proof = $(comment).find("a[href*='scope=reddit']:contains('Proof')")
//         if ($proof.length > 0) {
//             let params = this.getQueryParams($proof.attr("href"));
//             if(params['name'] == author) {
//                 if(!subject.owner)
//                     subject.owner = params;
                
//                 subject.owner.author = author;

//                 if(typeof subject.owner.address === 'string') {
//                     subject.owner.address = new tce.buffer.Buffer(subject.owner.address, 'HEX');
//                 }
//             }
//         }
//         return subject;
//     }

    //  getQueryParams(url) {
    //     var qparams = {},
    //         parts = (url || '').split('?'),
    //         qparts, qpart,
    //         i = 0;
    
    //     if (parts.length <= 1) {
    //         return qparams;
    //     } else {
    //         qparts = parts[1].split('&');
    //         for (let i in qparts) {
    
    //             qpart = qparts[i].split('=');
    //             qparams[decodeURIComponent(qpart[0])] =
    //                            decodeURIComponent(qpart[1] || '');
    //         }
    //     }
    
    //     return qparams;
    // };

    isNullOrWhitespace(input) {
        return !input || !input.trim();
    }

    BuildBinaryClaim (profile: Profile, value: string, note: string, expire: number) : ModelPackage {
        let claim: Claim = null;
        if(profile.userId) {
            claim = this.packageBuilder.CreateBinaryClaim(
            this.settings.address, 
            this.SCRIPT, 
            profile.userId, 
            value, 
            profile.scope,
            0,
            expire,
            note);
        }

        let trustpackage = this.packageBuilder.CreatePackage(claim);

        if(profile.owner && profile.owner.ID) {
            let ownerClaim = this.packageBuilder.CreateBinaryClaim(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.ID, 
                value, 
                profile.scope,
                0,
                expire,
                note);
                trustpackage.claims.push(ownerClaim);

            if(!this.isNullOrWhitespace(profile.screen_name)) { 
                let idClaim = this.packageBuilder.CreateIDIdentityClaim(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.ID,
                    profile.userId,
                    profile.scope,
                    0,
                    expire);

                    trustpackage.claims.push(idClaim);
            }
        }
        return trustpackage;
    }
}
export = SubjectService

