import ISubject from './Interfaces/SubjectInterface';
import PackageBuilder = require('./PackageBuilder');
import { Claim } from '../lib/dtpapi/model/Claim';
import Crypto = require("./Crypto");
import Profile = require('./Profile');
import { ModelPackage } from '../lib/dtpapi/model/models';
import IProfile from './IProfile';
import ISettings from './Interfaces/Settings.interface';
import DTPIdentity = require('./Model/DTPIdentity');

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

    isNullOrWhitespace(input) {
        return !input || !input.trim();
    }

    BuildBinaryClaim (profile: IProfile, value: string, metadata: string, scope: string, expire: number) : ModelPackage {
        let claim: Claim = null;
        if(profile.userId) {
            claim = this.packageBuilder.CreateClaim(
            this.settings.address, 
            this.SCRIPT,
            profile.userId,
            PackageBuilder.IDENTITY_TYPE_STRING,
            PackageBuilder.BINARY_TRUST_DTP1,
            scope,
            value, 
            0,
            expire,
            metadata);
        }

        let trustpackage = this.packageBuilder.CreatePackage(claim);

        if(profile.owner && profile.owner.ID) {
            let ownerClaim = this.packageBuilder.CreateClaim(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.ID, 
                PackageBuilder.IDENTITY_TYPE_DTPAddress,
                PackageBuilder.BINARY_TRUST_DTP1,
                scope,
                value, 
                0,
                expire,
                metadata);

                trustpackage.claims.push(ownerClaim);

            if(!this.isNullOrWhitespace(profile.screen_name)) { 
                let idClaim = this.packageBuilder.CreateClaim(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.ID, // Subject
                    PackageBuilder.IDENTITY_TYPE_DTPAddress, 
                    PackageBuilder.ID_IDENTITY_DTP1,
                    scope,
                    profile.userId, // Value
                    0,
                    expire,
                    metadata);

                    trustpackage.claims.push(idClaim);
            }
        }
        return trustpackage;
    }
}
export = SubjectService

