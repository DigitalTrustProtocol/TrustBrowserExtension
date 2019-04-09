import vis2 = require('vis');
import ITrustStrategy from "../Interfaces/ITrustStrategy";
import { QueryContext, Claim } from '../../lib/dtpapi/model/models';
import IProfile from '../IProfile';
import Crypto = require('../Crypto');
import Identicon = require('identicon.js');
import ProfileRepository = require('../ProfileRepository');
import BinaryTrustResult = require('../Model/BinaryTrustResult');


class TrustGraphDataAdapter {

    private graph: any = {     
        nodes: new vis2.DataSet(),
        edges: new vis2.DataSet()
    };
    
    private trustStrategy: ITrustStrategy;
    private profileRepository: ProfileRepository;


    currentUser: IProfile;
    subjectProfile: IProfile;


    constructor(subjectProfile: IProfile, currentUser: IProfile, trustStrategy: ITrustStrategy, profileRepository: ProfileRepository) {
        this.subjectProfile = subjectProfile;
        this.currentUser = currentUser;
        this.trustStrategy = trustStrategy;
        this.profileRepository = profileRepository;
    }

    public getGraph() : any {
        return this.graph;
    }

    public load(queryContext: QueryContext) : void {
        // this.trustStrategy.ProcessResult(queryContext, null).then(() => {
        //     this.rebuild();
        // })
        
    }

    public rebuild() : void {
        this.graph.nodes.clear();
        this.graph.edges.clear();
        this.buildNodes(this.subjectProfile);
    }

    private buildNodes(profile: IProfile) : void {
        if(this.graph.nodes.get(profile.userId))
            return; // Do not re-process the node

        this.addNode(profile);

        if(profile.userId == this.currentUser.userId)
            return; // Stop with oneself

        if(!profile.binaryTrustResult) {
            profile.binaryTrustResult = new BinaryTrustResult();
            return; // The profile do not have any claim data
        }

        for(let key in profile.binaryTrustResult.claims) {
            let claim = profile.binaryTrustResult.claims[key]; // is Key the same as claim.issuer.ID?

            // issuer is always a DTP ID
            this.profileRepository.getProfileByIndex(claim.issuer.id).then(parentProfile => {
                // There should always be a profile, even if it just been created by the TrustStrategy class
                this.addEdge(parentProfile, profile, claim);

                this.buildNodes(parentProfile);
            });
        }
    }


    public updateWithClaim(claim : Claim) : void {
        this.profileRepository.getProfile(claim.issuer.id).then(from => {
            this.profileRepository.getProfile(claim.subject.id).then(to => {
                to.binaryTrustResult.claims[claim.issuer.id] = claim;
                this.trustStrategy.calculateBinaryTrustResult(to.binaryTrustResult);
        
                this.updateNode(from); // Make sure that "from" profile node exist in graph
                this.updateEdge(from, to, claim);
            });
        });
    }

   
    public addNode(profile: IProfile) : any {
        this.updateNode(profile);
    }

    public updateNode(profile: IProfile) : any {
        let node = this.createNode(profile);
        this.graph.nodes.update(node);
    }


    private createNode(profile: IProfile) : any {
        if(!profile.avatarImage) {
            let hash = Crypto.toDTPAddress(Crypto.Hash160(profile.userId));
            let icon = new Identicon(hash, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
            profile.avatarImage = icon.toString();
        }

        let node = {
            id: profile.userId,
            image: profile.avatarImage,
            label: '*'+profile.alias+'*\n_@'+profile.screen_name+'_',
        }
        return node;
    }

    public addEdge(from: IProfile, to:IProfile, claim: any) : void {
        this.graph.edges.add(this.createEdge(from, to, claim));
    }

    public removeEdge(from: IProfile, to:IProfile) : void {
        this.graph.edges.remove({ 
            id: from.userId+to.userId
        });
    }

    public updateEdge(from: IProfile, to:IProfile, claim: any) : void {
        this.graph.edges.update(this.createEdge(from, to, claim)); // Auto create if node do not exist
    }

    private createEdge(from: IProfile, to:IProfile, claim: any) : any {
        let color = (claim.value === "true" || claim.value === "1") ? 'green' : (claim.value == undefined || claim.value == "") ? 'gray': 'red';
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
