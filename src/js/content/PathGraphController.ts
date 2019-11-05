import * as vis2 from "vis";
import ITrustStrategy from "../Interfaces/ITrustStrategy";
import { QueryContext, Claim } from '../../lib/dtpapi/model/models';
import IProfile from '../IProfile';
import Crypto from "../Crypto";
import Identicon from "../Shared/Identicon";
import ProfileRepository from "../ProfileRepository";
import BinaryTrustResult from "../Model/BinaryTrustResult";
import TrustStrategy from '../TrustStrategy';
import IGraphData from './IGraphData';
import { ProfileModal } from "../Model/ProfileModal";
import { Buffer } from 'buffer';
import PackageBuilder from '../PackageBuilder';
import BaseGraphController from './BaseGraphController';


export default class PathGraphController extends BaseGraphController {

    private source: IGraphData;
    private trustStrategy: ITrustStrategy;
    private trustResults: object;
    private currentUser: IProfile;
    private selectedProfile: IProfile;
    private currentProfile: IProfile;


    constructor(data: IGraphData, container: HTMLElement, trustStrategy: ITrustStrategy, profileRepository: ProfileRepository) {
        super();
        this.source = data;
        this.container = container;
        this.trustStrategy = trustStrategy;
        this.profileRepository = profileRepository;
    }

    public async init() : Promise<void> {
        
        await this.start();
        await this.build();
    }

    async select(pv: ProfileModal) : Promise<void> 
    {
    }

    public async start() : Promise<void> {
        this.graph.nodes.clear();
        this.graph.edges.clear();

        await this.buildProfiles();

        let subjectProfileView = this.profileViews[this.source.subjectProfileId] as ProfileModal;

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

            let parentView = this.profileViews[claim.issuer.id] as ProfileModal;

            this.addEdge(parentView.profile, pv.profile, claim);

            this.loadNodes(parentView);
        }
    }


    private async buildProfiles() : Promise<void> {

        this.trustResults = this.trustStrategy.ProcessClaims(this.source.queryResult.results.claims);

        this.profileViews = {};
        this.selectedProfile = await this.profileRepository.getProfile(this.source.subjectProfileId); // source.profiles.filter(p=>p.id == source.subjectProfileId).pop();
        this.currentUser = await this.profileRepository.getProfile(this.source.currentUserId,{id: this.source.currentUserId, title: "(You)" });
        
        this.profileViews[this.source.currentUserId] = new ProfileModal(this.currentUser, this.currentUser);
        //this.profileIndex[source.subjectProfileId] = new ProfileModal(this.selectedProfile, this.currentUser); // Is handle by the for loop

        for(let key in this.trustResults) {
             let profile = await this.profileRepository.getProfile(key);

            this.profileViews[key] = new ProfileModal(profile, this.currentUser, this.trustResults[key]);
        }
    }

    public networkOptions() : any {
        var options = {
            layout: {
                hierarchical: {
                    direction: "LR",
                    sortMethod: "directed"
                }
            },
            interaction:
             { 
                 dragNodes: false,
                 hover: false
            },
            physics: {
                enabled: false
            },
            nodes: {
                shape: 'circularImage',
                borderWidth: 3,
                size: 20,
                color: {
                    border: '#222222',
                    background: '#ffffff'
                },
                shadow: true,
                font: {
                    color: '#000000',
                    multi: 'md',
                    face:'arial',
                    size:9
                }
            },
            edges: {
                arrows: { to: true },
                shadow: true

            },
            autoResize: true
        };
        return options;
    }

}
