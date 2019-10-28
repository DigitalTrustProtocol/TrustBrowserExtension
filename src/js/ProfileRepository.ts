declare var DTP: any;
/// TS_IGNORE
import IProfile from './IProfile';
import IStorage from './Interfaces/IStorage';
import DTPService from "./DTPService";

export default class ProfileRepository {
    public profiles: Array<IProfile> = [];
    public index: Array<IProfile> = [];
    storage: IStorage;
    dtpService: DTPService;

    public static prefix : string = "P-";

    constructor(storage: IStorage, dtpService: DTPService) {
        this.storage = storage;
        this.dtpService = dtpService;
    }

    async getProfiles(ids : Array<string>) : Promise<Array<IProfile>> {
        if(!ids) 
            return [];

        // let profiles = [];
        // for(let key in ids) {
        //     let id = ids[key];

        //     let p = await this.getProfile(id);
        //     if(p)
        //         profiles.push(p);
        // }
        let profiles = await Promise.all(ids.map(async id=>await this.getProfile(id)));
        return profiles;
    }

    getCacheKey(id: string): string {
        return ProfileRepository.prefix + id;
    }

    async getProfile(id: string, defaultProfile?: IProfile): Promise<IProfile> {
        let profile: IProfile = this.profiles[id]; // Quick cache
        if (profile) 
            return profile;

        let data = await this.storage.getItem(this.getCacheKey(id));
        if (data) { // Data is null or undefined
            profile = (typeof data === "string") ? <IProfile>JSON.parse(data) : data as IProfile;
            this.profiles[id] = profile; // Save to quick cache
        } else {
            profile = <IProfile>await this.dtpService.getIdentityMetadata(id);
            if(profile) 
                this.setProfile(profile);
        }

        if(!profile && defaultProfile)
            profile = defaultProfile;

        if(!profile)            
            profile = <IProfile>{ 
                id: id,
                title: id
            };

        return profile;
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
