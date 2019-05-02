import { QueryContext, Claim } from "../../lib/dtpapi/model/models";
import IProfile from "../IProfile";

class BinaryTrustResult {
    public direct : boolean = false;
    public directValue: any;
    public trust : number =  0;
    public distrust: number = 0;
    public state: number = 0;
    public claims: Array<Claim> = [];
    public time: number = 0;
    public queryContext: QueryContext;
    //public profiles: Array<IProfile> = []
    public DTPid: string;



    public Clean() {
        Object.defineProperty(this, 'claims', { enumerable: false, writable: true, value: null }); // No serialize to json!

        this.direct = false;
        this.directValue = 0;
        this.trust = 0;
        this.distrust = 0;
        this.state = 0;
        this.claims = [];
        this.time = 0;
        this.queryContext = null;
        this.DTPid = "";
    }

    public calculateState() {
    }

    public isEqual(source: BinaryTrustResult) : boolean {
        if(!source)
            return false;

        // Comparer
        let changed = this.claims.length != source.claims.length ? true : false;
        changed = this.direct != source.direct ? true : changed;
        changed = this.directValue != source.directValue ? true : changed;
        changed = this.distrust != source.distrust ? true : changed;
        changed = this.trust != source.trust ? true : changed;
        changed = this.state != source.state ? true : changed;
        changed = this.DTPid != source.DTPid ? true : changed;

        return !changed;
    }

}

export = BinaryTrustResult