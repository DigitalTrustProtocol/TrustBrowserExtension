class DTPIdentity {
    public ID: string;
    public Proof: any;
    public PlatformID: string;

    constructor(source: any) {
        this.ID = source.ID ;
        this.Proof = source.Proof;
        this.PlatformID = source.PlatformID;
    }
}
export = DTPIdentity