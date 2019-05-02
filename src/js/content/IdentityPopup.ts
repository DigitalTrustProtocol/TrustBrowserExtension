class IdentityPopupController {

    constructor(private $scope: ng.IScope) {
    }

    init() {
        
    }
}

const app = angular.module("myApp", []);
app.controller('IdentityPopupController', ["$scope", IdentityPopupController]) // bootstrap angular app here 

