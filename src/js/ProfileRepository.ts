declare var DTP: any;
/// TS_IGNORE
import Profile = require('./Profile'); //declare var DTP: any;
import DTPIdentity = require('./Model/DTPIdentity');
import IProfile from './IProfile';
import IStorage from './Interfaces/IStorage';
import * as $ from 'jquery';
class ProfileRepository {
    public profiles: Array<IProfile> = [];
    public index: Array<IProfile> = [];
    storage: IStorage;

    public static scope : string = "DTP";

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    getCacheKey(id: string): string {
        return ProfileRepository.scope + id;
    }

    getIndexCacheKey(id: string): string {
        return ProfileRepository.scope + 'Index' + id;
    }

    getProfileDirect(id: string): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();
        let profile: IProfile = this.profiles[id]; // Quick cache
        if (profile) 
            return deferred.resolve(profile).promise();

        this.storage.getItem(this.getCacheKey(id)).then(data => {
            if (!data) 
                return deferred.resolve(null);

            profile = (typeof data === "string") ? new Profile(JSON.parse(data)) : data as IProfile;
            
            this.profiles[id] = profile; // Save to quick cache
            deferred.resolve(profile);
        });

        return deferred.promise();
    }

    getProfile(id: string): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        this.getProfileDirect(id).then(profile => {

            if(profile == null) 
                this.getProfileByIndex(id).then(profile => {
                    deferred.resolve(profile);
                });
            else
                deferred.resolve(profile);
        });
    
        return deferred.promise();
    }

    setProfile(profile: IProfile): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        if (profile.userId && typeof profile.userId != 'string')
            throw new Error(`profile.userId (string) cannot be set to object of type: ${typeof profile.userId}`);

        this.profiles[profile.userId] = profile;
        let data = JSON.stringify(profile);

        this.storage.setItem(this.getCacheKey(profile.userId), data).then(() => {
            if(profile.owner) {
                this.setIndexKey(profile).then(() => deferred.resolve(profile));
            } else
                deferred.resolve(profile);
        });
        return deferred.promise();
    }

    setProfiles(profiles: Array<IProfile>): void {
        profiles.forEach((profile) => {
            this.setProfile(profile);
        });
    }

    ensureProfile(id: string, source?: any): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        this.getProfile(id).then(profile => {
            if (!profile) {
                const data = (source) ? source : { userId: id};
                profile = new Profile(data);
                
                this.setProfile(profile);
                //DTP['trace']('Profile ' + profile.userId + ' created');
            }
            deferred.resolve(profile);
        });

        return deferred.promise();
    }

    getSessionProfiles(): Array<IProfile> {
        return this.profiles;
    }

    // Get Profile by a index key
    getProfileByIndex(key: string) : JQueryPromise<IProfile>
    {
        let deferred = $.Deferred<IProfile>();

        let profile: IProfile = this.index[key]; // Quick cache
        if (profile)
            return deferred.resolve(profile).promise();

        this.storage.getItem("I"+this.getIndexCacheKey(key)).then(data => {
            if (!data) 
                return deferred.resolve(null);
    
            let identity = (typeof data === "string") ? new DTPIdentity(JSON.parse(data)) : data as DTPIdentity;
            if(!identity || !identity.PlatformID) 
                return deferred.resolve(null);

            this.getProfile(identity.PlatformID).then(profile => {
                if (!profile)
                    return deferred.resolve(null);

                if(profile.owner && profile.owner.ID != identity.ID)
                    return deferred.resolve(null); // More checks may be needed!

                this.index[key] = profile;
                     deferred.resolve(profile);
            });
        });

        return deferred.promise();
    }

    // Only store the profile id
    setIndexKey(profile: IProfile): Promise<DTPIdentity> {
        this.index[profile.owner.ID] = profile;
        profile.owner.PlatformID = profile.userId;
        return this.storage.setItem(this.getIndexCacheKey(profile.owner.ID), profile.owner);
    }


}
export = ProfileRepository