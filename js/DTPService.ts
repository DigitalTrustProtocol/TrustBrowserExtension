///<reference path="../typings/globals/jquery/index.d.ts" />
import ISettings from './Settings.interface';
import { SubjectQuery, QueryRequest, ModelPackage, TrustScope } from '../lib/dtpapi/model/models';
import { PackageApi, QueryApi } from '../lib/dtpapi/api/api';
import { QueryContext } from '../lib/dtpapi/model/models';
import Profile = require('./Profile');


class DTPService  {
    settings: ISettings;

    packageApi : PackageApi;
    queryApi : QueryApi;

    constructor(settings: ISettings) {
        this.settings = settings;
        this.packageApi = new PackageApi(settings.infoserver);
        this.queryApi = new QueryApi(settings.infoserver);
    } 

    Query (targets: Array<Profile>, scope: any) :JQueryPromise<QueryContext> {
        let query = this.BuildQuery(targets, scope);
        if(query == null) {
            let deferred = $.Deferred();
            deferred.resolve(null);
            return deferred.promise();
        }
        this.queryApi.basePath = this.settings.infoserver;
        return this.queryApi.resolvePost(query);
    }

    BuildQuery (targets: Array<Profile>, scope: any) : QueryRequest {
        let subjects = new Array<SubjectQuery>();
        //targets.forEach((target, index) => {
        for (let key in targets) {
            if (!targets.hasOwnProperty(key))
                continue;            
            let target = targets[key];
            
            let subject = <SubjectQuery>{ address: (target.userId) ? target.userId : target.address };
            subjects.push(subject);
            if(target.owner && target.owner.ID) {
                let owner = <SubjectQuery>{ address: target.owner.ID };
                subjects.push(owner);
            }
        }

        if(subjects.length == 0)
            return null;
    
        if(typeof scope === 'string')
            scope = <TrustScope>{ value : scope };

        let obj = <QueryRequest>{
            "issuers": this.settings.address,
            "subjects": subjects,
    
            // Scope is used to filter on trust resolvement. It can be any text
            "scope": (scope) ? scope : undefined, // The scope could also be specefic to country, area, products, articles or social medias etc.
    
            // Claim made about the subject. The format is specified by the version property in the header section.
            "types": [
                "binary.trust.dtp1",
                "alias.identity.dtp1"
              ],
            "level": 0, // Use default level search (0)
            //"flags": "LeafsOnly"
        };

        return obj;
    }

    // GetTrustById (id) {
    //     let url ='/api/trust/get/'+id; // id = encoded byte array
    
    //     return this.GetData(url);
    // }

    // GetSimilarTrust (trust) {
    //     let url ='/api/trust/get/?issuer='+trust.issuer.address+'&subject='+trust.subject.address+'&type='+encodeURIComponent(trust.type)+'&scopevalue='+encodeURIComponent((trust.scope) ? trust.scope.value : "");
    
    //     return null; // this.GetData(url);
    // }


    // GetTrustTemplate (subject, alias) {
    //     let url ='/api/trust/build?issuer='+this.settings.address+'&subject='+subject+'&alias='+alias;
    
    //     return this.GetData(url);
    // }


    // PostTrustTemplate (trustPackage) {
    //     return this.PostData('/api/package/build', JSON.stringify(trustPackage));
    // }

    PostPackage (claimPackage: ModelPackage) : JQueryPromise<any> {
        this.packageApi.basePath = this.settings.infoserver;
        return this.packageApi.postPackage(claimPackage);
    }
    
    // GetData (query) {
    //     let deferred = $.Deferred();
    //     let url = this.settings.infoserver + query;

    //     $.ajax({
    //         type: "GET",
    //         url: url,
    //         contentType: 'application/json; charset=utf-8',
    //     }).done(function (msg, textStatus, jqXHR) {
    //        let resolve = msg;
    //         deferred.resolve(resolve);
    //     }).fail(function (jqXHR, textStatus, errorThrown) {
    //         this.TrustServerErrorAlert(jqXHR, textStatus, errorThrown, this.settings.infoserver);
    //         deferred.fail(jqXHR);
    //     });

    //     return deferred.promise();
    // }


    // PostData = (query, data) => {
    //     let deferred = $.Deferred();

    //     let url = this.settings['infoserver'] + query;

    //     $.ajax({
    //         type: "POST",
    //         url: url,
    //         data: data,
    //         contentType: 'application/json; charset=utf-8',
    //         dataType: 'json'
    //     }).done((msg, textStatus, jqXHR) => {
    //         let resolve = msg;
    //         deferred.resolve(resolve);
    //     }).fail((jqXHR, textStatus, errorThrown) => {
    //         this.TrustServerErrorAlert(jqXHR, textStatus, errorThrown, this.settings.infoserver);
    //         deferred.fail();
    //     });

    //     return deferred.promise();
    // }

    // TrustServerErrorAlert (jqXHR, textStatus, errorThrown, server) {
    //     if (jqXHR.status == 404 || errorThrown == 'Not Found') {
    //         var msg = 'Error 404: Server ' + server + ' was not found.';
    //         //alert('Error 404: Server ' + server + ' was not found.');
    //         console.log(msg);
    //     }
    //     else {
    //         var msg = textStatus + " : " + errorThrown;
    //         if (jqXHR.responseJSON && jqXHR.responseJSON.ExceptionMessage)
    //             msg = jqXHR.responseJSON.ExceptionMessage;
    
    //         alert(msg);
    //     }
    // }

}
export = DTPService;