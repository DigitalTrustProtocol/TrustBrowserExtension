import Crypto = require('../Crypto');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';

class UrlApp {

    public config = null;

    constructor(config) {
        this.config = config;
    }


    queryDTP(url: string): JQueryPromise<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext; }> {
        if(url  == null || url.length == 0)
            return $.Deferred<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext; }>().resolve(null).promise();

        let scope = "url";
        return this.config.dtpService.Query(url, scope).done((response, queryResult) => {
            // Process the result
             let trustResult = this.config.trustStrategy.ProcessSingleResult(queryResult);
             //console.log(JSON.stringify(trustResult, null, 2));

        });
    }


    ready(doc: Document): JQueryPromise<void> {
        
        // Check url even that doc is not ready!
        let url = window.location.href;
        
        // hash it!
        let urlHash = Crypto.Hash160(url);

        this.queryDTP(urlHash);


        return $(doc).ready($=> {
            // Get meta data 
            // Like author, content id etc.

            


        }).promise(null);
    }
}

export = UrlApp;
