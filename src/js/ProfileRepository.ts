declare var DTP: any;
/// TS_IGNORE
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

    getProfile(id: string, defaultProfile?: IProfile): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();
        let profile: IProfile = this.profiles[id]; // Quick cache
        if (profile) 
            return deferred.resolve(profile).promise();

        this.storage.getItem(this.getCacheKey(id)).then(data => {
            if (!data) {
                profile = defaultProfile;
                this.setProfile(profile);
            }

            profile = (typeof data === "string") ? <IProfile>JSON.parse(data) : data as IProfile;
            
            this.profiles[id] = profile; // Save to quick cache
            deferred.resolve(profile);
        });

        return deferred.promise();
    }


    setProfile(profile: IProfile): Promise<IProfile> {
        if (profile.id && typeof profile.id != 'string')
            throw new Error(`profile.userId (string) cannot be set to object of type: ${typeof profile.id}`);

        this.profiles[profile.id] = profile;
        let data = JSON.stringify(profile);

        return this.storage.setItem(this.getCacheKey(profile.id), data).then(() => {
            return profile;
        });
    }

    setProfiles(profiles: Array<IProfile>): void {
        profiles.forEach((profile) => {
            this.setProfile(profile);
        });
    }


    getSessionProfiles(): Array<IProfile> {
        return this.profiles;
    }
}
export = ProfileRepository