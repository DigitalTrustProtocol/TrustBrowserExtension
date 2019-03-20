class DTPIdentity {
    public ID: string;
    public Proof: string;
    public PlatformID: any;

    constructor(source: any) {
        this.ID = source.ID ;
        this.Proof = source.Proof;
        this.PlatformID = source.PlatformID;
    }
}
export = DTPIdentity