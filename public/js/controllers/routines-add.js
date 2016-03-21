/**
 * Home controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller('routines-add', function ($scope, $http, $location) {
        $http({
            method: "GET",
            url: "data-updaters",
        }).then(function(res){                
            if(res.data.error)
                $scope.error = res.data.error;
            else
                $scope.updaters = res.data;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });
        
        $http({
            method: "GET",
            url: "data-mappers",
        }).then(function(res){                
            if(res.data.error)
                $scope.error = res.data.error;
            else
                $scope.mappers = res.data;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });
        
        $scope.add = function(){
           $http({
                method: "POST",
                url: "routines-add",
                data: $scope.data
            }).then(function(res){
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/routines");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            }); 
        };
    });
});