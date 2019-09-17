import { QueryContext, Claim } from "../../lib/dtpapi/model/models";
import IProfile from '../IProfile';
import { IdentityPopupClient } from '../Shared/IdentityPopupClient';
import PackageBuilder = require("../PackageBuilder");
import ProfileRepository = require("../ProfileRepository");


class BinaryTrustResult {
    public direct : boolean = false;
    public directValue: any;
    public trust : number =  0;
    public distrust: number = 0;
    public ratings: number = 0;
    public value: number = 0;
    public claims: Array<Claim> = [];
    public profiles: Array<IProfile> = null;

    public Clean() {
        Object.defineProperty(this, 'claims', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'queryContext', { enumerable: false, writable: true, value: null }); // No serialize to json!

        this.direct = false;
        this.directValue = 0;
        this.trust = 0;
        this.distrust = 0;
        this.value = 0;
        this.claims = [];
    }

    public calculateState() {
    }


    public processClaims(currentUserId: string) : void {
        this.claims.forEach((claim) => {   
            this.processClaim(claim, currentUserId);
        });

        if(this.ratings > 0) { // Recalculate the value based on number of ratings.
            this.value = +((this.value / this.ratings).toFixed(1)); // 1 decimal and convert to number
        }
    }

    public processClaim(claim: Claim, currentUserId: string) : void {

        if(claim.type === PackageBuilder.BINARY_TRUST_DTP1) {
            let val = (claim.value) ? claim.value.toLocaleLowerCase() : "";
            if(val === "true" || val === "1")
                this.trust++;
            
            if(val === "false" || val === "0")
                this.distrust++;

            this.value = this.trust - this.distrust;
        }

        if(claim.type === PackageBuilder.RATING_TRUST_DTP1) {
            this.ratings++;
            this.value += parseInt((claim.value) ? claim.value : "0");
        }

        if(claim.issuer.id == currentUserId)
        {
            this.direct = true;
        }
    }


    public async ensureProfileMeta(rep: ProfileRepository) : Promise<void> {
        let ids = this.claims.filter(p=>!p.issuer.meta).map(p=>p.issuer.id);
        if(ids.length == 0)
            return;

        let profiles = await rep.getProfiles(ids);

        let profileIndex = {};
        profiles.forEach((profile: IProfile) => profileIndex[profile.id] = profile);
        this.claims.forEach(claim => claim.issuer.meta = profileIndex[claim.issuer.id] );
    }

    public isEqual(source: BinaryTrustResult) : boolean {
        if(!source)
            return false;

        // Comparer
        let changed = this.claims.length != source.claims.length ? true : false;
        changed = this.direct != source.direct ? true : changed;
        changed = this.directValue != source.directValue ? true : changed;
        changed = this.distrust != source.distrust ? true : changed;
        changed = this.trust != source.trust ? true : changed;
        changed = this.value != source.value ? true : changed;

        return !changed;
    }

}

export = BinaryTrustResult