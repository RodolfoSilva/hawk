'use strict';

require.config({
    baseUrl:"js",
    paths:{
        "text":"./plugins/requirejs/text",
        "domReady": "./plugins/requirejs/domReady",
        "jquery":"./plugins/jquery-2.2.0.min",
        "bootstrap": "plugins/bootstrap.min",
        "angular":"./plugins/angular/angular.min",
        "angularAMD":"./plugins/angular/angularAMD.min",
        "angular-routes": "./plugins/angular/angular-route.min",
        "angular-sparklines":"./plugins/angular/angular-sparklines.min",
        "angular-sanitize":"./plugins/angular/angular-sanitize.min",
        "angular-resource":"./plugins/angular/angular-resource.min",
        "angular-cookies":"./plugins/angular/angular-cookies.min",
        "angular-ngprogress":"./plugins/angular/angular-ngprogress",
        "angular-base64-upload":"./plugins/angular/angular-base64-upload.min",
        "angular-rangerslider":"./plugins/angular/angular.rangeSlider",
        "angular-dirpagination":"./plugins/angular/dirPagination",
        "angular-autocomplete":"./plugins/angular/autocomplete",
        "ui-bootstrap": "./plugins/ui-bootstrap-1.1.2.min", 
        "bootstrap-taginput": "plugins/bootstrap-tagsinput.min", 
        "angular-bootstrap-taginput": "plugins/bootstrap-tagsinput-angular.min",
        "d3": "plugins/d3.min",
        "socket.io": "../socket.io/socket.io"
    },
    shim:{
        "angular":{exports:"angular"},
        "angularAMD": ["angular"],
        "bootstrap": ["jquery"],
        "angular-routes": ["angular"],
        "angular-sparklines": ["angular"],
        "angular-sanitize": ["angular"],
        "angular-resource": ["angular"],
        "angular-cookies": ["angular"],
        "angular-ngprogress": ["angular"],
        "angular-base64-upload": ["angular"],
        "angular-rangerslider": ["angular"],
        "angular-dirpagination": ["angular"],
        "angular-autocomplete": ["angular"],
        "ui-bootstrap": ["angular"],
        "bootstrap-taginput": ["jquery"],
        "angular-bootstrap-taginput": ["angular"],
        'socket.io': {exports: 'io'}
    },
    priority:[
        "angular"
    ],
    deps: ["app"]
});