declare var DTP: any;
/// TS_IGNORE
import Profile = require('./Profile'); //declare var DTP: any;
import DTPIdentity = require('./Model/DTPIdentity');
import IProfile from './IProfile';
class ProfileRepository {
    profiles: Array<IProfile> = [];
    index: Array<IProfile> = [];
    storage: any;
    constructor(storage: any) {
        this.storage = storage;
    }

    getCacheKey(id: string): string {
        return 'Twitter' + id;
    }

    getProfileDirect(id: string): IProfile {
        let profile: IProfile = this.profiles[id]; // Quick cache
        if (profile)
            return profile;

        let data = this.storage.getItem(this.getCacheKey(id));
        if (!data) 
            return null;

        profile = new Profile(JSON.parse(data));
            
        this.profiles[id] = profile; // Save to quick cache
        return profile;
    }

    getProfile(id: string): IProfile {
        let profile = this.getProfileDirect(id);
        if(profile == null) 
            profile = this.getProfileByIndex(id);
    
        return profile;
    }

    setProfile(profile: IProfile): void {
        this.profiles[profile.userId] = profile;
        let data = JSON.stringify(profile);
        this.storage.setItem(this.getCacheKey(profile.userId), data);

        if(profile.owner) {
            this.setIndexKey(profile);
        }
    }

    setProfiles(profiles: Array<IProfile>): void {
        profiles.forEach((profile) => {
            this.setProfile(profile);
        });
    }

    ensureProfile(id: string, source?: any): IProfile {
        let profile : IProfile = this.getProfile(id);
        if (!profile) {
            const data = (source) ? source : { userId: id};
            profile = new Profile(data);
            this.setProfile(profile);
            DTP['trace']('Profile ' + profile.userId + ' created');
        }
        return profile;
    }

    getSessionProfiles(): Array<IProfile> {
        return this.profiles;
    }

    // Get Profile by a index key
    getProfileByIndex(key: string) : IProfile
    {
        let profile: IProfile = this.index[key]; // Quick cache
        if (profile)
            return profile;

        let data = this.storage.getItem(this.getCacheKey(key));
        if (!data) 
            return null;

        let identity: DTPIdentity = JSON.parse(data);
        if(!identity || !identity.PlatformID) 
            return null;

        profile = this.getProfile(identity.PlatformID); 
        if (!profile)
            return null;

        if(profile.owner && profile.owner.ID != identity.ID)
            return null; // More checks may be needed!

        this.index[key] = profile;
        
        return profile;
    }

    // Only store the profile id
    setIndexKey(profile: IProfile): void {
        this.index[profile.owner.ID] = profile;
        profile.owner.PlatformID = profile.userId;
        this.storage.setItem(this.getCacheKey(profile.owner.ID), JSON.stringify(profile.owner));
    }


}
export = ProfileRepository