import  PackageBuilder = require('./PackageBuilder');
import ISettings from './Settings.interface';

class TrustHandler  {
    settings: ISettings;
    package: any;
    subjects: any[];
    alias: any[];
    packageBuilder: PackageBuilder;
    
    constructor(trustpackage, settings: ISettings) {
        console.log('trust', trustpackage)
        if(!trustpackage) 
        trustpackage = { trusts: [] };

        this.settings = settings;
        this.package = trustpackage;
        this.subjects = [];
        this.alias = [];
        this.packageBuilder = new PackageBuilder(settings);
    }

    BuildSubjects() {
        
        if(!this.package.trusts)
        {
            return;
        }

        for(let trustIndex in this.package.trusts)
        {
            let trust = this.package.trusts[trustIndex];

            if(trust.type === this.packageBuilder.BINARY_TRUST_DTP1) {
                var list = this.subjects[trust.subject.address];

                if(!list) {
                    list = [];
                    this.subjects[trust.subject.address] = list;
                } 

                list.push(trust);
            }

            if(trust.type === this.packageBuilder.ALIAS_IDENTITY_DTP1) {
                let list = this.alias[trust.subject.address];

                if(!list) {
                    list = [];
                    this.alias[trust.subject.address] = list;
                } 

                list.push(trust);
            }

        }
    }


    CalculateBinaryTrust(subjectAddress, ownerAddress) {
        //var self = this;
        let result = {
            direct : false,
            directValue: undefined,
            trust : 0,
            distrust: 0,
            state: 0
        };

        let binaryTrustCount = 0;
        
        let subjectTrusts = this.subjects[subjectAddress];
        let ownerTrusts = this.subjects[ownerAddress];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts, pkgBuilder, settings) {
            if(!trusts) return;
            for(let i in trusts) {
                let trust = subjectTrusts[i];
                if(trust.type === pkgBuilder.BINARY_TRUST_DTP1) {
                    binaryTrustCount ++;

                    if(trust.claim === true) 
                        result.trust++;
                    else
                        result.distrust++;
                                    // IssuerAddress is base64
                    if(trust.issuer.address == settings.address)
                    {
                        result.direct = true;
                        result.directValue = trust.claim;
                    }
                }
            }
        }
        
        CalcTrust(subjectTrusts, this.packageBuilder, this.settings);   
        CalcTrust(ownerTrusts, this.packageBuilder, this.settings); 

        result.state = result.trust - result.distrust;

        return result;
    }
 
    CalculateBinaryTrust2 (subjectAddress, ownerAddress) {
        //let self = this;
        let result = {
            networkScore : 0,
            personalScore: 0,
        };
        //var binaryTrustCount = 0;
        
        let subjectTrusts = this.subjects[subjectAddress];
        let ownerTrusts = this.subjects[ownerAddress];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts, pkgBuilder, settings) {
            if(!trusts) return;
            for(const key in trusts) {
                const trust = trusts[key];

                if(trust.type != pkgBuilder.BINARY_TRUST_DTP1)
                    continue;

                //binaryTrustCount ++;

                if(trust.issuer.address == settings.address) { // Its your trust!
                    result.personalScore += (trust.claim) ? 1 : -1;
                } else {
                    result.networkScore += (trust.claim) ? 1 : -1;
                }
            }
        }
        CalcTrust(subjectTrusts, this.packageBuilder, this.settings);   
        CalcTrust(ownerTrusts, this.packageBuilder, this.settings);
        
        if (result.personalScore != 0) {
            result.networkScore = result.personalScore;
        }

        //result.trustPercent = Math.floor((result.networkScore * 100) / binaryTrustCount);

        return result;
    }
}
export = TrustHandler