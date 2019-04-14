import IProfile from "../IProfile";

export default interface IGraphData {
    scope: string;
    currentUser: IProfile;
    subjectProfileId: string;
    profiles: object;
    trustResults: object;
}