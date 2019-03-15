/// TS_IGNORE
import Profile = require('./Profile'); //declare var DTP: any;
import DTPIdentity = require('./Model/DTPIdentity');
class ProfileRepository {
    settings: any;
    profiles: Array<Profile> = [];
    index: Array<Profile> = [];
    storage: any;
    constructor(settings: any, storage: any) {
        this.settings = settings;
        this.storage = storage;
    }

    getCacheKey(id: string): string {
        return 'Twitter' + this.settings.address + id;
    }

    getProfile(id: string): Profile {
        let profile: Profile = this.profiles[id]; // Quick cache
        if (profile)
            return profile;

        let data = this.storage.getItem(this.getCacheKey(id));
        if (!data) 
            return null;

        profile = JSON.parse(data);
        this.profiles[id] = profile; // Save to quick cache
        return profile;
    }

    setProfile(profile: Profile): void {
        this.profiles[profile.userId] = profile;
        try {
            let data = JSON.stringify(profile);
            this.storage.setItem(this.getCacheKey(profile.userId), data);
            
        } catch (error) {
            console.log(error);
        }
    }

    ensureProfile(id: string): Profile {
        let profile : Profile = this.getProfile(id);
        if (!profile) {
            profile = new Profile(id);
            this.setProfile(profile);
            DTP['trace']('Profile ' + profile.userId + ' created');
        }
        return profile;
    }

    update(settings): void {
        this.settings = settings;
    }

    getSessionProfiles(): Array<Profile> {
        return this.profiles;
    }

    // Get Profile by a index key
    getProfileByIndex(key: string) : Profile
    {
        let profile: Profile = this.index[key]; // Quick cache
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
    setIndexKey(identity: DTPIdentity, profile: Profile): void {
        this.index[identity.ID] = profile;
        identity.PlatformID = profile.userId;
        this.storage.setItem(this.getCacheKey(identity.ID), JSON.stringify(identity));
    }


}
export = ProfileRepository