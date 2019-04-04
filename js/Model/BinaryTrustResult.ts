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
    public profiles: Array<IProfile> = []


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
    }

    public calculateState() {
    }

}

export = BinaryTrustResult