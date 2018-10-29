///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");
declare var Identicon: any;
declare var tce: any;
import SettingsController = require('./SettingsController');
import  TrustHandler = require('./TrustHandler');
import SubjectService = require('./SubjectService')
import  PackageBuilder = require('./PackageBuilder');
import TrustchainService = require('./TrustchainService');
import RedditD2X = require('./RedditD2X');
class Reddit  {
    OwnerPrefix: string;
    settings: any;
    subjectService: any;
    targets: any[];
    packageBuilder: any;
    trustchainService: any;
    queryResult: {};
    CreateText: (text: any, title: any) => JQLite;
    CreateLink: (subject: any, text: any, title: any, value: any, expire: any) => JQLite;
    CreateIdenticon: (subject: any, title: any) => JQLite;
    CreateIcoin: ($nameLink: any, name: any) => void;
    trustHandler: any;
    constructor(settings, packageBuilder, subjectService, trustchainService) {
        this.OwnerPrefix = "[#owner_]";
        this.settings = settings;
        this.subjectService = subjectService;
        this.targets = [];
        this.packageBuilder = packageBuilder;
        this.trustchainService = trustchainService;
        this.queryResult = {};

        $("div.thing[data-author]").each((i, elm:any) => {

            let elem = $(elm);
            let authorName = elem.data("author");
            let target = this.targets[authorName];
            if(!target) {
                target = {};
                //target.$htmlContainers = []; 
                target.alias = authorName;
                target.thingId = elem.data("author-fullname");
                target.address = authorName.hash160(); // array of bytes (Buffer)
                target.scope = window.location.hostname;
                target.type = "thing";
                this.targets[authorName] = target;
            }

            if(!target.owner) {
                let $proof = elem.find("a[href*='scope=reddit']:contains('Proof')")
                if ($proof.length > 0) {
                    let params = getQueryParams($proof.attr("href"));
                    if(params.name == target.alias) {
                        let owner = this.targets[this.OwnerPrefix + authorName];
                        if(!owner) {
                            target.owner = params;
                            target.owner.type = "entity";
                            target.owner.address = new tce.buffer.Buffer(target.owner.address, 'HEX');
                            target.owner.alias = authorName;
                            target.owner.scope = window.location.hostname;

                            this.targets[authorName+"_owner"] = target.owner;
                        }
                    }
                }
            }
        });
    }

    VerifyProof (id, sig, target) {
        var objId = new tce.buffer.Buffer(id, 'HEX');
        var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(objId);
    
        var objSig = new tce.buffer.Buffer(sig, 'HEX');
        var targetID = new tce.buffer.Buffer(target, 'HEX');
        var ecSig = tce.bitcoin.ECSignature.fromDER(objSig);
    
        if (!linkKeyPair.verify(targetID, ecSig)) {
            console.log("Invalid signature on id : " + objId.toString('HEX'));
            alert("Invalid signature on id : " + objId.toString('HEX'));
            return false;
        }
    
        return true;
    }
     BuildProof(settings, username, content) {
        let hash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
        let signature = settings.keyPair.signCompact(hash); // sign needs a sha256

        let proof =
            ' ([Proof](' + settings.infoserver +
            '/resources/proof.htm' +
            '?scope=reddit.com' +
            '&script=btc-pkh' +
            '&address=' + settings.address +
            '&signature=' + signature.toString('HEX') +
            '&hash=' + hash.toString('HEX') +
            '&name=' + username +
            ' "' + username + '"))';

        return proof;
    }

     EnsureProof($area) {
         console.log(`area val ${$area}`)
        let username = $("span.user a").text();
        let content = $area.val();
        let proofIndex = content.indexOf("([Proof](");
        if (proofIndex >= 0) {
            let temp = content.substring(proofIndex);
            let endIndex = temp.indexOf("))");
            if (endIndex > 0) {
                content = content.substring(0, proofIndex) + content.substring(proofIndex + endIndex + "))".length);
            }
        }

        $area.val(content + this.BuildProof(this.settings, username, content));
    }
    EnableProof () {
    
        $('div.usertext-buttons button.save').click( (e) => {
            let $area = $(e.target).closest("form").find("textarea");
            this.EnsureProof($area);
            return true;
        });


        const observer = new MutationObserver( (mutations) => {
            mutations.forEach( (mutation) => {
                mutation.addedNodes.forEach( (node) => {
                    if (!node.childNodes || node.childNodes.length == 0)
                        return;

                    let $node = $(node);
                    $node.find('div.usertext-buttons button.save').click( (e) => {
                        let $area = $(e.target).closest("form").find("textarea");
                        this.EnsureProof($area);
                        $area.css('visibility', 'hidden');

                        return true;
                    });
                });
            });
        });

        const observerConfig = {
            attributes: false,
            childList: true,
            subtree: true,
            characterData: false
        };

        let targetNode = document.body;
        observer.observe(targetNode, observerConfig);
    }

    RenderLinks () {

        this.CreateText = function(text, title) {
            let $text = $("<b title='"+title+"'>["+text+"]</b>");
            return $text;
        }

        this.CreateLink = (subject, text, title, value, expire) => {
            let $alink = $("<a title='"+title+"' href='#'>["+text+"]</a>");
            $alink.data("subject",subject);
            $alink.click((e) => {
                this.BuildAndSubmitBinaryTrust($(e.target).data("subject"), value, expire);
                return false;
            });
            return $alink;
        }

        this.CreateIdenticon = function(subject, title) {
            let data = new Identicon(subject.address.toString('HEX'), {margin:0.1, size:16, format: 'svg'}).toString();
            let $alink = $('<a title="'+title+'" href="#"><img src="data:image/svg+xml;base64,' + data + '"></a>');
            $alink.data("subject", subject);
            $alink.click(function() {
                let opt = {
                    command:'openDialog',
                    url: 'trustlist.html',
                    data: $(this).data("subject")
                };
                opt['w'] = 800;
                opt['h'] = 800;
                var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
                var wTop = window.screenTop ? window.screenTop : window.screenY;
        
                opt['left'] = Math.floor(wLeft + (window.innerWidth / 2) - (opt['w'] / 2));
                opt['top'] = Math.floor(wTop + (window.innerHeight / 2) - (opt['h'] / 2));
                
                chrome.runtime.sendMessage(opt);
                return false;
            });
            return $alink;
        }

        this.CreateIcoin = function($nameLink, name) {
            if($nameLink.data('trusticon'))
                return;
            let imgURL = chrome.extension.getURL("img/"+name);
            let $alink = $('<a href="javascript:void(0);" class="entrytrusticon"><img src="' + imgURL + '"></a>');
            $alink.click(function() {
                $(this).closest('div.entry').children('form, ul').toggle();
            });
            $alink.insertBefore($nameLink);
            $nameLink.data("trusticon", true);
        }
        
        for(let authorName in this.targets) {
            if(authorName.indexOf(this.OwnerPrefix) == 0)
                continue; // Ignore owners

            let subject = this.targets[authorName];
            subject.queryResult = this.queryResult;
            let owner = this.targets[this.OwnerPrefix + authorName];
            let ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
            subject.binaryTrust = this.trustHandler.CalculateBinaryTrust(subject.address.toString('base64'), ownerAddressBase64);


            let $nameLink = $('p.tagline a.id-'+subject.thingId);
            let $tagLine = $nameLink.parent();
            let $entry = $tagLine.closest('div.entry');
            
            let $span = $("<span class='userattrs' id='tcButtons'></span>");
            
            $span.append(this.CreateIdenticon(subject, "Analyse "+authorName));

            if(subject.binaryTrust.direct && subject.binaryTrust.directValue) 
                $span.append(this.CreateText("T", "Trust"));
            else
                $span.append(this.CreateLink(subject, "T", "Trust "+authorName, true, 0));

            if(subject.binaryTrust.direct && !subject.binaryTrust.directValue) 
                $span.append(this.CreateText("D", "Distrust"));
            else
                $span.append(this.CreateLink(subject, "D", "Distrust "+authorName, false, 0));

            if(subject.binaryTrust.direct) 
                $span.append(this.CreateLink(subject, "U", "Untrust "+authorName, true, 1));


            if(subject.binaryTrust.isTrusted == 0) {
                $tagLine.children(".entrytrusticon").remove();
            }                

            if(subject.binaryTrust.isTrusted > 0) {
                if(this.settings.trustrender == "color") 
                    $entry.css("background-color", this.settings.trustrendercolor);
                else 
                if(this.settings.trustrender == "icon") {
                    this.CreateIcoin($nameLink, "check16.png");
                }
            }
                    
            if(subject.binaryTrust.isTrusted < 0) {
                if(this.settings.resultrenderhide)
                    $entry.children('form, ul').hide();

                if(this.settings.resultrender == "color") {
                    $entry.css("background-color", this.settings.resultrendercolor);
                    $nameLink.parent().click(function() {
                        $(this).closest('div.entry').children('form, ul').toggle();
                    });
                }
                else
                if(this.settings.resultrender == "icon") {
                    this.CreateIcoin($nameLink, "close16.png");
                }
            }

            var $oldSpan = $tagLine.find('#tcButtons');
            if($oldSpan.length > 0)
                $oldSpan.replaceWith($span);
            else
                $nameLink.after($span);

        }
    };

    BuildAndSubmitBinaryTrust(subject, value, expire) {

        let trustpackage = this.subjectService.BuildBinaryTrust(subject, value, null, expire);
        this.packageBuilder.SignPackage(trustpackage);
        $['notify']("Updating trust", 'success');
        this.trustchainService.PostTrust(trustpackage).done((trustResult)=> {
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            this.QueryAndRender(null).then(function() {
                //$.notify("Done",'success');
            }).fail(function(trustResult){ 
                $['notify']("Query failed: " +trustResult.message,"fail");
            });

        }).fail(function(trustResult){ 
            $['notify']("Adding trust failed: " +trustResult.message,"fail");
        });
    }

    QueryAndRender (params) {
        return this.trustchainService.Query(this.targets, window.location.hostname).then((result) => {
            if (result || result.status == "Success") 
            this.queryResult = result.data.results;
            else
                console.log(result.message);
            
            this.trustHandler = new TrustHandler(this.queryResult, this.settings);

            this.RenderLinks();
        }, this.DeferredFail);
    }

    DeferredFail(error, arg1, arg2) {
        console.log(error);
    }
}



const settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    let packageBuilder = new PackageBuilder(settings);
    let subjectService = new SubjectService(settings, packageBuilder);
    let trustchainService = new TrustchainService(settings);
   
	if (document.documentElement.getAttribute('xmlns')) {
        // Old reddit
        console.log('Old reddit')
        let reddit = new Reddit(settings,  packageBuilder, subjectService, trustchainService);

        reddit.EnableProof();
        reddit.QueryAndRender(null);
    
        // Update the content when trust changes on the Trustlist.html popup
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.command === 'updateContent') {
                reddit.QueryAndRender(request.queryResult);
            }
        });
    } else {
        console.log('New reddit')
        // Mew reddit
        const redditD2X = new RedditD2X(settings,  packageBuilder, subjectService, trustchainService);
        redditD2X.bindEvents()
    }
});

