///<reference path="../typings/globals/jquery/index.d.ts" />

import TagBar = require('./TagBar')
import TrustHandler = require('./TrustHandler');
import ISubject from './SubjectInterface';
class RedditD2X {
    settings: any;
    subjectService: any;
    packageBuilder: any;
    trustchainService: any;
    queryResult: {};
    callbacks: any[];
    callQuery: boolean;
    environment: string;
    subjects: any[];
    targets: any[];
    trustHandler: any;
    static JSAPI_CONSUMER_NAME: string = "DTPreddit";
    
    constructor(settings, packageBuilder, subjectService, trustchainService) {
        this.settings = settings;
        this.subjectService = subjectService;
        this.packageBuilder = packageBuilder;
        this.trustchainService = trustchainService;
        this.queryResult = {};
        this.callbacks = [];
        this.callQuery = false;
        this.environment = 'prod';
        this.subjects = [];
        this.targets = [];
    }

    update () {

        this.targets.map(subject => {
            
            let container = this.subjects[subject.author];
            
            container.tagBars.map((key, index) => {
                const tagBar = container.tagBars[index];
                if (!container.result) {
                    subject.queryResult = this.queryResult;
                    let owner = subject.owner;
                    let ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
                    container.result = this.trustHandler.CalculateBinaryTrust2(subject.address.toString('base64'), ownerAddressBase64);
                }

                tagBar.update(container.result.networkScore, container.result.personalScore);
            })
        })
        // for (let subject of this.targets) {
        //     let container = this.subjects[subject.author];
        //     for (let key in container.tagBars) {
        //         const tagBar = container.tagBars[key];

        //         if (!container.result) {

        //             subject.queryResult = this.queryResult;
        //             let owner = subject.owner;
        //             let ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
        //             container.result = this.trustHandler.CalculateBinaryTrust2(subject.address.toString('base64'), ownerAddressBase64);
        //         }

        //         tagBar.update(container.result.networkScore, container.result.personalScore);
        //     }
        // }
    }

    bindEvents () {
        this.defineEvents();        
        document.addEventListener('reddit',(e) => this.handleEvent(e), true);
        document.dispatchEvent(new CustomEvent('reddit.ready', {
			detail: {
				name: RedditD2X.JSAPI_CONSUMER_NAME,
			},
		}));
    }

   defineEvents () {
        var callback = (expando, detail) => this.ensureTabBar(expando, detail);
        this.watchForRedditEvents('postAuthor', callback)
        this.watchForRedditEvents('commentAuthor', callback);
    }

    ensureTabBar (expando, detail) {
        if(expando.update || !expando.jsapiTarget) return; 

        const contentElement = $('#'+expando.contentId);
        let subject = this.subjectService.enrichSubject(detail.data.author, contentElement);
        const container = this.ensureContainer(subject);

        let instance = TagBar.bind(expando, subject, this.settings, this.packageBuilder, this.subjectService, this.trustchainService);
        instance.updateCallback = (subject) => {
            this.queryDTP(subject);
        };

        if(container.result)
            instance.update(container.result.networkScore, container.result.personalScore);

        container.tagBars.push(instance);
    }

    ensureContainer (subject) {
        let container = this.subjects[subject.author];
        if(!container) {
            container = {
                 subject: subject,
                 tagBars: [],
            };
            this.subjects[subject.author] = container;
            if (subject.owner) {
                this.subjects[subject.owner.author] = container;
            }
        }
        return container;
    }

    watchForRedditEvents (type, callback) {
        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(callback);
    }


    queryDTP(custom : ISubject) {
        this.callQuery = false; // Enable the queryDTP to be called again

        this.targets = [];
        if (custom) {
            if ($.isArray(custom)) {
                this.targets = custom;
             } else {
                this.targets.push(custom); // Predefined targets!
             }
        } else {
            for (let author in this.subjects) {
                let container = this.subjects[author];
                if (container.processed) 
                    continue;
                
                this.targets.push(container.subject);
                if (container.subject.owner) {
                    this.targets.push(container.subject.owner);
                }
                container.processed = true;
            }
        }
        if(this.targets.length === 0)
            return;

        for (const subject of this.targets) {
            const container = this.subjects[subject.author];
            container.result = undefined;
        }

        console.log("Quering the DTP!");

        this.trustchainService.Query(this.targets, window.location.hostname).then((result) => {
            if (result || result.status == "Success") 
                this.queryResult = result.data.results;
            else
                console.log(result.message);
            
            this.trustHandler = new TrustHandler(this.queryResult, this.settings);

            this.update();
        }, this.DeferredFail);

    }
    DeferredFail(error, arg1, arg2) {
        console.log(error);
    }    

    handleEvent(event) {
        // A hack to make a function call when all the events have executed.
        if (!this.callQuery) { 
            this.callQuery = true;
            setTimeout(() => this.queryDTP(null), 100);
        }
        
        if(!event) return;
        if(!event.detail) return;

        //console.log('Type: '+event.detail.type);
        const fns = this.callbacks[event.detail.type];
        if(!fns) {
            if (this.environment === 'development') {
                console.warn('Unhandled reddit event type:', event.detail.type);
            }
            return;
        }
   

        let contentId;
        let expandoId = `${event.detail.type}|`;
        switch (event.detail.type) {
            case 'postAuthor':
                expandoId += event.detail.data.post.id;
                contentId = event.detail.data.post.id;
                break;
            case 'commentAuthor':
                expandoId += event.detail.data.comment.id;
                contentId = event.detail.data.comment.id;
                break;
            case 'userHovercard':
                expandoId += `${event.detail.data.contextId}|${event.detail.data.user.id}`;
                break;
            case 'subreddit':
            case 'post':
            default:
                expandoId += event.detail.data.id;
                contentId = event.detail.data.id;
                break;
        }
    
        const update = event.target.expando && event.target.expando.id === expandoId ?
            (event.target.expando.update || 0) + 1 :
            0;
    
        if(!event.target.expando) {
            event.target.expando = {
                id: expandoId,
                contentId: contentId,
            } ;

            event.target.expando.jsapiTarget = event.target.querySelector(`[data-name="${RedditD2X.JSAPI_CONSUMER_NAME}"]`);
        }

        event.target.expando.update = update;
        
        for (let fn of fns) {
            try {
                fn(event.target.expando, event.detail);
            } catch (e) {
                console.log(e);
            }
        }

    }
    
}
export = RedditD2X