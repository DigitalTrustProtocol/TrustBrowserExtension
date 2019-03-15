/// TS_IGNORE
import Profile = require('./Profile'); //declare var DTP: any;
import DTPIdentity = require('./Model/DTPIdentity');
import IProfile from './IProfile';
class ProfileRepository {
    settings: any;
    profiles: Array<IProfile> = [];
    index: Array<IProfile> = [];
    storage: any;
    constructor(settings: any, storage: any) {
        this.settings = settings;
        this.storage = storage;
    }

    getCacheKey(id: string): string {
        return 'Twitter' + this.settings.address + id;
    }

    getProfile(id: string): IProfile {
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

    setProfile(profile: IProfile): void {
        this.profiles[profile.userId] = profile;
        try {
            let data = JSON.stringify(profile);
            this.storage.setItem(this.getCacheKey(profile.userId), data);
            
        } catch (error) {
            console.log(error);
        }
    }

    ensureProfile(id: string): IProfile {
        let profile : IProfile = this.getProfile(id);
        if (!profile) {
            profile = new Profile({ userId: id} as IProfile) ;
            this.setProfile(profile);
            DTP['trace']('Profile ' + profile.userId + ' created');
        }
        return profile;
    }

    update(settings): void {
        this.settings = settings;
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
    setIndexKey(identity: DTPIdentity, profile: IProfile): void {
        this.index[identity.ID] = profile;
        identity.PlatformID = profile.userId;
        this.storage.setItem(this.getCacheKey(identity.ID), JSON.stringify(identity));
    }


}
export = ProfileRepository