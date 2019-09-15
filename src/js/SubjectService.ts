import ISubject from './Interfaces/SubjectInterface';
import PackageBuilder = require('./PackageBuilder');
import { Claim } from '../lib/dtpapi/model/Claim';
import Crypto = require("./Crypto");
import { ModelPackage } from '../lib/dtpapi/model/models';
import IProfile from './IProfile';
import ISettings from './Interfaces/Settings.interface';
import ProfileModal = require('./Model/ProfileModal');
import { Buffer } from 'buffer';

class SubjectService  {
    settings: ISettings;
    packageBuilder: PackageBuilder;

    constructor(settings: ISettings, packageBuilder: PackageBuilder) {
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    isNullOrWhitespace(input) {
        return !input || !input.trim();
    }

    CreatePackage(claims?: any) : ModelPackage {
        return this.packageBuilder.CreatePackage(claims);
    }

    CreateRatingClaim (profileView: ProfileModal, scope: string, expire: number) : Claim {
        let claim: Claim = null;
        let profile = profileView.profile;
        if(profile.id) {
            claim = this.packageBuilder.CreateClaim(
                this.settings.address,
                PackageBuilder.IDENTITY,
                profile.id,
                PackageBuilder.THING,
                PackageBuilder.RATING_TRUST_DTP1,
                scope,
                profileView.ratingValue.toString(), 
                0,
                expire,
                profileView.metadata);

            claim.subject.meta = <IProfile>{
                data: profileView.profile.data,
                title: profileView.profile.title
            };
        }

        return claim;
    }


    CreateBinaryClaim (profile: IProfile, value: string, metadata: string, scope: string, expire: number) : ModelPackage {
        let claim: Claim = null;
        if(profile.id) {
            claim = this.packageBuilder.CreateClaim(
            this.settings.address,
            PackageBuilder.IDENTITY,
            profile.id,
            PackageBuilder.THING,
            PackageBuilder.BINARY_TRUST_DTP1,
            scope,
            value, 
            0,
            expire,
            metadata);
        }
        return claim;
    }

    public addAliasClaim(profileView: ProfileModal, scope: string, expire: number, trustPackage: ModelPackage) : void {
        if(!this.settings.aliasChanged)
            return;

        trustPackage.claims.push(this.CreateAliasClaim(profileView, scope, expire));
    }

    CreateAliasClaim (profileView: ProfileModal, scope: string, expire: number) : Claim {
        let claim: Claim = null;
        let profile = profileView.profile;
        if(profile.id) {
            claim = this.packageBuilder.CreateClaim(
            this.settings.address,
            PackageBuilder.IDENTITY,
            this.settings.address,
            PackageBuilder.IDENTITY,
            PackageBuilder.ALIAS,
            scope,
            profile.title,
            0,
            expire,
            "");
        }

        return claim;
    }

    public addSourceClaim(profileView: ProfileModal, scope: string, expire: number, trustPackage: ModelPackage) : void {
        let profile = profileView.profile;
        
        
        


        trustPackage.claims.push(this.CreateAliasClaim(profileView, scope, expire));
    }


}

export = SubjectService

