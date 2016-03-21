/**
 * Home controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller('routines', function ($scope, $http) {
        
        $scope.list = function(){
            $http({
                method: "GET",
                url: "data-routines",
            }).then(function(res){                
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.routines = res.data;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };
        
        $scope.list();
    });
});