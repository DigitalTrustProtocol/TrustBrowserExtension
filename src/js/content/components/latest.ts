import { Claim } from "../../../lib/dtpapi/model/Claim";


export const LatestClaims = {
    bindings: {
        services: '<',
        claims: '<'
      },
    templateUrl: () => chrome.extension.getURL("./templates/latest.html"),
    controller: class LatestClaimsController {
        public name: string;
        public lastestClaims: Array<Claim> = []
        constructor() {
            this.name = 'World!!!';
        }
    }
}