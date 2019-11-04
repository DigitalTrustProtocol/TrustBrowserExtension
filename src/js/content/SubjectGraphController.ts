import IProfile from '../IProfile';
import ProfileRepository from '../ProfileRepository';
import BinaryTrustResult from "../Model/BinaryTrustResult";
import DTPService from '../DTPService';
import BaseGraphDataAdapter from "./BaseGraphDataAdapter";
import { ProfileModal } from '../Model/ProfileModal';
import * as vis2 from 'vis';


export default class SubjectGraphController extends BaseGraphDataAdapter {

    public pageSize : number = 1000;

    //private history: Array<ProfileModal> = [];

    public subjectId: string;

    
    constructor(subjectId: string, container: HTMLElement, dtpService: DTPService, profileRepository: ProfileRepository) {
        super();
        this.subjectId = subjectId;
        this.container = container;
        this.dtpService = dtpService;
        this.profileRepository = profileRepository;

    }

    public async init() : Promise<void> {
        await this.start();
        await this.build();
    }

    public async start() : Promise<void> {
        this.graph.nodes.clear();
        this.graph.edges.clear();

        let profile = await this.profileRepository.getProfile(this.subjectId);
        let subjectView = new ProfileModal(profile);
        //this.history.push(subjectView);
        this.profileViews[this.subjectId] = subjectView;
        this.addNode(profile);

        await this.select(subjectView);
    }

    

    public async loadPeers(pv: ProfileModal) : Promise<void> {
    }
    
    async select(pv: ProfileModal) : Promise<void> 
    {
        let claims = await this.dtpService.getHistory(pv.profile.id,0,this.pageSize,true);

        await Promise.all(claims.map(claim => this.updateWithClaim(claim)));
    }

    
    public networkOptions() : any {
        var options = {
            // layout: {
            //     hierarchical: {
            //         direction: "LR",
            //         sortMethod: "directed"
            //     }
            // },
            interaction:
            { 
                 dragNodes: true,
                 hover: true
            },
            physics: {
                enabled: true
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
