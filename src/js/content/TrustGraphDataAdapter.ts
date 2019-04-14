import vis2 = require('vis');
import ITrustStrategy from "../Interfaces/ITrustStrategy";
import { QueryContext, Claim } from '../../lib/dtpapi/model/models';
import IProfile from '../IProfile';
import Crypto = require('../Crypto');
import Identicon = require('identicon.js');
import ProfileRepository = require('../ProfileRepository');
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import ProfileController = require('../ProfileController');
import Profile = require('../Profile');
import TrustStrategy = require('../TrustStrategy');
import IGraphData from './IGraphData';


class TrustGraphDataAdapter {

    public graph: any = {     
        nodes: new vis2.DataSet(),
        edges: new vis2.DataSet()
    };
    
    //private currentUser: IProfile;
    private subjectProfileID: string;

    private trustStrategy: ITrustStrategy;
    private profileRepository: ProfileRepository;
    //private controllers: Array<ProfileController>;
    //private results: object;
    private source: IGraphData;


    constructor(data: IGraphData,  trustStrategy: TrustStrategy, profileRepository: ProfileRepository) {
        Object.defineProperty(this, 'trustStrategy', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'profileRepository', { enumerable: false, writable: true, value: null }); // No serialize to json!
        // Object.defineProperty(this, 'subjectProfile', { enumerable: false, writable: true, value: null }); // No serialize to json!
        // Object.defineProperty(this, 'currentUser', { enumerable: false, writable: true, value: null }); // No serialize to json!

        // this.subjectProfileID = subjectProfile;
        // this.currentUser = currentUser;
        this.source = data;
        this.trustStrategy = trustStrategy;
        this.profileRepository = profileRepository;
        //this.controllers = controllers;
    }

    // public static CreateFrom(data: any) : TrustGraphDataAdapter {
    //     let adapter = new TrustGraphDataAdapter()
    //     if(!data || !data.graph) 
    //         return new ;

            
    // }

    public load() : void {
        this.graph.nodes.clear();
        this.graph.edges.clear();

        let subjectProfile = this.source.profiles[this.source.subjectProfileId] as IProfile;

        let result = this.source.trustResults[this.source.subjectProfileId] as BinaryTrustResult; // Start
        this.loadNodes(subjectProfile, result);
    }

    private loadNodes(profile: IProfile, result: BinaryTrustResult) : void {
        if(this.graph.nodes.get(profile.userId))
             return; // Do not re-process the node

        this.addNode(profile);

        if(profile.userId == this.source.currentUser.userId)
             return; // Stop with oneself

        if(!result)
            return;
             
        for(let key in result.claims) {
            let claim = result.claims[key];

            let parentProfile = this.source.profiles[claim.issuer.id] as IProfile;

            this.addEdge(parentProfile, profile, claim.value);

            let subResult = this.source.trustResults[parentProfile.owner.ID];
            
            this.loadNodes(parentProfile, subResult);
        }
    }


    public getGraph() : any {
        return this.graph;
    }

    // public build() : void {
    //     this.graph.nodes.clear();
    //     this.graph.edges.clear();
    //     let controller = this.controllers[this.subjectProfile.userId] as ProfileController;
    //     this.buildNodes(controller);
    // }

    // private buildNodes(profile: IProfile) : void {
    //     if(this.graph.nodes.get(profile.userId))
    //         return; // Do not re-process the node

    //     this.addNode(profile);

    //     if(profile.userId == this.currentUser.userId)
    //         return; // Stop with oneself

    //     if(!profile.trustResult) {
    //         //controller.trustResult = new BinaryTrustResult();
    //         return; // The profile do not have any claim data
    //     }

    //     for(let key in profile.trustResult.claims) {
    //         let claim = profile.trustResult.claims[key]; // is Key the same as claim.issuer.ID?

    //         // issuer is always a DTP ID
    //         this.profileRepository.getProfileByIndex(claim.issuer.id).then(parentProfile => {
    //             // There should always be a profile, even if it just been created by the TrustStrategy class
    //             this.addEdge(parentProfile, profile, claim.value);


    //             this.buildNodes(parentProfile);
    //         });
    //     }
    // }


    public updateWithClaim(claim : Claim) : void {
        let from = this.source.profiles[claim.issuer.id];
        let to = this.source.profiles[claim.subject.id];
        
        to.trustResult.claims[claim.issuer.id] = claim;
        //this.trustStrategy.calculateBinaryTrustResult(to.binaryTrustResult);

        this.updateNode(from); // Make sure that "from" profile node exist in graph
        this.updateEdge(from, to, claim);
    }

   
    public addNode(profile: IProfile) : any {
        this.updateNode(profile);
    }

    public updateNode(profile: IProfile) : any {
        let node = this.createNode(profile);
        this.graph.nodes.update(node);
    }


    private createNode(profile: IProfile) : any {
        let hasUserId = !(profile.userId == "?");
        let userId = hasUserId ? profile.userId : profile.owner.ID;

        if(!profile.avatarImage) {
            let hash = Crypto.toDTPAddress(Crypto.Hash160(userId));
            let icon = new Identicon(hash, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
            profile.avatarImage = 'data:image/svg+xml;base64,'+ icon.toString();
        }

        let node = {
            id: userId,
            image: profile.avatarImage,
            label: '*'+profile.alias+ (hasUserId) ? '*\n_@'+profile.screen_name+'_' : '',
        }
        return node;
    }

    public addEdge(from: IProfile, to:IProfile, value: any) : void {
        this.graph.edges.add(this.createEdge(from, to, value));
    }

    public removeEdge(from: IProfile, to:IProfile) : void {
        this.graph.edges.remove({ 
            id: from.userId+to.userId
        });
    }

    public updateEdge(from: IProfile, to:IProfile, value: any) : void {
        this.graph.edges.update(this.createEdge(from, to, value)); // Auto create if node do not exist
    }

    private createEdge(from: IProfile, to:IProfile, value: any) : any {
        let color = (value === "true" || value === "1") ? 'green' : (value == undefined || value == "") ? 'gray': 'red';
        let node = { 
            id: from.userId+to.userId,
            from: from.userId, 
            to: to.userId, 
            color:{
                color:color, 
                highlight: color 
            } 
        };
        return node;
    }
    

}

export = TrustGraphDataAdapter
