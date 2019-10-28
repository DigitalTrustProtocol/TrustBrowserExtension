
export default interface ISettings  {
    icon?:string; // An optional url to an icon of the user
    iconChanged?: boolean;
    identicon?: string; // The generated data of an identicon
    password: string;
    alias: string;
    aliasChanged: boolean;
    aliasProof: string;
    seed: string;
    rememberme: boolean;
    infoserver: string;
    keyPair?: any;
    address?: string;
    hash:any;
    time: number;
}
