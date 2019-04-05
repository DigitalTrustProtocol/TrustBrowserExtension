import { browser } from "webextension-polyfill-ts";

class SiteManager {
    static dtpUserContext: any;

    static GetUserContext(): JQueryPromise<any> {
        let deferred = $.Deferred<any>();
        if (SiteManager.dtpUserContext)
            deferred.resolve(SiteManager.dtpUserContext);

        const initData = $("#init-data");
        if (initData.length > 0) {
            const user = JSON.parse(initData[0]['value']);

            const source = {
                userId: user.userId,
                screen_name: user.screenName,
                alias: user.fullName,
                formAuthenticityToken: user.formAuthenticityToken,
                host: window.location.hostname
            }
            browser.storage.local.set({ context: source });
            SiteManager.dtpUserContext = source;
            deferred.resolve(source);
        } else {
            browser.storage.local.get("context").then((result) => {
                let context = result.context ||
                    {
                        userId: '',
                        screen_name: '',
                        alias: '',
                        formAuthenticityToken: '',
                        host: ''
                    }
                SiteManager.dtpUserContext = context;
                deferred.resolve(context);
            });
        }
        return deferred.promise();
    }
}

export = SiteManager