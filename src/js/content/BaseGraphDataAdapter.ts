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
import { ProfileModal } from '../Model/ProfileModal';
import { Buffer } from 'buffer';
import PackageBuilder from '../PackageBuilder';
import IGraphController from "./IGraphController";
import DTPService from "../DTPService";


export default abstract class BaseGraphDataAdapter implements IGraphController {

    public graph: any = {     
        nodes: new vis2.DataSet(),
        edges: new vis2.DataSet()
    };
    
    public profileRepository: ProfileRepository;
    public profileViews: Object = {};
    public container: HTMLElement;
    public dtpService: DTPService;
    public onSelect = (pv: ProfileModal) => {};


    public network: vis2.Network;

    abstract async init() : Promise<void>;

    async build() : Promise<any> {
        let options = this.networkOptions();

        this.network = new vis2.Network(this.container, this.graph, options);

        this.network.on("select", (params) => {
            if(params.nodes.length > 0) {
                let profileId = params.nodes[0];
                let pv = this.profileViews[profileId];
                this.select(pv);
                this.onSelect(pv);
            }
        });

        return this.network;
    }

    abstract select(pv: ProfileModal) : Promise<void>;
    abstract networkOptions() : any;

    // constructor(data: IGraphData, profileViews: object) {
    //     this.source = data;
    //     this.profileViews = profileViews;
    // }


    // public load() : void {
    //     this.graph.nodes.clear();
    //     this.graph.edges.clear();

    //     let subjectProfileView = this.profileViews[this.source.subjectProfileId] as ProfileModal;

    //     //let result = this.source.trustResults[this.source.subjectProfileId] as BinaryTrustResult; // Start
    //     this.loadNodes(subjectProfileView);
    // }

    // private loadNodes(pv: ProfileModal) : void {
    //     if(this.graph.nodes.get(pv.profile.id))
    //          return; // Do not re-process the node

    //     this.addNode(pv.profile);

    //     if(pv.profile.id == this.source.currentUserId)
    //          return; // Stop with oneself

    //     if(!pv.trustResult)
    //         return;
             
        
    //     for(let key in pv.trustResult.claims) {
    //         let claim = pv.trustResult.claims[key];

    //         let parentView = this.profileViews[claim.issuer.id] as ProfileModal;

    //         this.addEdge(parentView.profile, pv.profile, claim);

    //         this.loadNodes(parentView);
    //     }
    // }


    public getGraph() : any {
        return this.graph;
    }

    public async updateWithClaim(claim : Claim) : Promise<void> {

        let from = await this.getProfileView(claim.issuer.id);
        let to = await this.getProfileView(claim.subject.id);
        
        //to.trustResult.claims[claim.issuer.id] = claim;

        let toNode = this.graph.nodes.get(to.profile.id);
        if(!toNode) 
            this.updateNode(to.profile); // Make sure that "to" profile node exist in graph

        this.updateEdge(from.profile, to.profile, claim.value);
    }

    protected async getProfileView(profileId: string) : Promise<ProfileModal>
    {
        let profileView = this.profileViews[profileId];
        if(profileView) 
            return profileView;

        let profile = await this.profileRepository.getProfile(profileId, <IProfile>{id:profileId, title: profileId });
        
        this.profileViews[profileId] = profileView = new ProfileModal(profile, null, null); // new BinaryTrustResult()

        return profileView;
    }

   
    public addNode(profile: IProfile) : any {
        this.updateNode(profile);
    }

    public updateNode(profile: IProfile) : any {
        let node = this.createNode(profile);
        this.graph.nodes.update(node);
    }


    private createNode(profile: IProfile) : any {
        if(!profile.icon) {
            profile.icon = Identicon.createIcon(profile.id, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
        }

        let label = this.lineBreakText(profile.title, 20);
        if(label.length == 0) 
            label = this.lineBreakText(this.getData(profile), 20);
        
        if(label.length == 0) 
            label = this.lineBreakText(profile.id, 20);


        let node = {
            id: profile.id,
            image: profile.icon,
            label: label
        }
        return node;
    }

    private getData(profile: IProfile) : string {
        if(!profile || !profile.data)
            return "";
        
        //if(profile.type == "url")

        return profile.data;
        //let source = (data.data) ? data.data : data;


        // if(typeof source === 'string')
        //     return Buffer.from(data, 'base64').toString("utf-8");
        // else
        //     return Buffer.from(data).toString("utf-8");
    }


    private lineBreakText(text : string, width: number) : string {
        if(!text)
            return "";

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


    public addEdge(from: IProfile, to:IProfile, claim: Claim) : void {
        this.graph.edges.add(this.createEdge(from, to, claim));
    }

    public removeEdge(from: IProfile, to:IProfile) : void {
        this.graph.edges.remove({ 
            id: from.id+to.id
        });
    }

    public updateEdge(from: IProfile, to:IProfile, value: any) : void {
        this.graph.edges.update(this.createEdge(from, to, value)); // Auto create if node do not exist
    }

    private createEdge(from: IProfile, to:IProfile, claim: Claim) : any {
        let color = 'gray';
        switch(claim.type) {
            case PackageBuilder.RATING_TRUST_DTP1: color = this.getRatingColor(claim.value); break;
            case PackageBuilder.BINARY_TRUST_DTP1: color = this.getBinaryTrustColor(claim.value); break;
        }
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

    private getBinaryTrustColor(value: string) : string {
        if(value == "true" || value == "1") return 'green';
        if(value == "false" || value == "0") return 'red';
        return 'gray';
    }

    private getRatingColor(value: string) : string {
        let num = +(value);
        if(num == NaN || num == 0) return 'gray';
        if(num < 2) return 'red';
        if(num > 4) return 'green';
        return 'GoldenRod';
    }
    

}
