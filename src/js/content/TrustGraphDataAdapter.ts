import * as vis2 from "vis";
import ITrustStrategy from "../Interfaces/ITrustStrategy";
import { QueryContext, Claim } from '../../lib/dtpapi/model/models';
import IProfile from '../IProfile';
import Crypto from "../Crypto";
import Identicon from "../Shared/Identicon";
import ProfileRepository from "../ProfileRepository";
import BinaryTrustResult from "../Model/BinaryTrustResult";
import TrustStrategy from "../TrustStrategy";
import IGraphData from './IGraphData';
import { ProfileModal } from "../Model/ProfileModal";


export default class TrustGraphDataAdapter {

    public graph: any = {     
        nodes: new vis2.DataSet(),
        edges: new vis2.DataSet()
    };
    
    private subjectProfileID: string;

    private source: IGraphData;
    private profileIndex: object;

    constructor(data: IGraphData, profileIndex: object) {
        this.source = data;
        this.profileIndex = profileIndex;
    }


    public load() : void {
        this.graph.nodes.clear();
        this.graph.edges.clear();

        let subjectProfileView = this.profileIndex[this.source.subjectProfileId] as ProfileModal;

        //let result = this.source.trustResults[this.source.subjectProfileId] as BinaryTrustResult; // Start
        this.loadNodes(subjectProfileView);
    }

    private loadNodes(pv: ProfileModal) : void {
        if(this.graph.nodes.get(pv.profile.id))
             return; // Do not re-process the node

        this.addNode(pv.profile);

        if(pv.profile.id == this.source.currentUserId)
             return; // Stop with oneself

        if(!pv.trustResult)
            return;
             
        
        for(let key in pv.trustResult.claims) {
            let claim = pv.trustResult.claims[key];

            let parentView = this.profileIndex[claim.issuer.id] as ProfileModal;

            this.addEdge(parentView.profile, pv.profile, claim.value);

            this.loadNodes(parentView);
        }
    }


    public getGraph() : any {
        return this.graph;
    }

    public updateWithClaim(claim : Claim) : void {
        let from = this.profileIndex[claim.issuer.id] || this.profileIndex[this.source.currentUserId];
        let to = this.profileIndex[claim.subject.id];
        
        to.trustResult.claims[claim.issuer.id] = claim;

        this.updateNode(from.profile); // Make sure that "from" profile node exist in graph
        this.updateEdge(from.profile, to.profile, claim.value);
    }

   
    public addNode(profile: IProfile) : any {
        this.updateNode(profile);
    }

    public updateNode(profile: IProfile) : any {
        let node = this.createNode(profile);
        this.graph.nodes.update(node);
    }


    private createNode(profile: IProfile) : any {
        //let hasUserId = !(profile.userId == "?");
        //let hasAlias = (profile.alias) ? profile.userId : profile.owner.ID;

        if(!profile.icon) {
            //let hash = Crypto.toDTPAddress(Crypto.Hash160(userId));
            profile.icon = Identicon.createIcon(profile.id, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
            //profile.avatarImage = 'data:image/svg+xml;base64,'+ icon.toString();
        }

        let node = {
            id: profile.id,
            image: profile.icon,
            label: this.lineBreakText(profile.id, 20) + ((profile.title) ? '\n_'+ this.lineBreakText(profile.title, 20)+'_' : ''),
        }
        return node;
    }


    private lineBreakText(text : string, width: number) : string {
        let r = [];
        let count = 0;
        let index = 0;
        if(text.length <= width)
            return text;
        
        while(index < text.length) {
            if(count >= width) {
                count = 0;
                r.push('\n');
                continue;
            }

            r.push(text[index]);
            count++;
            index++;
        }

        return r.join("");
    }


    public addEdge(from: IProfile, to:IProfile, value: any) : void {
        this.graph.edges.add(this.createEdge(from, to, value));
    }

    public removeEdge(from: IProfile, to:IProfile) : void {
        this.graph.edges.remove({ 
            id: from.id+to.id
        });
    }

    public updateEdge(from: IProfile, to:IProfile, value: any) : void {
        this.graph.edges.update(this.createEdge(from, to, value)); // Auto create if node do not exist
    }

    private createEdge(from: IProfile, to:IProfile, value: any) : any {
        let color = (value === "true" || value === "1") ? 'green' : (value == undefined || value == "") ? 'gray': 'red';

        let node = { 
            id: from.id+to.id,
            from: from.id, 
            to: to.id, 
            color:{
                color:color, 
                highlight: color 
            } 
        };
        return node;
    }
    

}
