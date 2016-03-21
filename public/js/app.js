/**
 * App controller
 */
'use strict';

define(['angularAMD', 'angular-routes', "angular-sparklines", "angular-sanitize", "angular-resource",'angular-ngprogress', 'angular-base64-upload', 'angular-rangerslider', "angular-dirpagination", "angular-autocomplete", "ui-bootstrap", "bootstrap-taginput", "angular-bootstrap-taginput", "angular-cookies", "angular-json-explorer"], function (angularAMD) {
    var app = angular.module("hawk", ["ng", "ngRoute", "ngProgress", "ngCookies", "ngSanitize", "ngResource", "naif.base64", "ui.bootstrap", "bootstrap-tagsinput", "ui-rangeSlider", "sparklines", "autocomplete", "angularUtils.directives.dirPagination", "ngJsonExplorer"]);
    
    app.config(function ($routeProvider) {
        $routeProvider
        .when("", angularAMD.route({templateUrl: 'home.html', controller: 'home', controllerUrl: 'controllers/home'}))
        .when("/", angularAMD.route({templateUrl: 'home.html', controller: 'home', controllerUrl: 'controllers/home'}))
        .when("/home", angularAMD.route({templateUrl: 'home.html', controller: 'home', controllerUrl: 'controllers/home'}))
        .when("/filters", angularAMD.route({templateUrl: 'filters.html', controller: 'filters', controllerUrl: 'controllers/filters'}))
        .when("/filters-add", angularAMD.route({templateUrl: 'filters-manager.html', controller: 'filters-manager', controllerUrl: 'controllers/filters-manager'}))
        .when("/filters-edit", angularAMD.route({templateUrl: 'filters-manager.html', controller: 'filters-manager', controllerUrl: 'controllers/filters-manager'}))
        .when("/databases", angularAMD.route({templateUrl: 'databases.html', controller: 'databases', controllerUrl: 'controllers/databases'}))
        .when("/databases-add", angularAMD.route({templateUrl: 'databases-add.html', controller: 'databases-add', controllerUrl: 'controllers/databases-add'}))
        .when("/mappers", angularAMD.route({templateUrl: 'mappers.html', controller: 'mappers', controllerUrl: 'controllers/mappers'}))
        .when("/mappers-add", angularAMD.route({templateUrl: 'mappers-add.html', controller: 'mappers-add', controllerUrl: 'controllers/mappers-add'}))
        .when("/updaters", angularAMD.route({templateUrl: 'updaters.html', controller: 'updaters', controllerUrl: 'controllers/updaters'}))
        .when("/updaters-add", angularAMD.route({templateUrl: 'updaters-add.html', controller: 'updaters-add', controllerUrl: 'controllers/updaters-add'}))
        .when("/routines", angularAMD.route({templateUrl: 'routines.html', controller: 'routines', controllerUrl: 'controllers/routines'}))
        .when("/routines-add", angularAMD.route({templateUrl: 'routines-add.html', controller: 'routines-add', controllerUrl: 'controllers/routines-add'}))
        .otherwise({redirectTo: "/home"});
    });

    app.run(function($rootScope, $http, $cookies) {
        $rootScope.loadlng = function(id, url){
             $http({
                 method: "GET",
                 url: url,
             }).then(function(res){
                 if(res.data.error)
                     $rootScope.error = res.data.error;
                 else 
                     $rootScope[id] = res.data;
             }, function(res){
                 $rootScope.error = "Fails when trying to get data from the server Please try again or contact support.";
             });
             
             $cookies.put("lng", url);
        };   

        var lng = $cookies.get("lng");
        $rootScope.loadlng("lng", ((typeof lng == "string") ? lng : "i18n/en.json"));
    });
    
    return angularAMD.bootstrap(app);
});