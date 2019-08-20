import IProfile from "../IProfile";
import { QueryContext } from '../../../dist/lib/dtpapi/model/QueryContext';

export default interface IGraphData {
    scope?: string;
    currentUserId?: string;
    subjectProfileId?: string;
    profiles?: Array<IProfile>;
    queryResult?: QueryContext;
}
