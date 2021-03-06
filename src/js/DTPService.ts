import { DtpGraphCoreModelQueryContext, DtpGraphCoreModelQueryRequest, DtpCoreModelPackage } from '../lib/typescript-jquery-client/model/models';
import { PackageApi, QueryApi } from '../lib/typescript-jquery-client/api/api';
import IProfile from './IProfile';
import ISettings from './Interfaces/Settings.interface';
import * as $ from 'jquery';
import PackageBuilder from "./PackageBuilder";
import { Claim } from '../lib/dtpapi/model/Claim';


export default class DTPService  {
    settings: ISettings;

    packageApi : PackageApi;
    queryApi : QueryApi;

    constructor(settings: ISettings) {
        this.settings = settings;
        this.packageApi = new PackageApi(settings.infoserver);
        this.queryApi = new QueryApi(settings.infoserver);
    } 
    //{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext; }
    Query (targets: Array<IProfile>, scope: any) : JQueryPromise<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext;  }> {
        let query = this.BuildQuery(targets, scope);
        if(query == null) 
            return $.Deferred<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext;  }>().resolve(null, null).promise();

        return this.queryApi.resolvePost(query);
    }

    BuildQuery (targets: Array<IProfile>, scope: string) : DtpGraphCoreModelQueryRequest {
        let subjects = $.map(targets, p => p.id);

        if(subjects.length == 0)
            return null;
    
        let obj = <DtpGraphCoreModelQueryRequest>{
            "issuer": { 
                type: "thing",
                id: this.settings.address 
            },
            "subjects": subjects,
    
            // Scope is used to filter on trust resolvement. It can be any text
            "scope": (scope) ? scope : undefined, // The scope could also be specefic to country, area, products, articles or social medias etc.
    
            // Claim made about the subject. The format is specified by the version property in the header section.
            "types": [
                PackageBuilder.BINARY_TRUST_DTP1,
                PackageBuilder.RATING_TRUST_DTP1
              ],
            "level": 0, // Use default level search (0)
            //"flags": "LeafsOnly"
        };

        return obj;
    }

    async getIdentityMetadata(id: string) : Promise<any> {

        let url = this.settings.infoserver+'/api/Identity/metadata/?id='+id;
        
        let result = null;
        await $.ajax({
            type: "GET",
            url: url,
            contentType: 'application/json; charset=utf-8',
        }).then(function (msg, textStatus, jqXHR) {
            result = msg;
        }).fail(function (jqXHR, textStatus, errorThrown) {
            // this.TrustServerErrorAlert(jqXHR, textStatus, errorThrown, this.settings.infoserver);
            // deferred.fail(jqXHR);
        });
        return result;
    }

    async getClaimInline(claim: Claim) : Promise<any> {

        //curl -X GET "https://trust.dance/api/Claim?issuerId=1QEw3JUFNzKEW1N4MnsBzS1PHuaMksW7MX&subjectId=DLNPqTz41x1EYUfFyPwNKEiD11H8g5x1QQ&scope=url&type=rating" -H "accept: application/json"
        let url = this.settings.infoserver+`/api/Claim/?issuerId=${claim.issuer.id}&subjectId=${claim.subject.id}&scope=${claim.scope}&type=${claim.type}`;
        
        let result = await $.ajax({
            type: "GET",
            url: url,
            contentType: 'application/json; charset=utf-8',
        });
        return result;
    }

    
    async getLastest(skip: number = 0, page: number = 10, meta: boolean = true) : Promise<Array<Claim>> {

        // curl -X GET "https://trust.dance/api/Claim/latest?page=10&skip=0" -H "accept: application/json"
        let url = this.settings.infoserver+`/api/Claim/latest?page=${page}&skip=${skip}&meta=${meta}`;
        
        let result = await $.ajax({
            type: "GET",
            url: url,
            contentType: 'application/json; charset=utf-8',
        });
        return result;
    }

    
    async getHistory(id:string, skip: number = 0, page: number = 10, meta: boolean = true) : Promise<Array<Claim>> {

        // curl -X GET "https://trust.dance/api/Claim/latest?page=10&skip=0" -H "accept: application/json"
        let url = this.settings.infoserver+`/api/Claim/history?id=${id}&page=${page}&skip=${skip}&meta=${meta}`;
        
        let result = await $.ajax({
            type: "GET",
            url: url,
            contentType: 'application/json; charset=utf-8',
        });
        return result;
    }


    // async getSubjectClaims(id:string, skip: number = 0, page: number = 10, meta: boolean = true) : Promise<Array<Claim>> {

    //     let url = this.settings.infoserver+`/api/Claim/subject?id=${id}&page=${page}&skip=${skip}&meta=${meta}`;
        
    //     let result = await $.ajax({
    //         type: "GET",
    //         url: url,
    //         contentType: 'application/json; charset=utf-8',
    //     });
    //     return result;
    // }


    // QuerySingle (target: string, scope: any) : JQueryPromise<any> {
    //     let query = this.BuildQuerySingle(target, scope);
    //     if(query == null) {
    //         let deferred = $.Deferred();
    //         deferred.resolve(null);
    //         return deferred.promise();
    //     }
    //     //this.queryApi.basePath = this.settings.infoserver;
    //     DTP['trace'](JSON.stringify(query, null, 2));
    //     return this.queryApi.resolvePost(query);
    // }

    // BuildQuerySingle (target: string, scope: string) : DtpGraphCoreModelQueryRequest {
    //     let subjects = new Array<string>();
    //     subjects.push(target);
    
    //     let obj = <DtpGraphCoreModelQueryRequest>{
    //         "issuer": { 
    //             type: "secp256k1-pkh",
    //             id: this.settings.address }  ,
    //         "subjects": subjects,
    
    //         // Scope is used to filter on trust resolvement. It can be any text
    //         "scope": (scope) ? scope : undefined, // The scope could also be specefic to country, area, products, articles or social medias etc.
    
    //         // Claim made about the subject. The format is specified by the version property in the header section.
    //         "types": [
    //             "binary.trust.dtp1"
    //           ],
    //         "level": 0, // Use default level search (0)
    //         //"flags": "LeafsOnly"
    //     };

    //     return obj;
    // }

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

    PostPackage (claimPackage: DtpCoreModelPackage) : JQueryPromise<any> {
        this.packageApi.basePath = this.settings.infoserver;
        return this.packageApi.postPackage(claimPackage);
    }
    


    // Get(url:string) : Promise<any> {
    //     return jQuery.ajax({
    //         type: "GET",
    //         url: url,
    //         contentType: 'application/json; charset=utf-8',
    //     });
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
