import * as angular from 'angular';

class IdentityPopupController {

    public content: string;


    constructor(private $scope: ng.IScope) {
        this.content = "Test\r\nme!";
    }

    init() {
        this.content = "Test\r\nme!";
    }
}

const app = angular.module("myApp", []);
app.controller('IdentityPopupController', ["$scope", IdentityPopupController]) // bootstrap angular app here 

