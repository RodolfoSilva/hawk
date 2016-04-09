/**
 * Mappers add controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap', 'services/FilterService'], function (app) {
    app.controller("mappers-add", function($scope, $http, $location, FilterService){
        $scope.data = {
            requestpersecound: 5,
            cpuusage: 50
        };

        refreshTagsInput();

        FilterService.list()
          .then(function(res){
            if(res.error)
                $scope.error = res.error;
            else
                $scope.filters = res;
          }, function(res){
              $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
          });

        $http({
            method: "GET",
            url: "databases-list",
        }).then(function(res){
            if(res.data.error)
                $scope.error = res.data.error;
            else
                $scope.databases = res.data;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });

        $scope.add = function(){
           $http({
                method: "POST",
                url: "mappers-add",
                data: $scope.data
            }).then(function(res){
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/mappers");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };
    });

    function refreshTagsInput(){
        if($("[data-role='tagsinput']").length > 0)
            $("[data-role='tagsinput']").tagsinput({trimValue: false, confirmKeys: [13, 32]});
    }
});
