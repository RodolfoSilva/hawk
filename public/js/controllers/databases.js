/**
 * Databases controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller("databases", function($scope, $http, $route, $routeParams, $location, ngProgressFactory){
        $scope.progressbar = ngProgressFactory.createInstance();
        $scope.progressbar.start();

        $scope.list = function(){
            $http({
                method: "GET",
                url: "date-databases",
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.databases = res.data;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };


        $scope.remove = function(id){
            $scope.progressbar.start();

            $http({
                method: "POST",
                url: "databases-remove",
                data: {id: id}
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/databases");
                
                $scope.list();
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };

        $scope.list();
    });
});