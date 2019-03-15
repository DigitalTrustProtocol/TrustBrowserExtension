class DTPIdentity {
    public ID: string;
    public Proof: string;
    public PlatformID: string;

    constructor(id:string, proof:string) {
        this.ID = id;
        this.Proof = proof;

    }
}
export = DTPIdentity