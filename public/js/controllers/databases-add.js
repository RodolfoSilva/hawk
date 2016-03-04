/**
 * Databases add controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller("databases-add", function($scope, $http, $location, ngProgressFactory){
        $scope.progressbar = ngProgressFactory.createInstance();

        $scope.testconnection = function(){
            $scope.progressbar.start();

            $http({
                method: "POST",
                url: "databases-test",
                data: $scope.data
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    alert(res.data.msg);
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };

        $scope.add = function(){
            $scope.progressbar.start();

            $http({
                method: "POST",
                url: "databases-save",
                data: $scope.data
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/databases");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };
    });
});