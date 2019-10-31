import PackageBuilder from "./PackageBuilder";
import { Claim } from '../lib/dtpapi/model/Claim';
import Crypto from "./Crypto";
import { ModelPackage } from '../lib/dtpapi/model/ModelPackage';
import IProfile from './IProfile';
import ISettings from './Interfaces/Settings.interface';
import { ProfileModal } from "./Model/ProfileModal";
import { Buffer } from 'buffer';

export default class SubjectService  {
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
                (profileView.score) ? profileView.score+'' : '', 
                0,
                expire,
                profileView.note);

            claim.subject.meta = profile;
        }

        return claim;
    }


    CreateBinaryClaim (profileView: ProfileModal, value: string, scope: string, expire: number) : ModelPackage {
        let claim: Claim = null;
        let profile = profileView.profile;
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
            profileView.note);
        }
        return claim;
    }

    public addAliasClaim(profileView: ProfileModal, scope: string, expire: number, trustPackage: ModelPackage) : void {
        if(!this.settings.aliasChanged)
            return;

        trustPackage.claims.push(this.CreateAliasClaim(profileView, scope, expire));
        this.settings.aliasChanged = false;
    }

    public addIconClaim(profileView: ProfileModal, scope: string, expire: number, trustPackage: ModelPackage) : void {
        if(!this.settings.iconChanged)
            return;

        trustPackage.claims.push(this.CreateIconClaim(profileView, scope, expire));
        this.settings.iconChanged = false;
    }

    CreateAliasClaim (profileView: ProfileModal, scope: string, expire: number) : Claim {
        let claim: Claim = null;
        let profile = profileView.profile;
        if(profile.id) {
            claim = this.packageBuilder.CreateClaim(
            this.settings.address,
            PackageBuilder.IDENTITY,
            this.settings.address,
            PackageBuilder.THING,
            PackageBuilder.ALIAS,
            scope,
            this.settings.alias,
            0,
            expire,
            "");
        }

        return claim;
    }

    CreateIconClaim (profileView: ProfileModal, scope: string, expire: number) : Claim {
        let claim: Claim = null;
        let profile = profileView.profile;
        if(profile.id) {
            claim = this.packageBuilder.CreateClaim(
            this.settings.address,
            PackageBuilder.IDENTITY,
            this.settings.address,
            PackageBuilder.THING,
            PackageBuilder.ICON_IDENTITY_DTP1,
            scope,
            this.settings.icon,
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
