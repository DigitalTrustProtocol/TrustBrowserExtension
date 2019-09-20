import { Claim } from "../../../lib/dtpapi/model/Claim";


export const ClaimValue = {
    bindings: {
        claim: '<'
      },
    templateUrl: () => chrome.extension.getURL("./templates/claimValue.html"),
    controller: class ClaimValueController {
        public claim: Claim;
        constructor() {
        }
    }
}