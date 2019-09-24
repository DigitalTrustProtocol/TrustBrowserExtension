import IProfile from "../IProfile";
import { QueryContext } from "../../lib/dtpapi/model/models";


export default interface IGraphData {
    scope?: string;
    currentUserId?: string;
    subjectProfileId?: string;
    //profiles?: Array<IProfile>;
    queryResult?: QueryContext;
}
