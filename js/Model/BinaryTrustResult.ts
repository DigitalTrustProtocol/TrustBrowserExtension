import { QueryContext } from "../../lib/dtpapi/model/models";

class BinaryTrustResult {
    public direct : boolean = false;
    public directValue: any;
    public trust : number =  0;
    public distrust: number = 0;
    public state: number = 0;
    public claims: Array<any> = [];
    public time: number;
    public queryContext: QueryContext;


    public Clean() {
        this.direct = false;
        this.directValue = 0;
        this.trust = 0;
        this.distrust = 0;
        this.state = 0;
        this.claims = [];
        this.time = 0;
        this.queryContext = null;
    }
}

export = BinaryTrustResult