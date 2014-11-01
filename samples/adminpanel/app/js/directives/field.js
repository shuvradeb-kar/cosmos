/**
 * Created by maruf on 10/28/14.
 */

directives.directive('field', function ($compile) {
    return {
        restrict: 'E',
        scope: {
            item: '=',
            val: '='
        },

        controller: ['$scope', '$location', '$routeParams', 'message', 'CosmosService', 'namedcolection', 'calculator', 'globalhashtable', 'cosmos.settings',
            function ($scope, $location, $routeParams, message, CosmosService, namedcolection, calculator, hashtable, settings) {
                $scope.namedcolection = namedcolection;
                $scope.calculator = calculator;
                $scope.CosmosService = CosmosService;
                $scope.hashtable = hashtable;

                $scope.receiveServiceDataAs = function (data, args) {
                    if (!args) {
                        return;
                    }

                    var name = args['name'];
                    var parse = args['parse'];

                    if (name) {
                        if (parse) {
                            $scope[name] = JSON.parse(data);
                        }
                        else {
                            $scope[name] = data;
                        }
                    }
                };

                $scope.prepareObject = function (item, data) {
                    angular.forEach(item.fields, function (value, index) {
                        if (value.type === "composite") {
                            data[value.name] = {};
                            $scope.prepareObject(value, data[value.name]);
                        }
                        else if (value.type === "array") {
                            data[value.name] = [];
                            data[value.name][0] = {};
                            $scope.prepareObject(value, data[value.name][0]);
                        }
                        else {
                            if (value.name) {
                                data[value.name] = "";
                            }
                            else {
                                //data[value] = "";
                            }
                        }
                    });
                };

                $scope.add_primitive_item = function (position) {
                    var newItem = "";
                    $scope.prepareObject($scope.item, newItem);

                    $scope.val.splice(position + 1, 0, newItem);
                };

                $scope.add_item = function (position) {
                    var newItem = {};
                    $scope.prepareObject($scope.item, newItem);

                    if (!$scope.val) {
                        //TODO: This condition should be handled from link function
                        $scope.val = [];
                    }

                    $scope.val.splice(position + 1, 0, newItem);
                };

                $scope.removeItem = function (index) {
                    $scope.val.splice(index, 1);
                };

                $scope.getLookup = function (field, ref) {
                    var lookupFound;
                    angular.forEach(field.options.lookups, function (lookup, index) {
                        if (lookup.ref === ref) {
                            lookupFound = lookup;
                        }
                    });
                    return lookupFound;
                };

                $scope.updateOptions = function (field) {
                    var lookup;
                    if ($scope.item.options.saveValueOnly) {
                        $scope.val = undefined;
                        lookup = $scope.getLookup(field, $scope.ref);
                    }
                    else {
                        $scope.val.data = undefined;
                        lookup = $scope.getLookup(field, $scope.val.ref || $scope.ref);
                    }

                    if (field.optionData[lookup.ref]) {
                        $scope.optionData = field.optionData[lookup.ref];
                    }
                    else {
                        var url = lookup.url;
                        CosmosService.get(url, function (data) {
                                $scope.optionData = data;
                                field.optionData[lookup.ref] = data;
                            },
                            function (data, status) {
                                $scope.processError(data, status);
                            }
                        );
                    }
                };

                //START MenuRef methods
                $scope.getMenuConfigurationByUrl = function (url) {
                    CosmosService.get(url, function (data) {
                            $scope.data = {};
                            $scope.menuConfiguration = data;
                        },
                        function (data, status) {
                            //TODO: $scope.processError(data, status);
                        }
                    );
                };

                $scope.getMenuConfiguration = function () {
                    $scope.appPath = $routeParams.appPath;

                    settings.getAppSettings($scope.appPath, "menuconfigobject", function (objectName) {
                            var url = '/service/' + objectName + '/' + $scope.item.value.menuId + '/';
                            $scope.getMenuConfigurationByUrl(url);
                        },
                        function (status, data) {
                            var url = '/service/cosmos.menuconfigurations/' + $scope.item.value.menuId + '/';
                            $scope.getMenuConfigurationByUrl(url);
                        }
                    );
                };

                //END MenuRef methods

                //START List methods

                //List ref

                $scope.getListDataBy = function (columns, objectName) {
                    var columnsCsv = '';
                    angular.forEach(columns, function (column, index) {
                        columnsCsv += column.name + ",";
                    });
                    var url = '/service/' + objectName + '/?columns=' + columnsCsv;

                    CosmosService.get(url, function (data) {
                            $scope.data = data;
                        },
                        function (data, status) {
                            //TODO: $scope.processError(data, status);
                        }
                    );
                };

                $scope.getListDataFromConfig = function (listConfiguration) {
                    var columns = listConfiguration.columns;
                    var objectName = listConfiguration.objectName;

                    $scope.getListDataBy(columns, objectName);
                };

                $scope.getListConfigurationByUrl = function (url) {
                    CosmosService.get(url, function (data) {
                            $scope.data = {};
                            $scope.listConfiguration = data;
                            $scope.getListDataFromConfig($scope.listConfiguration);
                        },
                        function (data, status) {
                            //TODO: $scope.processError(data, status);
                        }
                    );
                };

                $scope.getListConfiguration = function () {
                    $scope.appPath = $routeParams.appPath;

                    settings.getAppSettings($scope.appPath, "listconfigobject", function (objectName) {
                            var url = '/service/' + objectName + '/' + $scope.item.value.listId + '/';
                            $scope.getListConfigurationByUrl(url);
                        },
                        function (status, data) {
                            var url = '/service/cosmos.listconfigurations/' + $scope.item.value.listId + '/';
                            $scope.getListConfigurationByUrl(url);
                        }
                    );
                };

                //END List methods

                // START FormRef methods
                $scope.getFormConfigurationByUrl = function (url) {
                    CosmosService.get(url, function (data) {
                            $scope.data = {};
                            $scope.form = data;
                            if ($scope.val) {
                                $scope.getFormData($scope.form, $scope.val);
                            }
                        },
                        function (data, status) {
                            //TODO: $scope.processError(data, status);
                        }
                    );
                };

                $scope.getFormConfiguration = function () {
                    $scope.appPath = $routeParams.appPath;

                    settings.getAppSettings($scope.appPath, "formconfigobject", function (objectName) {
                            var url = '/service/' + objectName + '/' + $scope.item.value.formId + '/';
                            $scope.getFormConfigurationByUrl(url);
                        },
                        function (status, data) {
                            var url = '/service/cosmos.forms/' + $scope.item.value.formId + '/';
                            $scope.getFormConfigurationByUrl(url);
                        }
                    );
                };

                $scope.getFormData = function (form, dataId) {
                    if (dataId) {
                        var url = form.action + '/' + dataId + '/';
                        CosmosService.get(url, function (data) {
                                $scope.data = data;
                            },
                            function (data, status) {
                                $scope.processError(data, status);
                            }
                        );
                    }
                };

                $scope.processFormResult = function (form, result) {
                    if (form && form.onsuccess) {
                        if (form.onsuccess.type === "url") {
                            var _id = ($scope.item.dataId || JSON.parse(result));
                            window.location.href = form.onsuccess.value.replace("{{_id}}", _id);
                        }
                        else if (form.onsuccess.type === "message") {
                            message.push({"message": form.onsuccess.value, "title": "Sucess", "data": result});
                            $location.path('/message');
                        }
                        else if (form.onsuccess.type === "inlinemessage") {
                            $scope.submitDone = true;
                        }
                    }
                };

                $scope.onFormSubmit = function () {
                    if ($scope.form.action) {
                        if ($scope.form.action) {
                            if (!$scope.item.dataId) {
                                CosmosService.post($scope.form.action, $scope.data, function (data) {
                                        $scope.processFormResult($scope.form, data);
                                    },
                                    function (data, status) {
                                        //TODO: $scope.processError(data, status);
                                    }
                                );
                            }
                            else {
                                var url = $scope.form.action + '/' + $scope.item.dataId + '/';
                                CosmosService.put(url, $scope.data, function (data) {
                                        $scope.processFormResult($scope.form, data);
                                    },
                                    function (data, status) {
                                        //TODO: $scope.processError(data, status);
                                    }
                                );
                            }
                        }
                    }
                };
                // END FormRef methods

                $scope.validateBlockType = function (blockType) {
                    switch (blockType) {
                        case 'h1':
                        case 'h2':
                        case 'h3':
                        case 'h4':
                        case 'h5':
                        case 'p':
                            break;
                        default:
                            throw "HTML block not allowed";
                            break;
                    }
                };

                $scope.getTemplate = function (item) {
                    var itemType = item.type;
                    var template;
                    switch (itemType) {
                        //Page fields
                        case "htmlblock":
                            $scope.validateBlockType(item.blocktype);
                            template = '<' + item.blocktype + ' ng-class="item.cssclass">{{item.value}}</' + item.blocktype + '>';
                            break;

                        case "hyperlink":
                            template = '<a ng-class="item.cssclass" href="' + item.value.href + '">' + item.value.text + '</a>';
                            break;

                        case "image":
                            template = '<img ng-src="{{item.src}}" />';
                            break;

                        case "twocolumn":
                            template = '' +
                                '<div class="container-fluid">' +
                                '   <div class="row">' +
                                '       <div class="{{item.leftcolumn.cssclass}}">' +
                                '           <field item="item.leftcolumn"></field>' +
                                '       </div>' +
                                '       <div class="{{item.rightcolumn.cssclass}}">' +
                                '           <field item="item.rightcolumn"></field>' +
                                '       </div>' +
                                '   </div>' +
                                '</div>';
                            break;

                        case "threecolumn":
                            template = '' +
                                '<div class="container-fluid">' +
                                '   <div class="row">' +
                                '       <div class="{{item.leftcolumn.cssclass}}">' +
                                '           <field item="item.leftcolumn"></field>' +
                                '       </div>' +
                                '       <div class="{{item.middlecolumn.cssclass}}">' +
                                '           <field item="item.middlecolumn"></field>' +
                                '       </div>' +
                                '       <div class="{{item.rightcolumn.cssclass}}">' +
                                '           <field item="item.rightcolumn"></field>' +
                                '       </div>' +
                                '   </div>' +
                                '</div>';
                            break;

                        case "menu":
                            if (item.navtype === "sidebar") {
                                template = '' +
                                    '<ul class="well nav nav-pills nav-stacked">' +
                                    '   <li ng-repeat="field in item.fields">' +
                                    '       <field item="field"></field>' +
                                    '   </li>' +
                                    '</ul>';
                            }
                            else {
                                template = '' +
                                    '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
                                    '<div class="container">' +
                                    '<div class="navbar-header">' +
                                    '   <a class="navbar-brand" href="{{item.brandhref}}">{{item.brandtitle}}</a>' +
                                    '</div>' +
                                    '<div class="navbar-collapse collapse">' +
                                    '<ul class="nav navbar-nav">' +
                                    '   <li ng-repeat="field in item.fields">' +
                                    '       <field item="field"></field>' +
                                    '   </li>' +
                                    '</ul>' +
                                    '</div>' +
                                    '</div>' +
                                    '</div>';
                            }
                            break;

                        case "menuitem":
                            template = '' +
                                '   <a href="{{item.value.href}}">{{item.value.title}}</a>';
                            break;

                        case "menuref":
                            template = '' +
                                '<field ng-if="menuConfiguration" item="menuConfiguration"></field>';
                            break;

                        case "compositeblock":
                            template = '' +
                                '<div ng-repeat="field in item.fields">' +
                                '    <field item="field"></field>' +
                                '</div>';
                            break;

                        case "widgethost":
                            template = '<div ng-include="\'' + item.value + '\'" class="' + item.cssclass + '"></div>';
                            break;

                        //Form fields
                        case "input":
                        case "text":
                            template = '<span><label>{{item.title}}</label><input type="{{item.htmltype || \'text\'}}" ng-model="val"/></span>';
                            break;

                        case "static":
                            template = '<span><label>{{item.title}}</label><input type="text" ng-model="val" readonly="readonly"/></span>';
                            break;

                        case "textarea":
                            template = '<span><label>{{item.title}}</label><textarea ng-model="val" /></span>';
                            break;

                        case "codeeditor":
                            template = '<span><label>{{item.title}}</label><div ui-ace ng-model="val"></div></span>';
                            break;

                        case "checkbox":
                            template = '<input type="checkbox" ng-model="val"> <label class="control-label">{{item.title}}</label>';
                            break;

                        case "select":
                            template = '' +
                                '<label class="control-label">{{item.title}}</label>' +
                                '<select ng-model="val" ng-options="choice.value as choice.title for choice in item.options.choices">' +
                                '   <option ng-if="item.nullable === true"> --- Select ---</option>' +
                                '</select>';
                            break;

                        case "radiogroup":
                            template = '' +
                                '<label class="control-label">{{item.title}}</label>' +
                                '<div class="composite" ng-repeat="choice in item.options.choices">' +
                                '   <input type="radio" ng-value="choice.value" ng-model="$parent.val">' +
                                '   <label class="control-label">{{choice.title}}</label>' +
                                '</div>';
                            break;

                        case "lookup":
                            if (item.options.saveValueOnly) {
                                template = '' +
                                    '<label class="control-label">{{item.title}}</label>' +
                                    '<select ng-if="!item.options.hideRefType" ng-model="ref" ' +
                                    'ng-options="lookup.ref as lookup.lookupname for lookup in item.options.lookups"' +
                                    'ng-change="updateOptions(item)">' +
                                    '   <option ng-value="null">---</option>' +
                                    '</select>' +

                                    '<select ng-model="val">' +
                                    '    <option ng-value="option[getLookup(item, ref).value]"' +
                                    '    ng-selected="option[getLookup(item, ref).value] === val"' +
                                    '        ng-repeat="option in optionData">{{option[getLookup(item, ref).title]}}</option>' +
                                    '</select>';
                            }
                            else {
                                template = '' +
                                    '<label class="control-label">{{item.title}}</label>' +
                                    '<select ng-model="val.ref" ' +
                                    'ng-options="lookup.ref as lookup.lookupname for lookup in item.options.lookups"' +
                                    'ng-change="updateOptions(item)">' +
                                    '   <option ng-value="null">---</option>' +
                                    '</select>' +

                                    '<select ng-model="val.data">' +
                                    '    <option ng-value="option[getLookup(item, val.ref).value]"' +
                                    '    ng-selected="option[getLookup(item, val.ref).value] === val.data"' +
                                    '        ng-repeat="option in optionData">{{option[getLookup(item, val.ref).title]}}</option>' +
                                    '</select>';
                            }
                            break;

                        case "pageref":
                            template = '' +
                                '<page pageid="item.pageId"></page>';
                            break;

                        case "formref":
                            template = '' +
                                '<div ng-show="submitDone">{{form.onsuccess.value}}</div>' +
                                '<form ng-hide="submitDone">' +
                                '    <div>' +
                                '        <h1>{{form.title}}</h1>' +
                                '    </div>' +
                                '    <ul>' +
                                '        <li ng-repeat="field in form.fields">' +
                                '            <field item="field" val="data[field.name]"></field>' +
                                '        </li>' +
                                '    </ul>' +
                                '    <button class="btn btn-primary" ng-click="onFormSubmit()">Submit</button>' +
                                '</form>';
                            break;

                        case "cssref":
                            template = '<link data-ng-href="{{item.href}}" rel="stylesheet" />';
                            break;

                        case "listref":
                            template = '<div ng-if="listConfiguration !== undefined"><div ng-include="listConfiguration.widgetName" /></div></div>';
                            break;

                        case "form":
                        case "composite":
                            template = '' +
                                '<div>' +
                                '   <label>{{item.title}}</label>' +
                                '</div>' +
                                '<ul>' +
                                '   <li ng-repeat="field in item.fields">' +
                                '       <field item="field" val="val[field.name]"></field>' +
                                '   </li>' +
                                '</ul>';
                            break;

                        case "array":
                            if (item.options && item.options.primitive) {
                                template =
                                    '<div>' +
                                    '   <label>{{item.title}}</label>' +
                                    '   <button ng-click="add_primitive_item(-1)">+</button>' +
                                    '</div>' +
                                    '<ul>' +
                                    '   <li ng-repeat="v in val track by $index">' +
                                    '       <field val="val[$index]" item="item.fields[0]"></field>' +
                                    '       <button ng-click="removeItem($index)">-</button>' +
                                    '       <button ng-click="add_primitive_item($index)">+</button>' +
                                    '   </li>' +
                                    '</ul>';
                            }
                            else {
                                template =
                                    '<div>' +
                                    '   <label>{{item.title}}</label>' +
                                    '   <button ng-click="add_item(-1)">+</button>' +
                                    '</div>' +
                                    '<ul>' +
                                    '   <li ng-repeat="d in val">' +
                                    '       <field val="d[field.name]" item="field" ng-repeat="field in item.fields"></field>' +
                                    '       <button ng-click="removeItem($index)">-</button>' +
                                    '       <button ng-click="add_item($index)">+</button>' +
                                    '   </li>' +
                                    '</ul>';
                            }
                            break;

                        case "itemview":
                            template = '<div ng-include="\'' + item.value.widget + '\'" class="' + item.cssclass + '"></div>';
                            break;


                        default:
                            template = null; //'<span><label>{{item.title}}</label>{{val}}</span>';
                            break;
                    }
                    return template;
                };
            }],

        link: function (scope, element, attributes) {
            console.log("Creating field " + scope.item.type);
            var template = scope.getTemplate(scope.item);
            if (!template) {
                return;
            }

            if (scope.item.type === "static") {
                scope.val = scope.item.options.value;
            }

            if (scope.item.type === "array") {
                if (!scope.val || scope.val.length < 1) {
                    scope.val = [];
                }
            }

            if (scope.item.type === "composite" || scope.item.type === "form") {
                if (!scope.val) {
                    scope.val = {};
                }
            }

            if (scope.item.type === "lookup") {
                scope.item.optionData = {};
                if (!scope.val && !scope.item.options.saveValueOnly) {
                    scope.val = {"ref": null, "data": null};
                }
                else if ((scope.val && scope.val.ref) || (scope.item.options.saveValueOnly && scope.ref)) {
                    scope.updateOptions(scope.item);
                }
                else if (scope.item.options.saveValueOnly && scope.item.options.hideRefType) {
                    scope.ref = scope.item.options.lookups[0].ref;
                    scope.updateOptions(scope.item);
                }
            }

            if (scope.item.type === "listref") {
                scope.getListConfiguration();
            }

            if (scope.item.type === "formref") {
                scope.getFormConfiguration();
            }


            if (scope.item.type === "cssref") {
                var headElement = angular.element(document.getElementsByTagName('head')[0]);

                var newElement = angular.element(template);
                $compile(newElement)(scope);
                headElement.append(newElement);

                template = "<!-- cssref put into header  -->";
            }

            if (scope.item.type === "menuref") {
                scope.menuConfiguration = {"brandtitle": "", "type": "menu", "fields": []};
                scope.getMenuConfiguration();
            }

            console.log("Field template" + template);

            var newElement = angular.element(template);
            $compile(newElement)(scope);
            element.replaceWith(newElement);
        }
    };
});