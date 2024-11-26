var extensions = {};
extensions['CampusStores.AdoptionSearchExtension.1.2.6'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/AdoptionSearchExtension/1.2.6/' + asset;
};
define('AdoptionSearch.Collection', [
    'Backbone',
    'AdoptionSearch.Model',
    'underscore'
], function AdoptionSearchCollection(
    Backbone,
    AdoptionSearchModel,
    _
) {
    'use strict';
    return Backbone.Collection.extend({
        model: AdoptionSearchModel,
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/AdoptionSearch.Service.ss'))
    });
});
define('AdoptionSearch.Edit.View', [
    'Backbone',
    'Profile.Model',
    'AdoptionSearch.Collection',
    'adoptionsearch_edit.tpl',
    'Utils',
    'jQuery',
    'underscore'
], function AdoptionSearchEditView(
    Backbone,
    ProfileModel,
    AdoptionSearchCollection,
    adoptionSearchEditTpl,
    Utils,
    $,
    _
) {
    'use strict';
    return Backbone.View.extend({
        template: adoptionSearchEditTpl,
        initialize: function initialize(options) {
            this.container = options.container;
            this.model = options.model;
            this.classNmbrList = [];
            this.selectedParameters = [];
            this.environment = options.environment;
            this.showAdoptionItemsErrorMessage = false;
            this.adoptionSearchParams = [
                { Type: 'term', Title: this.environment.getConfig('adoptionsearchTermTitle') },
                { Type: 'department', Title: this.environment.getConfig('adoptionsearchDepartmentTitle') },
                { Type: 'catalogNmbr', Title: this.environment.getConfig('adoptionsearchCatalogNmbrTitle') },
                { Type: 'classNmbr', Title: this.environment.getConfig('adoptionsearchClassNmbrTitle') }
            ];
            if (!this.environment.getConfig('adoptionsearchDisableSchool')) {
                this.adoptionSearchParams.unshift({ Type: 'school', Title: this.environment.getConfig('adoptionsearchSchoolTitle') });
            }
        },
        events: {
            'click button[data-action="search-course-materials"]': 'searchCourseMaterials',
            'change [data-action="select-search-parameter"]': 'selectSearchParameter',
            'click [data-action="remove-classNmbr"]': 'removeClassNmbr'
        },
        beforeShowContent: function beforeShowContent() {
            var allowedCustomerCategories = this.options.environment.getConfig('adoptionsearchAllowedCustomerCategories');
            var promiseProfileModel = ProfileModel.getPromise();
            var showContentPromise = $.Deferred();
            var self = this;
            _.defer(function onDefer() {
                promiseProfileModel.done(function donePromiseGetUserProfile(profile) {
                    if (self.environment.getConfig('adoptionsearchEnabled') === true) {
                        if (allowedCustomerCategories.length > 0) {
                            if (profile.isLoggedIn === 'T') {
                                if (_.find(allowedCustomerCategories, function(user) {
                                    return parseInt(profile.customerCategory, 10) === user.internalid ||
                                        profile.customerCategory === user.category ||
                                        _.find(profile.additionalCategories, function(category) {
                                            return parseInt(category, 10) === user.internalid;
                                        });
                                })) {
                                    self.model.fetch({
                                        data: {
                                            searchAdoptionParameters: true
                                        }
                                    })
                                    .fail(function(err) {
                                        console.log("Here is the error: ", err);
                                        showContentPromise.resolve();
                                    })
                                    .done(function() {
                                        showContentPromise.resolve();
                                    });
                                } else {
                                    showContentPromise.resolve();
                                }
                            } else {
                                showContentPromise.resolve();
                            }
                        } else {
                            self.model.fetch({
                                data: {
                                    searchAdoptionParameters: true
                                }
                            })
                            .fail(function(err) {
                                showContentPromise.resolve();
                            })
                            .done(function() {
                                showContentPromise.resolve();
                            });
                        }
                    } else {
                        showContentPromise.resolve();
                    }
                })
                .fail(function failPromiseGetUserProfile(error) {
                    console.error('Failed to get user profile for Adoption Search: ', error);
                });
            });
            return showContentPromise;
        },
        selectSearchParameter: function selectSearchParameter(e) {
            var self = this;
            // FIXME: change this to self in certain references
            var clearOptions = [];
            if (e.currentTarget.id === 'school') clearOptions = ['term', 'department', 'catalogNmbr', 'classNmbr'];
            else if (e.currentTarget.id === 'term') clearOptions = ['department', 'catalogNmbr', 'classNmbr'];
            else if (e.currentTarget.id === 'department') clearOptions = ['catalogNmbr', 'classNmbr'];
            else if (e.currentTarget.id === 'catalogNmbr') clearOptions = ['classNmbr'];
            else if (e.currentTarget.id === 'classNmbr') {
                this.selectClassNmbr(e.currentTarget.value);
                clearOptions = ['catalogNmbr'];
                $('#department').val('');
            }
            _.each(clearOptions, function eachClearOptions(clearOption) {
                _.each(self.adoptionSearchParams, function eachAdoptionSearchParams(param) {
                    if (param.Type === clearOption) param.Options = null;
                });
                $('#' + clearOption).val('');
                $('#' + clearOption).prop('disabled', true);
            });
            self.selectedParameters = [];
            $('select option:selected').each(function eachSelectedOption() {
                if (this.dataset.type !== 'classNmbr') {
                    self.selectedParameters[this.dataset.type] = {
                        id: this.value,
                        name: this.dataset.name
                    };
                }
            });
            if (e.currentTarget.id === 'classNmbr') {
                this.model.clear();
                this.render();
            } else {
                this.model.fetch({
                    data: {
                        searchAdoptionParameters: true,
                        isAllowed: true,
                        school: self.selectedParameters.school ? self.selectedParameters.school.id : null,
                        term: self.selectedParameters.term ? self.selectedParameters.term.id : null,
                        department: self.selectedParameters.department ? self.selectedParameters.department.id : null,
                        catalogNmbr: self.selectedParameters.catalogNmbr ? self.selectedParameters.catalogNmbr.id : null
                    }
                }).fail(function failModelFetch(err) {
                    console.log("Here is the error: ", err); // eslint-disable-line
                }).done(function doneModelFetch() {
                    self.render();
                });
            }
        },
        selectClassNmbr: function selectClassNmbr(classNmbr) {
            var classNmbrName = _.find(_.find(this.adoptionSearchParams, function findInAdoptionSearchParams(param) {
                return param.Type === 'classNmbr';
            }).Options, function findInOptions(option) {
                return option.id === classNmbr;
            }).name;
            var catalogNmbrName = this.selectedParameters.catalogNmbr.name;
            this.classNmbrList.push({
                id: classNmbr,
                name: catalogNmbrName + ' - ' + classNmbrName
            });
            _.each(this.adoptionSearchParams, function eachAdoptionSearchParams(param) {
                if (param.Type === 'classNmbr' || param.Type === 'catalogNmbr') param.Options = null;
                if (param.Type === 'department' || param.Type === 'catalogNmbr') {
                    _.each(param.Options, function eachParameterOption(option) {
                        if (option.selected) option.selected = null;
                    });
                }
            });
        },
        removeClassNmbr: function removeClassNmbr(e) {
            var self = this;
            var classNmbr = e.currentTarget.attributes[1].nodeValue;
            _.each(this.classNmbrList, function eachClassNumber(value, index) {
                if (value && value.id === classNmbr) self.classNmbrList.splice(index, 1);
            });
            this.render();
        },
        searchCourseMaterials: function searchCourseMaterials() {
            var self = this;
            var ccids = [];
            _.each(this.classNmbrList, function eachClassNumber(classNmbr) {
                ccids.push(classNmbr.id);
            });
            ccids = ccids.join(',');
            this.collectionAdoptionSearch = new AdoptionSearchCollection();
            this.collectionAdoptionSearch.fetch({
                data: {
                    searchAdoptions: true,
                    ccId: ccids
                }
            }).done(function doneCollectionAdoptionSearch(adoptionList) {
                var item = {};
                _.each(adoptionList, function(adoption) {
                    if (_.isEmpty(item) && !_.isEmpty(adoption.items)) {
                        item = adoption.items[0];
                    }
                });
                if (!_.isEmpty(item)) {
                    Backbone.history.navigate('#adoption-search-results?ccid=' + ccids + '&itemid=' + item.itemId, {
                        trigger: true
                    });
                } else {
                    self.showAdoptionItemsErrorMessage = true;
                    self.render();
                }
            }).fail(function failCollectionAdoptionSearch(error) {
                console.log('Adoption Search Collection fetch failed: ', error);
            });
        },
        getContext: function getContext() {
            // @class CampusStores.AdoptionSearchExtension.AdoptionSearch.View.Context
            var self = this;
            _.each(this.adoptionSearchParams, function eachAdoptionSearchParams(param) {
                if (self.model.get('adoptionSearchParam')
                    && param.Type === self.model.get('adoptionSearchParam').Type) param.Options = self.model.get('adoptionSearchParam').Options;
                _.each(param.Options, function eachParameterOption(option) {
                    option.selected = null;
                    _.each(self.classNmbrList, function eachClassNumber(classNmbr) {
                        if (param.Type === 'classNmbr' && option.id === classNmbr.id) option.disabled = 'disabled';
                    });
                    if (self.selectedParameters[param.Type] && self.selectedParameters[param.Type].id === option.id
                        && self.selectedParameters[param.Type].name === option.name) {
                        option.selected = 'selected';
                    }
                });
            });
            return {
                adoptionSearchEnabled: this.environment.getConfig('adoptionsearchEnabled') === true,
                unableToSearchMessage: this.environment.getConfig('adoptionsearchUnableToSearchMessage'),
                title: this.environment.getConfig('adoptionsearchTitle'),
                classNmbrListTitle: this.environment.getConfig('adoptionsearchCourseResultsTitle'),
                classNmbrList: self.classNmbrList,
                adoptionSearchParams: self.adoptionSearchParams,
                nonPermissibleUser: this.environment.getConfig('adoptionsearchAllowedCustomerCategories').length > 0
                    && !this.model.get('adoptionSearchParam') && !this.adoptionSearchParams[0].Options,
                nonPermissibleUserMessage: this.environment.getConfig('adoptionsearchNonPermissibleUserMessage'),
                needsToLogIn: ProfileModel.getInstance().get('isLoggedIn') !== 'T'
                    && this.environment.getConfig('adoptionsearchAllowedCustomerCategories').length > 0,
                showAdoptionItemsErrorMessage: this.showAdoptionItemsErrorMessage,
                noItemsInSelectedAdoptionsMessage: this.environment.getConfig('adoptionsearchNoItemsInSelectedAdoptionsMessage')
            };
        }
    });
});
define('AdoptionSearch.Model', [
    'Backbone',
    'Utils',
    'underscore'
], function AdoptionSearchModel(
    Backbone,
    Utils,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/AdoptionSearch.Service.ss'))
    });
});
define('AdoptionSearch.Product.Model', [
    'Product.Model',
    'Backbone',
    'Utils',
    'underscore'
], function AdoptionSearchProductModel(
    ProductModel,
    Backbone,
    Utils,
    _
) {
    'use strict';
    var ItemCollection = null;
    return _.extend(ProductModel.prototype, {
        getSelectedMatrixChilds: _.wrap(ProductModel.prototype.getSelectedMatrixChilds, function getSelectedMatrixChilds(fn, matrixOptions) {
            var itemMatrixChildren;
            if (Backbone.history.fragment.indexOf('adoption-search-results') === 0) {
                // Make sure the item collection is populated for the Adoption Search PDP on the Adoption Search results page
                ItemCollection = ItemCollection || Utils.requireModules('Item.Collection');
                if (this.get('item').get('_matrixChilds').models && this.get('item').get('_matrixChilds').models.length) {
                    itemMatrixChildren = this.get('item').get('_matrixChilds');
                } else {
                    itemMatrixChildren = new ItemCollection(this.get('item').get('matrixchilditems_detail'));
                }
                // Now resume the original getSelectedMatrixChilds functionality
                // NOTE: We also need to check itemMatrixChildren length as it's a collection of items
                if (!itemMatrixChildren || itemMatrixChildren.length === 0) {
                    return [];
                }
                matrixOptions = matrixOptions || this.getMatrixOptionsSelection();
                var selection_key = JSON.stringify(matrixOptions);
                this.matrixSelectionCache = this.matrixSelectionCache || {};
                // Caches the entry for the item
                if (!this.matrixSelectionCache[selection_key]) {
                    //IF there are option selected THEN get all child items that complies for the current selection ELSE get ALL child items
                    this.matrixSelectionCache[selection_key] = _.values(matrixOptions).length ? itemMatrixChildren.where(matrixOptions) : itemMatrixChildren.models;
                }
                return this.matrixSelectionCache[selection_key];
            } else {
                return fn.apply(this, _.toArray(arguments).slice(1));
            }
        })
    });
});
define('AdoptionSearch.ProductDetails.Base.View', [
    'ProductDetails.Base.View',
    'AdoptionSearch.Collection',
    'Product.Model',
    'Cart.Confirmation.View',
    'AjaxRequestsKiller',
    'jQuery',
    'underscore',
    'AdoptionSearch.Model'
], function AdoptionSearchBaseView(
    ProductDetailsBaseView,
    AdoptionSearchCollection,
    ProductModel,
    CartConfirmationView,
    AjaxRequestsKiller,
    jQuery,
    _,
    AdoptionSearchModel
) {
    'use strict';
    return _.extend(ProductDetailsBaseView.prototype, {
        baseEvents: _.extend(ProductDetailsBaseView.prototype.baseEvents, {
            'click button[data-action="select-adoption"]': 'selectAdoption',
            'click [data-toggle="toggle-booklist"]': 'toggleBooklist',
            'click [data-action="printbooklist"]': 'printBookList'
        }),
        initialize: _.wrap(ProductDetailsBaseView.prototype.initialize, function initialize(fn, options) {
            var self = this;
            fn.apply(self, _.toArray(arguments).slice(1));
            if (Backbone.history.fragment.indexOf('adoption-search-results') === 0) {
                self.isAdoptionRoute = true;
                self.environment = self.application.getComponent('Environment');
                self.userProfile = self.application.getComponent('UserProfile');
                self.profile = {};
                self.cart = self.application.getComponent('Cart');
                self.ccids = self.arguments[0];
                self.productId = self.arguments[1];
                self.adoptionList = [];
                self.selectedAdoption = {};
                self.collectionAdoptionSearch = new AdoptionSearchCollection();
                self.promiseAdoptionSearchCollection = self.collectionAdoptionSearch.fetch({
                    data: {
                        searchAdoptions: true,
                        ccId: self.ccids
                    }
                });
                self.promiseGetCartLines = self.cart.getLines();
                self.promiseGetUserProfile = self.userProfile.getUserProfile();
                self.promiseAdoptionSearchItem = jQuery.Deferred();
                self.promiseAdoptionSearchProductDetails = jQuery.Deferred();
                _.extend(CartConfirmationView.prototype, {
                    initialize:  _.wrap(CartConfirmationView.prototype.initialize, function initialize(fn) {
                        fn.apply(this, _.toArray(arguments).slice(1));
                        if (Backbone.history.fragment.indexOf('adoption-search-results') === 0) {
                            this.on('modal-close', function() {
                                setTimeout(function setTimeout() { 
                                    // If user clicks on View Cart and Checkout button, don't refresh adoption search PDP to avoid any errors. 
                                    if (Backbone.history.fragment.indexOf('adoption-search-results') === 0) {
                                        self.cart.getLines().done(function donePromiseGetCartLines(cartLines) {
                                            self.selectAdoptionItem(cartLines);
                                            self.render();
                                        });
                                    }
                                }, 500);
                            });
                        }
                    })
                });
            }
        }),
        // call the Adoption Search Course Materials PDF Generator suitelet via POST request and pass course IDs (ccIds) as parameter
        printBookList: function()
        {
            // if not every course has an empty items list
            // in other words, disable the Print Course Materials button if there's no adoption results
            if (! _.every(this.adoptionList, function(course) { return course.items === null })) {
                var self = this;
                this.asModel = new AdoptionSearchModel();
                this.asModel.fetch({ data: { getAdoptionBooklistSuiteletUrl: true } }).done(function (result) {
                    console.log("Found Adoption Search Course Materials PDF Suitelet path: " + result.url);
                    var suiteletURL = result.url;
                    var courseIds = self.ccids;
                    self.doPost(suiteletURL, { course_ids: courseIds }); 
                })
                .fail(function getSuiteletUrlFailure(e) {
                    console.error("ERROR: Adoption Booklist Course Materials PDF suitelet not found.  Details: " + JSON.stringify(e));
                });
            }
        },
        // does a POST request to a given path by filling out a form and submitting it with params
        doPost: function(path, params, method) {
            method = method || "post"; // Set method to post by default if not specified.
            var form = document.createElement("form");
            form.setAttribute("method", method);
            form.setAttribute("action", path);
            form.setAttribute("target", "_blank");
    
            for(var key in params) {
                if(params.hasOwnProperty(key)) {
                    var hiddenField = document.createElement("input");
                    hiddenField.setAttribute("type", "hidden");
                    hiddenField.setAttribute("name", key);
                    hiddenField.setAttribute("value", params[key]);
    
                    form.appendChild(hiddenField);
                }
            }
    
            document.body.appendChild(form);
            form.submit();
        },
        getSelectedAdoptionItemInfo: function getSelectedAdoptionItemInfo() {
            return this.promiseAdoptionSearchItem;
        },
        selectAdoption: function selectAdoption(e) {
            var self = this;
            var itemid = e.currentTarget.dataset.itemid;
            _.each(self.adoptionList, function forEachAdoptionList(course) {
                _.each(course.items, function forEachCourseItem(item) {
                    if (item.itemId === itemid) {
                        self.selectedAdoption = item;
                        self.selectedAdoption.title = course.title;
                        item.isSelected = true;
                        self.productId = itemid;
                    } else {
                        item.isSelected = null;
                    }
                });
            });
            Backbone.history.navigate('#adoption-search-results?ccid=' + self.ccids + '&itemid=' + self.productId, { trigger: true });
        },
        toggleBooklist: function (e) {
            e.preventDefault();
            // get e with class "adoptionsearch-mobile-hide"
            var el = this.$el.find('.adoptionsearch-mobile-hide').removeClass('adoptionsearch-mobile-hide').slideDown();
            // if e class is "adoptionsearch-list-selected-course"
            // remove hide class and append hide to buttons
            // else if e is "adoptionsearch-list-selected-course"
            // remove hide class and append hide to selected course
            if (el.hasClass("adoptionsearch-list-selected-course")) {
                this.$el.find('.adoptionsearch-list-select-course-button').addClass('adoptionsearch-mobile-hide');
                this.$el.find('.adoptionsearch-list-course-materials-itemdetails-selected').addClass('adoptionsearch-mobile-hide');
            } else {
                this.$el.find('.adoptionsearch-list-selected-course').addClass('adoptionsearch-mobile-hide');
            }
        },
        beforeShowContent: _.wrap(ProductDetailsBaseView.prototype.beforeShowContent, function initialize(fn) {
            if (this.isAdoptionRoute) {
                var self = this;
                var cartLines = [];
                jQuery
                    .when(
                        self.promiseAdoptionSearchCollection,
                        self.promiseGetCartLines,
                        self.promiseGetUserProfile
                    ).done(function doneBeforeShowContentPromises(
                            resultCollection,
                            resultCartLines,
                            resultProfile
                        ) {
                        self.adoptionList = resultCollection[0];
                        cartLines = resultCartLines;
                        self.profile = resultProfile;
                        self.selectAdoptionItem(cartLines);
                        self.promiseAdoptionSearchItem.resolve(self.selectedAdoption);
                        // Adoption items having Display In Web Store as FALSE also has storeItem value set to FALSE
                        // Do not to fetch details for such item from Item Search API to prevent Page Not Found errors
                        if (self.selectedAdoption.storeItem) {
                            self.productDetails({
                                id: self.productId
                            }).done(function doneProductDetails() {
                                self.promiseAdoptionSearchProductDetails.resolve();
                            });
                        } else {
                            self.promiseAdoptionSearchProductDetails.resolve();
                        }
                    }).fail(function failBeforeShowContentPromises(error) {
                        console.error('Error fetching promise in AdoptionSearch.ProductDetails.Base.View:', error);
                    });
                return self.promiseAdoptionSearchProductDetails;
            } else {
                return fn.apply(this, _.toArray(arguments).slice(1));
            }
        }),
        selectAdoptionItem: function selectAdoptionItem(cartLines) {
            var self = this;
            _.each(self.adoptionList, function forEachAdoptionList(course) {
                _.each(course.items, function forEachCourseItem(item) {
                    item.isBook = item.isBook === 'T' || item.isBook === true ? true : false;
                    _.each(cartLines, function eachLine(line) {
                        if (line.item.extras && line.item.extras.matrix_parent && !_.isEmpty(line.item.extras.matrix_parent)) {
                            if (line.item.extras.matrix_parent.internalid === parseInt(item.itemId, 10)) {
                                item.inCart = true;
                            }  
                        } else if (line.item.internalid === parseInt(item.itemId, 10)) {
                            item.inCart = true;
                        }
                    });
                    if (_.isEmpty(self.selectedAdoption) && item.itemId === self.productId) {
                        self.selectedAdoption = item;
                        self.selectedAdoption.title = course.title;
                        item.isSelected = true;
                    }
                });
            });
        },
        productDetails:  _.wrap(ProductDetailsBaseView.prototype.productDetails, function initialize(fn, api_query, options) {
            if (this.isAdoptionRoute) {
                var self = this;
                var application = this.application;
                var product = this.model;
                var promise = jQuery.Deferred();
                var item = product.get('item');
                item.fetch({
                    data: api_query,
                    killerId: AjaxRequestsKiller.getKillerId(),
                    pageGeneratorPreload: true
                }).then(
                    // Success function
                    function(data, result, jqXhr) {
                        if (!item.isNew()) {
                            // once the item is fully loaded we set its options
                            product.setOptionsFromURL(options);
                            product.set('source', options && options.source);
                            product.set('internalid', options && options.internalid);
                            if (api_query.id && item.get('urlcomponent') && SC.ENVIRONMENT.jsEnvironment === 'server') {
                                nsglobal.statusCode = 301;
                                nsglobal.location = product.generateURL();
                            }
                            if (data.corrections && data.corrections.length > 0) {
                                if (item.get('urlcomponent') && SC.ENVIRONMENT.jsEnvironment === 'server') {
                                    nsglobal.statusCode = 301;
                                    nsglobal.location = data.corrections[0].url + product.getQuery();
                                } else {
                                    Backbone.history.navigate('#' + data.corrections[0].url + product.getQuery(), {
                                        trigger: true
                                    });
                                    promise.reject();
                                }
                            }
                            self.bindModel();
                            promise.resolve();
                        } else if (jqXhr.status >= 500) {
                            application.getLayout().internalError();
                            promise.reject();
                        } else if (jqXhr.responseJSON.errorCode !== 'ERR_USER_SESSION_TIMED_OUT') {
                            // We just show the 404 page
                            application.getLayout().notFound();
                            promise.reject();
                        }
                    },
                    // Error function
                    function(jqXhr) {
                        // this will stop the ErrorManagment module to process this error
                        // as we are taking care of it
                        jqXhr.preventDefault = true;
                        if (jqXhr.status >= 500) {
                            application.getLayout().internalError();
                            promise.reject();
                        } else if (jqXhr.responseJSON.errorCode !== 'ERR_USER_SESSION_TIMED_OUT') {
                            // We just show the 404 page
                            application.getLayout().notFound();
                            promise.reject();
                        }
                    }
                );
                return promise;
            } else {
                return fn.apply(this, _.toArray(arguments).slice(1));
            }
        })
    });
});
define('AdoptionSearch.ProductDetails.Component', [
    'ProductDetails.Component',
    'jQuery',
    'underscore'
], function AdoptionSearchProductDetailsComponent(
    ProductDetailsComponentGenerator,
    jQuery,
    _
) {
    'use strict';
    return _.wrap((ProductDetailsComponentGenerator.ProductDetailsComponent || ProductDetailsComponentGenerator), function AdoptionSearchProductDetailsComponentGenerator(fn, application) {
        var productDetailsComponent = fn.apply(this, _.toArray(arguments).slice(1));
        _.extend(productDetailsComponent, {
            PDP_ADOPTION_SEARCH_VIEW: 'AdoptionSearch.ProductDetails.View',
            _isViewFromComponent: _.wrap(productDetailsComponent._isViewFromComponent, function _isViewFromComponent(fn, view) {
                var isViewFromComponent = fn.apply(this, _.toArray(arguments).slice(1));
                var viewIdentifier = this._getViewIdentifier(view);
                var viewPrototypeId = view && this._getViewIdentifier(view.prototype);
                return isViewFromComponent || viewIdentifier === this.PDP_ADOPTION_SEARCH_VIEW || viewPrototypeId === this.PDP_ADOPTION_SEARCH_VIEW;
            }),
            getSelectedAdoptionItemInfo: function getSelectedAdoptionItemInfo() {
                try {
                    var current_view = this.viewToBeRendered || application.getLayout().getCurrentView();
                    if (this._isViewFromComponent(current_view, true)) {
                        return current_view.getSelectedAdoptionItemInfo();
                    }
                } catch (error) {
                    return jQuery.Deferred().resolve(false);
                }
            }
        });
        return productDetailsComponent;
    });
});
define('AdoptionSearch.ProductDetails.View', [
    'ProductDetails.QuickView.View',
    'Profile.Model',
    'adoptionsearch_productdetails.tpl',
    'underscore'
], function AdoptionSearchProductDetailsFullView(
    ProductDetailsQuickViewView,
    ProfileModel,
    adoptionSearchProductDetailsTpl,
    _
) {
    'use strict';
    return ProductDetailsQuickViewView.extend({
        template: adoptionSearchProductDetailsTpl,
        attributes: {
            'id': 'AdoptionSearch.ProductDetails.View',
            'class': 'view product-detail',
            'data-root-component-id': 'AdoptionSearch.ProductDetails.View'
        },
        
        initialize: _.wrap(ProductDetailsQuickViewView.prototype.initialize, function initialize(fn, options) {
            var self = this;
            fn.apply(self, _.toArray(arguments).slice(1));
            this.model.on('change', function(){
                var colorColumn = self.environment.getConfig('adoptionsearchColorColumn'); // || 'custcol_csgscr_color'
                var colors = _.find(self.model.get('item').get('itemoptions_detail').fields, function (field){
                    return field.internalid == colorColumn // Configuration
                }); 
                var colorsValues = colors && colors.values;
                var selectedColor = self.model.get(colorColumn) && _.find(colorsValues, function(color){
                    return color.internalid == self.model.get(colorColumn); // Configuration
                });
                var selectedColorLabel = selectedColor && selectedColor.label && selectedColor.label;
                var selectedColorLabelLC = selectedColorLabel && selectedColorLabel.toLowerCase(); 
                var imagesDetail = self.model.get('item') && self.model.get('item').get('itemimages_detail');
                if(imagesDetail){
                    var selectedImgUrl = selectedColorLabel ? 
                    (imagesDetail[selectedColorLabel] && imagesDetail[selectedColorLabel]  || 
                        imagesDetail[selectedColorLabelLC] && imagesDetail[selectedColorLabelLC] ): '';
                }
                if(selectedImgUrl && selectedImgUrl.urls){
                    selectedImgUrl = selectedImgUrl.urls[0].url;
                }else{
                    selectedImgUrl = (selectedImgUrl && selectedImgUrl.url) || '';
                }
                if(self.adoptionList && self.adoptionList[0]){
                    var selectedAdoption = _.each(self.adoptionList[0].items, function(item){
                        if(item.isSelected){
                            item.image = selectedImgUrl + '?resizeid=2' ;
                        }
                    });
                }                
                if(selectedImgUrl){
                    self.render();
                }
            });
        }),
        getContext: _.wrap(ProductDetailsQuickViewView.prototype.getContext, function getContext(fn) {
            var originalContext = fn.apply(this, _.toArray(arguments).slice(1));
            var hasAllowedCustomerCategories = !_.isEmpty(this.environment.getConfig('adoptionsearchAllowedCustomerCategories'));
            var isNotLoggedIn = !_.isEmpty(this.profile) && !this.profile.isloggedin;
            _.extend(originalContext, {
                hasCCIDs: this.ccids,
                adoptionSearchEnabled: this.environment.getConfig('adoptionsearchEnabled') === true,
                messageUnableToSearch: this.environment.getConfig('adoptionsearchUnableToSearchMessage'),
                notLoggedIn: isNotLoggedIn && hasAllowedCustomerCategories,
                nonPermissibleUser: hasAllowedCustomerCategories && _.isEmpty(this.adoptionList),
                messageNonPermissibleUser: this.environment.getConfig('adoptionsearchNonPermissibleUserMessage'),
                hasAdoptions: !_.isEmpty(this.adoptionList),
                adoptionList: this.adoptionList,
                imageNotAvailable: _.getAbsoluteUrl(this.environment.getConfig('imageNotAvailable')),
                messageNoAdoptionResults: this.environment.getConfig('adoptionsearchNoAdoptionResultsMessage'),
                selectedAdoption: this.selectedAdoption,
                sku: this.model.getSku()
            });
            return originalContext;
        })
    });
});
/**
 * NOTE: If Adoption Search results page has any item not displayed for the webstore, 
 * SCA stores null as item id in cookie. We need to check and remove null values so that
 * PDP doesn't show internal errors. 
 */
define('RecentlyViewedItems.AdoptionSearch', [
    'underscore',
], function RecentlyViewedItemsAdoptionSearch(
    _
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var pdpComponent = container.getComponent('PDP');
            var self = this;
            var recentlyViewedItemCookie;
            var filteredItemIdsList;
            if (pdpComponent) {
                pdpComponent.on('afterShowContent', function removeInvalidItemIds() {
                    recentlyViewedItemCookie = self.getCookie('recentlyViewedIds');
                    if (recentlyViewedItemCookie && recentlyViewedItemCookie.indexOf('null') !== -1) {
                        filteredItemIdsList = self.getValidItemIds(recentlyViewedItemCookie);
                        if (filteredItemIdsList) {
                            self.setCookie('recentlyViewedIds', filteredItemIdsList);
                        }
                    }
                });
            }
        },
        getValidItemIds: function getValidItemIds(items) {
            var itemIdsList = decodeURIComponent(items);
            
            try {
                itemIdsList = JSON.parse(itemIdsList) || [];
                itemIdsList = _.filter(itemIdsList, function filterEmpty(itemId) {
                    return itemId !== null;
                });
                return itemIdsList.length ? JSON.stringify(itemIdsList) : false;
            } catch (error) {
                console.error('Unbale to parse recentlyViewedIds from the cookie: ' + error);
            }
            return false;
        },
        setCookie: function setCookie(name, value) {
            var expiryTime =  (new Date(new Date() * 1 + 365 * 864e+5)).toUTCString();
            document.cookie = name + '=' + value + '; expires=' + expiryTime + '; path=/';
        },
        getCookie: function getCookie(name) {
            var cookies = (document && document.cookie && document.cookie.split(';')) || [];
            var cookie;
            name = name + '=';
            
            for (var i = 0; i < cookies.length; i++) {
                cookie = cookies[i];
                while (cookie.charAt(0) === ' ') {
                    cookie = cookie.substring(1);
                }
                if (cookie.indexOf(name) === 0) {
                    return cookie.substring(name.length,cookie.length);
                }
            }
            return false;
        }
    }
});
define('CampusStores.AdoptionSearch.Shopping', [
    'AdoptionSearch.Product.Model',
    'AdoptionSearch.Edit.View',
    'AdoptionSearch.Model',
    'AdoptionSearch.ProductDetails.Base.View',
    'AdoptionSearch.ProductDetails.Component',
    'AdoptionSearch.ProductDetails.View',
    'Cart.Lines.View',
    'Cart.Lines.Free.View',
    'Facets.ItemCell.View',
    'Location',
    'PickupInStore.View',
    'PickupInStore.FulfillmentOptions.View',
    'ProductLine.Common.Url',
    'ProductLine.Stock.View',
    'jQuery',
    'Utils',
    'js.cookie',
    'RecentlyViewedItems.AdoptionSearch'
], function CampusStoresAdoptionSearchExtensionAdoptionSearch(
    AdoptionSearchProductModel,
    AdoptionSearchEditView,
    AdoptionSearchModel,
    AdoptionSearchProductDetailsBaseView,
    AdoptionSearchProductDetailsComponent,
    AdoptionSearchProductDetailsView,
    CartLinesView,
    CartLinesFreeView,
    FacetsItemCellView,
    Location,
    PickupInStoreView,
    PickupInStoreFulfillmentOptionsView,
    ProductLineCommonUrl,
    ProductLineStockView,
    jQuery,
    Utils,
    Cookies,
    RecentlyViewedItemsAdoptions
) {
    'use strict';
    return {
        /* eslint-disable */
        mountToApp: function mountToApp(container) {
            container.registerComponent(this.componentGenerator(container));
            this.setupPickupInStore(container);
            RecentlyViewedItemsAdoptions.mountToApp(container);
        },
        /* eslint-enable */
        componentGenerator: function(container) {
            var pageType = container.getComponent('PageType');
            try {
                pageType.registerPageType({
                    'name': 'AdoptionSearch.Edit.View',
                    'routes': [
                        'adoption-search'
                    ],
                    options: {
                        container: container,
                        environment: container.getComponent('Environment'),
                        model: new AdoptionSearchModel()
                    },
                    'defaultTemplate': {
                        'name': 'adoptionsearch_edit.tpl',
                        'displayName': 'Adoption Search',
                        'thumbnail': Utils.getAbsoluteUrl('img/default-layout-PDP.png')
                    },
                    'view': AdoptionSearchEditView
                });
            } catch (editPageError) {
                console.error('Failed to register route for adoption-search page in CampusStores.AdoptionSearch.Shopping: ' + editPageError);
            }
            try {
                pageType.registerPageType({
                    'name': 'AdoptionSearch.ProductDetails.View',
                    'routes': ['adoption-search-results?ccid=:ccid&itemid=:itemid'],
                    'view': AdoptionSearchProductDetailsView,
                    'defaultTemplate': {
                        'name': 'adoptionsearch_productdetails.tpl',
                        'displayName': 'Product Details Full Default',
                        'thumbnail': Utils.getAbsoluteUrl('img/default-layout-PDP.png')
                    }
                });
            } catch (resultsPageError) {
                console.error('Failed to register route for adoption-search-results page in CampusStores.AdoptionSearch.Shopping: ' + resultsPageError);
            }
            return AdoptionSearchProductDetailsComponent(container);
        },
        setupPickupInStore: function setupPickupInStore(application) {
            var environment = application.getComponent('Environment');
            if (!environment.getConfig('siteSettings.isPickupInStoreEnabled')) {
                return;
            }
            ProductLineCommonUrl.attributesReflectedInURL.push('location');
            ProductLineCommonUrl.attributesReflectedInURL.push('fulfillmentChoice');
            // Set the extra children of the AdoptionSearchProductDetailsView
            // We show the pickup in store view only if the item is purchasable.
            // If it is not, we show the Out of Stock message.
            AdoptionSearchProductDetailsView.addChildViews({
                'Product.Stock.Info': function wrapperFunction(options) {
                    return function() {
                        if (options.model.getItem().get('ispurchasable')) {
                            return new PickupInStoreView({
                                model: options.model,
                                application: application
                            });
                        } else {
                            return new ProductLineStockView({
                                model: options.model
                            });
                        }
                    };
                }
            });
            //Set the extra children of the CartLinesView
            CartLinesView.addChildViews({
                'Product.Stock.Info': function wrapperFunction(options) {
                    return function() {
                        return new PickupInStoreView({
                            model: options.model,
                            application: application,
                            source: 'cart'
                        });
                    };
                }
            });
            //Set the extra children of the CartLinesView
            CartLinesFreeView.addChildViews({
                'Product.Stock.Info': function wrapperFunction(options) {
                    return function() {
                        return new PickupInStoreView({
                            model: options.model,
                            application: application,
                            source: 'cart'
                        });
                    };
                }
            });
            //Set the extra children of the FacetsItemCellView
            FacetsItemCellView.addChildViews({
                'ItemViews.Stock': function wrapperFunction(options) {
                    return function() {
                        if (options.model.get('ispurchasable') && options.model.get('_isfulfillable')) {
                            return new PickupInStoreFulfillmentOptionsView({
                                model: options.model,
                                application: application
                            });
                        } else {
                            return new ProductLineStockView({
                                model: options.model
                            });
                        }
                    };
                }
            });
            application.getLayout().on('beforeAppendView', function(view) {
                if (view instanceof AdoptionSearchProductDetailsView) {
                    var location_id = view.model.get('location').get('internalid') || Cookies.get('myStore');
                    if (location_id) {
                        Location.fetchLocations(location_id).done(function() {
                            view.model.set('location', Location.get(location_id));
                        });
                    }
                }
            });
        }
    };
});
};
extensions['CampusStores.BuybackExtension.1.2.0'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/BuybackExtension/1.2.0/' + asset;
};
define('Buyback.AddedISBNs.View', [
    'buyback_added_isbns.tpl',
    'Backbone'
],
function BuybackAddISBNView(
    buyback_added_isbns_template,
    Backbone
) {
    'use strict';
    return Backbone.View.extend({
        template: buyback_added_isbns_template,
        initialize: function initialize(options) {
            //console.log('inside initialize of Added ISBNs view', options.addedISBNs);
            this.addedISBNs = options.addedISBNs;
            //this.collection = options.collection;
            //console.log('collection: ', this.collection);
            //OLD collection watcher
            // this.collection._events.on('add remove update reset sort change destroy sync', function renderOnChange() {
            //     //console.log('inside of renderOnChange function');
            //     this.render();
            // }, this);
            //NEW collection watcher
            this.collection.on('add remove update reset sort change destroy sync', function renderOnChange() {
                //console.log('inside of renderOnChange function isbns');
                this.render();
            }, this);
            //this.render();
        },
        getContext: function getContext() {
            //console.log('inside getContext of Added ISBNs view ', this.addedISBNs);
            return {
                isbn: this.addedISBNs
            };
        }
    });
});
define('Buyback.Collection', [
    'Buyback.Model',
    'Backbone',
    'underscore'
], function BuybackCollection(
    BuybackModel,
    Backbone,
    _) {
    'use strict';
    return Backbone.Collection.extend({
        model: BuybackModel,
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/Buyback.Service.ss'))
    });
});
define('Buyback.Detail.View', [
    'buyback_detail.tpl',
    'Backbone',
    'Utils'
], function BuybackDetailView(
    Template,
    Backbone
) {
    'use strict';
    return Backbone.View.extend({
        template: Template,
        initialize: function initialize(options) {
            this.model = options.model;
        },
        getContext: function getContext() {
            return {
                title: this.model.get('title'),
                author: this.model.get('author'),
                isbn: this.model.get('ISBN'),
                amountDueCustomer: this.model.get('amountDueCustomer'),
                condition: this.model.get('condition'),
                noISBN: !this.model.get('ISBN')
            };
        }
    });
});
define('Buyback.List.View', [
    'buyback_list.tpl',
    'Buyback.Detail.View',
    'Backbone.CollectionView',
    'Backbone.CompositeView',
    'Backbone',
    'underscore',
    'Utils'
], function BuybackListView(
    Template,
    BuybackDetailView,
    BackboneCollectionView,
    BackboneCompositeView,
    Backbone,
    _
) {
    'use strict';
    return Backbone.View.extend({
        template: Template,
        initialize: function initialize(options) {
            this.application = options.application;
            this.collection = options.collection;
            this.addedISBNs = options.addedISBNs;        
            this.collection.on('add remove update reset sort change destroy sync', function renderOnChange() {
                //console.log('inside of renderOnChange function list');
                this.render();
            }, this);
            BackboneCompositeView.add(this);
        },
        // cleanCollection: function cleanCollection() {
        //     this.collection.remove(this.collection.where({
        //         accepted: 'F'
        //     }));
        // },
        // returns array of ISBN without buyback price in order to notify user
        noPriceISBN: function noPriceISBN() {
            // put only the model objects into an variable:
            var models = this.collection.models;
            var validISBNs = [];
            var noPrice = [];
            _.each(models, function makeArrayISBNs(m) {
                //console.log('attributes: ', m.attributes);
                //console.log('trying isbn: ', m.attributes.ISBN);
                //added '&& m.attributes.ISBN !== undefined' to if statement; models are combined now, so model data now includes terms and schools, so ISBN can be null and undefined
                if (m.attributes.ISBN !== null && m.attributes.ISBN !== undefined) {
                    validISBNs.push(m.attributes.ISBN);
                }
            });
            // Find out non-valid isbns
            noPrice = _.difference(this.addedISBNs, validISBNs);
            return noPrice;
        },
        childViews: {
            'Buyback.Details': function BuybackDetails() {
                return new BackboneCollectionView({
                    childView: BuybackDetailView,
                    viewsPerRow: 1,
                    collection: this.collection
                });
            }
        },
        getContext: function getContext() {
            var noPrice = this.noPriceISBN();
            //console.log('noPrice: ', noPrice);
            return {
                isEmpty: this.collection.length === 0,
                noPrice: noPrice
            };
        }
    });
});
define('Buyback.Model', [
    'Backbone',
    'underscore',
    'Utils'
], function BuybackModel(
    Backbone,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/Buyback.Service.ss')),
        //TODO uncomment validation when ready
        validation: {
            school: {
                required: true,
                msg: 'Please select a school.'
            },
            term: {
                required: true,
                msg: 'Please select a term.'
            },
            isbns: {
                required: true,
                msg: 'Please add ISBNs to the list so we can search for prices.'
            }
        }
        
    });
});
define('Buyback.Router', [
    'Buyback.View',
    'Buyback.Model',
    'Backbone'
], function BuybackRouter(
    BuybackView,
    BuybackModel,
    Backbone
) {
    'use strict';
    return Backbone.Router.extend({
        initialize: function initialize(container) {
            this.application = container;
            this.layout = container.getComponent('Layout');
            this.environment = container.getComponent('Environment');
        },
        routes: {
            'buyback': 'buyback'
        },
        buyback: function buyback() {
            var self = this;
            var buybackModel = new BuybackModel();
            var view = new BuybackView({
                application: this.application,                
                environment: this.environment,
                layout: this.layout,
                model: buybackModel
            });
            //console.log('Here is the model: ', self.model);
            buybackModel.fetch()
            .fail(function(err) {console.log("Here is the error: ", err);})
            .done(function () { self.layout.showContent(view, {})
            //view.showContent();
            });
            //console.log('showContent executed');
        }
    });
});
// @module CampusStores.BuybackExtension.Buyback
define('Buyback.View', [
    'buyback.tpl',
    'Buyback.AddedISBNs.View',
    'Buyback.List.View',
    'Buyback.Collection',
    'Backbone.CompositeView',
    'Backbone.FormView',
    'Backbone',
    'SC.Configuration',
    'jQuery',
    'underscore'
], function BuybackEntryView(
    buybackTemplate,
    BuyBackAddedISBNsView,
    BuybackListView,
    BuybackCollection,
    BackboneCompositeView,
    BackboneFormView,
    Backbone,
    Configuration,
    jQuery,
    _
) {
    'use strict';
    return Backbone.View.extend({
        template: buybackTemplate,
        
        //TODO: do we need to add field filtering like in adoption search? currently not the case for buyback.        //just returns all terms and all schools. term field is not filtered by school. all schools available are returned as well
        initialize: function initialize(options) {
            var self = this;
            this.application = options.application;
            this.model = options.model;
            this.collection = new BuybackCollection();
            this.isbnArray = [];
            BackboneCompositeView.add(this);
            BackboneFormView.add(this);
            this.model.on('save', function modelOnSave(data) {
                self.collection.add(self.modelToArray(data));
			});
			//this.render();
        },
        modelToArray: function modelToArray(data) {
            // The model's attributes are a combination of the payload from the POST request and the objects from the POST request's response
            // Most of the info is unnecessary so we're cleaning it up, turning the desired attributes to an array.
            // That array gets added to the collection
            //console.log('model to Array fn', data);
            data.unset('buyback_add_isbn');
            data.unset('isbns');
            data.unset('requestUrl');
            data.unset('school');
            data.unset('term');
            return _.values(data.attributes);
        },
        bindings: {
            '[name="school"]': 'school',
            '[name="term"]': 'term',
            '[name="isbns"]': 'isbns'
        },
        events: {
            'click [data-action="buyback_add_isbn"]': 'addISBN',
            'click [data-action="buyback_submit"]': 'saveForm',
            'click [data-action="buyback_clear_isbn_list"]': 'clearISBNList'
        },
        childViews: {
            'Buyback.AddedISBNs': function BuybackAddedISBNs() {
                var addedISBNs = this.isbnArray;
                return new BuyBackAddedISBNsView({
                    addedISBNs: addedISBNs,
                    collection: this.collection
                });
            },
            'Buyback.List': function BuybackList() {
                var addedISBNs = this.isbnArray;
                return new BuybackListView({
                    application: this.application,
                    collection: this.collection,
                    addedISBNs: addedISBNs
                });
            }
        },
        addISBN: function addISBN(e) {
            // Grab ISBN from input and remove dashes and spaces:
			//console.log('add ISBN function');
            var list;
            var isbn = jQuery('#buyback_add_isbn').val().replace(/-*\s*/g, '');
            e.preventDefault();
            //console.log('adding isbn: ', isbn);
            // if it's 13 digits long, add it to the array:
            if (this.validateISBN(isbn)) {
                this.hideError();
                if (!_.contains(this.isbnArray, isbn)) {
                    //console.log('not in array yet, adding: ', isbn);
                    this.isbnArray.push(isbn);
                    //console.log('array is now: ', this.isbnArray);
                }
                list = this.isbnArray.join(',');
                //console.log('list? ', list);
                // clear the input:
                document.querySelector('#buyback_add_isbn').value = '';
                // add that string to the hidden field:
                document.querySelector('#isbns').value = list;
                //console.log('#isbns test: ', document.querySelector('#isbns').value);
				// make that childView render the list
                //console.log('child view instances: ', this.getChildViewInstance('Buyback.AddedISBNs'));
                this.getChildViewInstance('Buyback.AddedISBNs').render();
                //console.log('after render');
            } else {
                this.showError(_('Please enter a 13-digit ISBN').translate());
            }
        },
        validateISBN: function validateISBN(isbn) {
			// match for 13 digits in length
			//console.log('validate ISBN function');
            return !!(isbn.match(/^\d{13}$/));
        },
        // Submits the ISBN list (collection fetch) when model.save from initialize
        // buybackSubmit: function buybackSubmit() {
        //   //TODO: don't think this function gets called anymore, might remove
		// 	 //console.log('Buyback Submit function');
        //     var list = this.model.get('isbns');
        //     var term = this.model.get('term');
		// 	var school = this.model.get('school');
            
        //     return this.collection.save({
        //         data: {
        //             isbns: list,
        //             term: term,
        //             school: school
        //         }
        //     });
        // },
        // Clear the ISBN list (front-end) so user can start fresh
        clearISBNList: function clearISBNList(e) {
            var self = this;
            
            e.preventDefault();
            document.querySelector('#isbns').value = '';
            document.querySelector('#buyback_add_isbn').value = '';
            
            self.isbnArray = [];
            self.collection.reset();
            // Remove already added ISBN offers from model to prevent duplicate entry in collection
            self.model.attributes = _.each(self.model.attributes, function removeAddedISBN(attribute, key) {
                if (_.has(attribute,'ISBN')) {
                    self.model.unset(key);
                }
            });
            self.render();
            CMS.trigger('adapter:page:changed');
        },
        getContext: function getContext() {
            //console.log('Enter getContext function');
            //console.log('getting touchpoint: ', Configuration.get('siteSettings').touchpoints.home)
            return {
				isEmpty: this.collection.length === 0,
                isbn: this.isbnArray,
                schools: this.model.get('schools'),
                terms: this.model.get('terms'),
                requestUrl: Configuration.get('siteSettings').touchpoints.home
            };
        }
    });
});
define('CampusStores.BuybackExtension.Buyback', [
	'Buyback.Router'
],   function (BuybackRouter) {
	'use strict';
	return  {
		mountToApp: function mountToApp (container)	{
			return new BuybackRouter(container);	
		}
	};
});
};
extensions['NetSuite.Columns.1.1.0'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/NetSuite/Columns/1.1.0/' + asset;
};
/// <amd-module name="SuiteCommerce.Columns.Column.Collection"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Columns.Column.Collection", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ColumnCollection = /** @class */ (function (_super) {
        __extends(ColumnCollection, _super);
        function ColumnCollection() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ColumnCollection;
    }(Backbone_1.Collection));
    exports.ColumnCollection = ColumnCollection;
});
/// <amd-module name="SuiteCommerce.Columns.Column.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Columns.Column.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ColumnModel = /** @class */ (function (_super) {
        __extends(ColumnModel, _super);
        function ColumnModel(option) {
            return _super.call(this, option) || this;
        }
        Object.defineProperty(ColumnModel.prototype, "image", {
            get: function () {
                return this.get('image');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "imageAlt", {
            get: function () {
                return this.get('imageAlt');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "imageResizeId", {
            get: function () {
                return this.get('imageResizeId') || '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "caption", {
            get: function () {
                return this.get('caption');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "text", {
            get: function () {
                return this.get('text');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "buttonText", {
            get: function () {
                return this.get('buttonText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "buttonLink", {
            get: function () {
                return this.get('buttonLink');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "target", {
            get: function () {
                var option = this.get('openInNewTab');
                return option && option === 'T' ? '_blank' : '_self';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "hasText", {
            get: function () {
                var HTMLTagsRegex = /<[^>]+>/gi;
                return this.text ? !!this.text.replace(HTMLTagsRegex, '') : false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "hasButton", {
            get: function () {
                return !!this.buttonText;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ColumnModel.prototype, "hasContent", {
            get: function () {
                return !!this.image || this.hasText;
            },
            enumerable: true,
            configurable: true
        });
        return ColumnModel;
    }(Backbone_1.Model));
    exports.ColumnModel = ColumnModel;
});
/// <amd-module name="SuiteCommerce.Columns.Column.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Columns.Column.View", ["require", "exports", "Backbone", "sc_columns_column.tpl", "SuiteCommerce.Columns.Instrumentation"], function (require, exports, Backbone_1, columnTemplate, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ColumnView = /** @class */ (function (_super) {
        __extends(ColumnView, _super);
        function ColumnView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = columnTemplate;
            _this.events = {
                'click [data-action="navigate-to-url"]': 'navigateToUrl',
            };
            _this.model = options.model;
            return _this;
        }
        ColumnView.prototype.navigateToUrl = function () {
            var buttonUsageLog = Instrumentation_1.default.getLog('buttonUsageLog' + new Date().getTime());
            buttonUsageLog.setParameter('activity', 'Usage of the button in column');
            buttonUsageLog.submit();
        };
        ColumnView.prototype.getContext = function () {
            return {
                image: this.model.image,
                hasImage: !!this.model.image,
                imageResizeId: this.model.imageResizeId,
                buttonLink: this.model.buttonLink,
                buttonText: this.model.buttonText,
                hasButton: this.model.hasButton,
                hasText: this.model.hasText,
                alt: this.model.imageAlt,
                title: this.model.imageAlt,
                caption: this.model.caption,
                text: this.model.text,
                isCaptionPadding: !!this.model.caption && !!this.model.image,
                isTextPadding: this.model.hasText && (!!this.model.image || !!this.model.caption),
                target: this.model.target,
            };
        };
        return ColumnView;
    }(Backbone_1.View));
    exports.ColumnView = ColumnView;
});
/// <amd-module name="SuiteCommerce.Columns.ColumnsCCT.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Columns.ColumnsCCT.Model", ["require", "exports", "Backbone", "jQuery", "SuiteCommerce.Columns.Column.Collection", "SuiteCommerce.Columns.Column.Model"], function (require, exports, Backbone_1, jQuery, Column_Collection_1, Column_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CCTFields;
    (function (CCTFields) {
        CCTFields["header"] = "custrecord_cct_ns_cols_header";
        CCTFields["textColor"] = "custrecord_cct_ns_cols_color";
        CCTFields["textAlign"] = "custrecord_cct_ns_cols_textalign";
        CCTFields["fullWidth"] = "custrecord_cct_ns_cols_fullwidth";
        CCTFields["openInNewTab"] = "custrecord_cct_ns_cols_newtab";
        CCTFields["imageResizeId"] = "custrecord_cct_ns_cols_image_resize_id";
        CCTFields["col1Image"] = "custrecord_cct_ns_cols_1_image";
        CCTFields["col1ImageAlt"] = "custrecord_cct_ns_cols_1_alt";
        CCTFields["col1Caption"] = "custrecord_cct_ns_cols_1_caption";
        CCTFields["col1Text"] = "custrecord_cct_ns_cols_1_text";
        CCTFields["col1ButtonText"] = "custrecord_cct_ns_cols_1_buttontext";
        CCTFields["col1ButtonLink"] = "custrecord_cct_ns_cols_1_buttonlink";
        CCTFields["col2Image"] = "custrecord_cct_ns_cols_2_image";
        CCTFields["col2ImageAlt"] = "custrecord_cct_ns_cols_2_alt";
        CCTFields["col2Caption"] = "custrecord_cct_ns_cols_2_caption";
        CCTFields["col2Text"] = "custrecord_cct_ns_cols_2_text";
        CCTFields["col2ButtonText"] = "custrecord_cct_ns_cols_2_buttontext";
        CCTFields["col2ButtonLink"] = "custrecord_cct_ns_cols_2_buttonlink";
        CCTFields["col3Image"] = "custrecord_cct_ns_cols_3_image";
        CCTFields["col3ImageAlt"] = "custrecord_cct_ns_cols_3_alt";
        CCTFields["col3Caption"] = "custrecord_cct_ns_cols_3_caption";
        CCTFields["col3Text"] = "custrecord_cct_ns_cols_3_text";
        CCTFields["col3ButtonText"] = "custrecord_cct_ns_cols_3_buttontext";
        CCTFields["col3ButtonLink"] = "custrecord_cct_ns_cols_3_buttonlink";
    })(CCTFields = exports.CCTFields || (exports.CCTFields = {}));
    var CCTModel = /** @class */ (function (_super) {
        __extends(CCTModel, _super);
        function CCTModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(CCTModel.prototype, "header", {
            get: function () {
                return this.getSetting(CCTFields.header);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "textColor", {
            get: function () {
                return this.getSetting(CCTFields.textColor);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "textAlign", {
            get: function () {
                return this.getSetting(CCTFields.textAlign);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "fullWidth", {
            get: function () {
                return this.getSetting(CCTFields.fullWidth);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "isExtraPadding", {
            get: function () {
                return this.fullWidth !== 'T';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "openInNewTab", {
            get: function () {
                return this.getSetting(CCTFields.openInNewTab);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "columns", {
            get: function () {
                if (!this.get('columns')) {
                    this.columns = new Column_Collection_1.ColumnCollection();
                }
                return this.get('columns');
            },
            set: function (columns) {
                this.set('columns', columns);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "hasContent", {
            get: function () {
                return !this.header && this.columns.size() === 0;
            },
            enumerable: true,
            configurable: true
        });
        CCTModel.prototype.addProperties = function (properties) {
            this.set(properties);
            this.updateColumnsContent();
        };
        CCTModel.prototype.updateColumnsContent = function () {
            var columns = [this.column1, this.column2, this.column3];
            columns = columns.filter(function (column) {
                return column.hasContent;
            });
            this.columns.reset(columns);
        };
        Object.defineProperty(CCTModel.prototype, "column1", {
            get: function () {
                return new Column_Model_1.ColumnModel({
                    buttonLink: this.getSetting(CCTFields.col1ButtonLink),
                    buttonText: this.getSetting(CCTFields.col1ButtonText),
                    caption: this.getSetting(CCTFields.col1Caption),
                    image: this.getImageUrl(CCTFields.col1Image),
                    imageAlt: this.getSetting(CCTFields.col1ImageAlt),
                    imageResizeId: this.getSetting(CCTFields.imageResizeId),
                    text: this.getSetting(CCTFields.col1Text),
                    openInNewTab: this.openInNewTab,
                });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "column2", {
            get: function () {
                return new Column_Model_1.ColumnModel({
                    buttonLink: this.getSetting(CCTFields.col2ButtonLink),
                    buttonText: this.getSetting(CCTFields.col2ButtonText),
                    caption: this.getSetting(CCTFields.col2Caption),
                    image: this.getImageUrl(CCTFields.col2Image),
                    imageAlt: this.getSetting(CCTFields.col2ImageAlt),
                    imageResizeId: this.getSetting(CCTFields.imageResizeId),
                    text: this.getSetting(CCTFields.col2Text),
                    openInNewTab: this.openInNewTab,
                });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CCTModel.prototype, "column3", {
            get: function () {
                return new Column_Model_1.ColumnModel({
                    buttonLink: this.getSetting(CCTFields.col3ButtonLink),
                    buttonText: this.getSetting(CCTFields.col3ButtonText),
                    caption: this.getSetting(CCTFields.col3Caption),
                    image: this.getImageUrl(CCTFields.col3Image),
                    imageAlt: this.getSetting(CCTFields.col3ImageAlt),
                    imageResizeId: this.getSetting(CCTFields.imageResizeId),
                    text: this.getSetting(CCTFields.col3Text),
                    openInNewTab: this.openInNewTab,
                });
            },
            enumerable: true,
            configurable: true
        });
        CCTModel.prototype.getImageUrl = function (field) {
            var imageId = this.getSetting(field);
            return imageId &&
                this.get(field + "_url") &&
                this.get(field + "_url").indexOf(imageId) !== -1
                ? this.get(field + "_url")
                : '';
        };
        CCTModel.prototype.getSetting = function (field) {
            return jQuery.trim(this.get(field));
        };
        return CCTModel;
    }(Backbone_1.Model));
    exports.CCTModel = CCTModel;
});
/// <amd-module name="SuiteCommerce.Columns.ColumnsCCT.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Columns.ColumnsCCT.View", ["require", "exports", "Backbone.CollectionView", "CustomContentType.Base.View", "SuiteCommerce.Columns.ColumnsCCT.Model", "sc_columns_cct.tpl", "SuiteCommerce.Columns.ColumnsCCT.Configuration", "SuiteCommerce.Columns.Column.View", "SuiteCommerce.Columns.Instrumentation"], function (require, exports, BackboneCollectionView, CustomContentTypeBaseView, ColumnsCCT_Model_1, columnsCCTTemplate, ColumsCCT_Configuration_1, Column_View_1, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CCTView = /** @class */ (function (_super) {
        __extends(CCTView, _super);
        function CCTView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = columnsCCTTemplate;
            _this.container = options.container;
            _this.model = new ColumnsCCT_Model_1.CCTModel();
            _this.columnsView = new BackboneCollectionView({
                childView: Column_View_1.ColumnView,
                collection: _this.model.columns,
            });
            _this.setupListeners();
            return _this;
        }
        CCTView.prototype.setupListeners = function () {
            var _this = this;
            this.model.columns.on('reset', function () { return _this.columnsView.render(); });
        };
        CCTView.prototype.install = function (settings, contextData) {
            _super.prototype.install.call(this, settings, contextData);
            this.parseSettings(settings);
            if (this.model.columns.size() > 0) {
                this.logQuantityOfColumns();
            }
            return jQuery.Deferred().resolve();
        };
        CCTView.prototype.logQuantityOfColumns = function () {
            var quantityOfColumnsLog = Instrumentation_1.default.getLog('quantityOfColumnsLog');
            quantityOfColumnsLog.setParameters({
                activity: 'Quantity of Columns used',
                instanceCount: this.model.columns.size(),
            });
            quantityOfColumnsLog.submit();
        };
        CCTView.prototype.update = function (settings) {
            _super.prototype.update.call(this, settings);
            this.parseSettings(settings);
            return jQuery.Deferred().resolve();
        };
        CCTView.prototype.parseSettings = function (settings) {
            this.model.addProperties(settings);
        };
        CCTView.prototype.validateContextDataRequest = function () {
            return true;
        };
        Object.defineProperty(CCTView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    'NetSuite.ColumnsCCT.Column.View': function () {
                        return _this.columnsView;
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        CCTView.prototype.getContext = function () {
            return {
                header: this.model.header,
                isEmpty: this.model.hasContent,
                textColorClass: ColumsCCT_Configuration_1.CCTConfiguration.getTextColorClass(this.model.textColor),
                textAlignClass: ColumsCCT_Configuration_1.CCTConfiguration.getTextAlignClass(this.model.textAlign),
                isExtraPadding: this.model.isExtraPadding,
                gridClass: "grid-" + this.model.columns.size(),
                gridPhoneClass: "grid-xs-" + this.model.columns.size(),
            };
        };
        return CCTView;
    }(CustomContentTypeBaseView));
    exports.CCTView = CCTView;
});
/// <amd-module name="SuiteCommerce.Columns.ColumnsCCT"/>
define("SuiteCommerce.Columns.ColumnsCCT", ["require", "exports", "SuiteCommerce.Columns.ColumnsCCT.View"], function (require, exports, ColumnsCCT_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var cmsComponent = container.getComponent('CMS');
            if (cmsComponent) {
                cmsComponent.registerCustomContentType({
                    id: 'cct_netsuite_columns',
                    view: ColumnsCCT_View_1.CCTView,
                    options: {
                        container: container,
                    },
                });
            }
        },
    };
});
/// <amd-module name="SuiteCommerce.Columns.ColumnsCCT.Configuration"/>
define("SuiteCommerce.Columns.ColumnsCCT.Configuration", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TEXT_COLOR_CLASS = {
        1: '',
        2: 'columnscct-text-color-dark',
        3: 'columnscct-text-color-light',
    };
    var TEXT_ALIGN_CLASS = {
        1: 'columnscct-text-align-left',
        2: 'columnscct-text-align-center',
    };
    var CCTConfiguration = /** @class */ (function () {
        function CCTConfiguration() {
        }
        CCTConfiguration.getTextColorClass = function (option) {
            return TEXT_COLOR_CLASS[option] || '';
        };
        CCTConfiguration.getTextAlignClass = function (option) {
            return TEXT_ALIGN_CLASS[option] || TEXT_ALIGN_CLASS[1]; //default value is 1
        };
        return CCTConfiguration;
    }());
    exports.CCTConfiguration = CCTConfiguration;
});
/// <amd-module name="SuiteCommerce.Columns.Common.InstrumentationHelper"/>
define("SuiteCommerce.Columns.Common.InstrumentationHelper", ["require", "exports", "SuiteCommerce.Columns.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueueNameSuffix = '-Columns';
    var ExtensionVersion = '1.1.0';
    var ComponentArea = 'SC Columns';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (environment) {
            Instrumentation_1.default.initialize({
                environment: environment,
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                },
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.Columns.Instrumentation.FallbackLogger"/>
define("SuiteCommerce.Columns.Instrumentation.FallbackLogger", ["require", "exports", "jQuery", "Url"], function (require, exports, jQuery, Url) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var queueErrorTemp = [];
    var queueInfoTemp = [];
    var FallbackLogger = /** @class */ (function () {
        function FallbackLogger(options) {
            var _this = this;
            this.options = options;
            if (!this.isEnabled()) {
                return;
            }
            this.isWaiting = false;
            setInterval(function () {
                _this.processQueues(true);
            }, 60000);
            window.addEventListener('beforeunload', function () {
                _this.processQueues(false);
            });
        }
        Object.defineProperty(FallbackLogger.prototype, "environment", {
            get: function () {
                if (this.options.environment) {
                    return this.options.environment;
                }
                console.error('Please initialize instrumentation with the Environment Component.');
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FallbackLogger.prototype, "queueErrorName", {
            get: function () {
                return "queueError" + this.options.queueNameSuffix;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FallbackLogger.prototype, "queueInfoName", {
            get: function () {
                return "queueInfo" + this.options.queueNameSuffix;
            },
            enumerable: true,
            configurable: true
        });
        FallbackLogger.prototype.info = function (obj) {
            if (!this.isEnabled()) {
                return;
            }
            var objWrapper = obj;
            objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
            objWrapper.message = "clientSideLogDateTime: " + new Date().toISOString();
            if (this.isWaiting) {
                queueInfoTemp.push(objWrapper);
            }
            else {
                var queueInfo = JSON.parse(localStorage.getItem(this.queueInfoName)) || [];
                queueInfo.push(objWrapper);
                localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfo));
            }
        };
        FallbackLogger.prototype.error = function (obj) {
            if (!this.isEnabled()) {
                return;
            }
            var objWrapper = obj;
            objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
            objWrapper.message = "clientSideLogDateTime: " + new Date().toISOString();
            if (this.isWaiting) {
                queueErrorTemp.push(objWrapper);
            }
            else {
                var queueError = JSON.parse(localStorage.getItem(this.queueErrorName)) || [];
                queueError.push(objWrapper);
                localStorage.setItem(this.queueErrorName, JSON.stringify(queueError));
            }
        };
        FallbackLogger.prototype.processQueues = function (isAsync) {
            if (!this.isEnabled()) {
                return;
            }
            var parsedURL = new Url().parse(SC.ENVIRONMENT.baseUrl);
            var product = SC.ENVIRONMENT.BuildTimeInf.product;
            var url = parsedURL.schema + "://" + parsedURL.netLoc + "/app/site/hosting/scriptlet.nl" +
                ("?script=customscript_" + product.toLowerCase() + "_loggerendpoint") +
                ("&deploy=customdeploy_" + product.toLowerCase() + "_loggerendpoint");
            var queueError = JSON.parse(localStorage.getItem(this.queueErrorName));
            var queueInfo = JSON.parse(localStorage.getItem(this.queueInfoName));
            if ((queueInfo && queueInfo.length > 0) ||
                (queueError && queueError.length > 0)) {
                this.isWaiting = true;
                var data = {
                    type: product,
                    info: queueInfo,
                    error: queueError,
                };
                if (navigator.sendBeacon) {
                    this.sendDataThroughUserAgent(url, data);
                }
                else {
                    this.sendDataThroughAjaxRequest(url, data, isAsync);
                }
            }
        };
        FallbackLogger.prototype.isEnabled = function () {
            return !this.environment.isPageGenerator();
        };
        FallbackLogger.prototype.sendDataThroughUserAgent = function (url, data) {
            var successfullyTransfer = navigator.sendBeacon(url, JSON.stringify(data));
            if (successfullyTransfer) {
                this.clearQueues();
            }
            else {
                this.appendTemp();
            }
        };
        FallbackLogger.prototype.sendDataThroughAjaxRequest = function (url, data, isAsync) {
            var _this = this;
            jQuery
                .ajax({
                url: url,
                data: JSON.stringify(data),
                type: 'POST',
                async: isAsync,
            })
                .done(function () { return _this.clearQueues(); })
                .fail(function () { return _this.appendTemp(); });
        };
        FallbackLogger.prototype.clearQueues = function () {
            localStorage.setItem(this.queueErrorName, JSON.stringify(queueErrorTemp));
            localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfoTemp));
            queueErrorTemp.length = 0;
            queueInfoTemp.length = 0;
            this.isWaiting = false;
        };
        FallbackLogger.prototype.appendTemp = function () {
            var queueErrorStr = localStorage.getItem(this.queueErrorName);
            var queueInfoStr = localStorage.getItem(this.queueInfoName);
            if (queueErrorTemp.length > 0) {
                var queueError = queueErrorStr == null ? [] : JSON.parse(queueErrorStr);
                localStorage.setItem(this.queueErrorName, JSON.stringify(queueError.concat(queueErrorTemp)));
            }
            if (queueInfoTemp.length > 0) {
                var queueInfo = queueInfoStr == null ? [] : JSON.parse(queueInfoStr);
                localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfo.concat(queueInfoTemp)));
            }
            this.isWaiting = false;
        };
        return FallbackLogger;
    }());
    exports.FallbackLogger = FallbackLogger;
});
/// <amd-module name="SuiteCommerce.Columns.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.Columns.Instrumentation.Log", ["require", "exports", "SuiteCommerce.Columns.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return (!!navigator.userAgent.match(/Trident/g) ||
                !!navigator.userAgent.match(/MSIE/g));
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.Columns.Instrumentation.Logger"/>
define("SuiteCommerce.Columns.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.Columns.Instrumentation.FallbackLogger", "SuiteCommerce.Columns.Instrumentation.MockAppender"], function (require, exports, Instrumentation_FallbackLogger_1, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger').LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] },
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return new Instrumentation_FallbackLogger_1.FallbackLogger(this.options);
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.Columns.Instrumentation.MockAppender"/>
define("SuiteCommerce.Columns.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.prototype.ready = function () {
            return true;
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        MockAppender.prototype.start = function (action, options) {
            return options;
        };
        MockAppender.prototype.end = function (startOptions, options) { };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.Columns.Instrumentation"/>
define("SuiteCommerce.Columns.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.Columns.Instrumentation.Logger", "SuiteCommerce.Columns.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.Columns.EntryPoint"/>
define("SuiteCommerce.Columns.EntryPoint", ["require", "exports", "SuiteCommerce.Columns.ColumnsCCT", "SuiteCommerce.Columns.Common.InstrumentationHelper"], function (require, exports, ColumnsCCT, InstrumentationHelper_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            InstrumentationHelper_1.InstrumentationHelper.initializeInstrumentation(container.getComponent('Environment'));
            ColumnsCCT.mountToApp(container);
        },
    };
});
};
extensions['CXExtensibility.CoreContent.1.0.5'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CXExtensibility/CoreContent/1.0.5/' + asset;
};
// Types references for VSCode Intellisense
/// <reference path="../../../../../node_modules/@types/jquery/index.d.ts"/>
/// <reference path="../../../../../node_modules/@types/underscore/index.d.ts"/>
/**
 * @typedef {import("./types").Item} Item Data for single item to display in the merchandising zone
 * @typedef {import("./types").ItemImage} ItemImage Container for image url and alt text
 * @typedef {import("./types").Settings} Settings Sidepanel settings
 */
define('CXExtensibility.CoreContent.CMSMerchzoneCCT.View', [
    'CustomContentType.Base.View',
    'cxextensibility_corecontent_cmsmerchzonecct.tpl',
    'Utils',
    'jQuery',
    'underscore',
], /**
 * @param {JQueryStatic} $
 * @param {_.UnderscoreStatic} _
 */ function (CustomContentTypeBaseView, template, Utils, $, _) {
    'use strict';
    var displayModes = {
        HORIZONTAL: '1',
        VERTICAL: '2',
        GRID: '3',
    };
    var isMobile = false;
    return CustomContentTypeBaseView.extend({
        template: template,
        /**@type {Settings}*/
        settings: null,
        initialize: function () {
            this._initialize();
            this.on('afterViewRender', function () {
                var merchRule = this.settings.custrecord_merchzone_merchrule;
                isMobile = window.matchMedia("(max-width: 767px)").matches
                if (merchRule && merchRule !== '') {
                    this.fetchMerchZoneEndpoint(merchRule);
                }
            });
        },
        /**
         * Fetch merchzone information from SMT CMS endpoint
         * @param {string | number} merchzoneId Merchzone ID to fetch
         */
        fetchMerchZoneEndpoint: function fetchMerchZoneEndpoint(merchzoneId) {
            $.ajax({
                url: '/api/cms/v2/merchzones/' + merchzoneId,
            }).done(
                function (res) {
                    this.fetchItems(res.data[0].queryString);
                }.bind(this)
            );
        },
        /**
         * Fetch items from items enddpoint returned from merchzone endpoint
         * @param {string} itemsEndpoint
         */
        fetchItems: function fetchItems(itemsEndpoint) {
            $.ajax({
                url: itemsEndpoint,
            }).done(
                function (res) {
                    var itemDetails = _.map(
                        res.items,
                        function (item) {
                            /** @type {Item} */
                            var formattedItem = {
                                name: item.storedisplayname2 || item.displayname,
                                price: item.onlinecustomerprice_formatted,
                                link: '/' + item.urlcomponent,
                                image: this.getDefaultImage(item.itemimages_detail),
                            };
                            return formattedItem;
                        }.bind(this)
                    );
                    this.renderMerchzone(itemDetails);
                }.bind(this)
            );
        },
        /**
         * Render item info to template
         * @param {Item[]} items
         */
        renderMerchzone: function renderMerchzone(items) {
            if (items.length === 0) {
                return;
            }
            var heading = this.settings.custrecord_merchzone_heading || '';
            if (heading.length === 0) {
                this.$('.cms-merchzone-heading').remove();
            } else {
                this.$('.cms-merchzone-heading').text(heading);
            }
            _.each(
                items,
                function (item) {
                    var template = this.$('#item-template').contents().clone();
                    template.find('.item-name').text(item.name);
                    template.find('.item-price').text(item.price);
                    template.find('.item-link').attr('href', item.link);
                    template.find('.item-name').attr('href', item.link);
                    template.find('.cms-merchzone-see-more').attr('href', item.link);
                    template.find('.item-image').attr('src', item.image.url);
                    template.find('.item-image').attr('alt', item.image.altimagetext);
                    this.$('.cms-merchzone-slider').append(template);
                },
                this
            );
            var sliderRendered = this.$('.cms-merchzone-slider').parent().hasClass('bx-viewport');
            var displayMode = this.settings.custrecord_merchzone_display_mode.toString();
            if (displayMode !== displayModes.GRID) {
                if (sliderRendered) {
                    return;
                }
                this.renderSlider();
            } else {
                this.renderGrid();
            }
        },
        renderSlider: function renderSlider() {
            var displayMode = this.settings.custrecord_merchzone_display_mode || displayModes.HORIZONTAL;
            var mode = displayMode.toString() === displayModes.VERTICAL ? 'vertical' : 'horizontal';
            var numItems = isMobile ? 1 : parseInt(this.settings.custrecord_merchzone_numitems) || 4;
            var merchzoneWidth = this.$('.cms-merchzone-slider').width();
            var slideWidth = Math.floor(merchzoneWidth / numItems);
            var sliderOptions = {
                mode: mode,
                minSlides: numItems,
                maxSlides: numItems,
                slideWidth: slideWidth,
                moveSlides: 1,
                pager: false,
                nextText:
                    '<a class="cms-merchzone-slider-next cms-merchzone-' +
                    mode +
                    '-control"><span class="control-text">' +
                    _('next').translate() +
                    '</span> <i class="carousel-next-arrow"></i></a>',
                prevText:
                    '<a class="cms-merchzone-slider-prev cms-merchzone-' +
                    mode +
                    '-control"><i class="carousel-prev-arrow"></i> <span class="control-text">' +
                    _('prev').translate() +
                    '</span></a>',
            };
            Utils.initBxSlider(this.$('.cms-merchzone-slider'), sliderOptions);
            this.$('.item-image-wrapper').css({ 'min-height': slideWidth + 'px' });
            if (displayMode === displayModes.VERTICAL) {
                this.$('.bx-wrapper').css({ margin: '0 auto' });
            }
            // Fix incorrect height when SCA rerenders the slider
            setTimeout(
                function () {
                    var itemHeight = this.$('.cms-merchzone-item').height();
                    this.$('.bx-viewport').css({ 'min-height': itemHeight });
                }.bind(this)
            );
        },
        renderGrid: function renderGrid() {
            var merchzoneWidth = this.$('.cms-merchzone-slider').width();
            var numItems = isMobile ? 1 : parseInt(this.settings.custrecord_merchzone_numitems) || 3;
            this.$('.cms-merchzone-slider').removeClass('cms-merchzone-slider').addClass('cms-merchzone-grid');
            this.$('.cms-merchzone-grid > li').css({
                width: Math.floor(merchzoneWidth / numItems),
            });
        },
        /**
         * Get the default image or first image found if not available
         * @param {Object} itemimages The object contained in the item's itemimages_detail key
         * @returns {ItemImage}
         */
        getDefaultImage: function getDefaultImage(itemimages) {
            /**
             * Flatten method taken from SCA Utils
             * @param {Object} images
             * @returns {ItemImage[]}
             */
            function flattenImages(images) {
                if ('url' in images && 'altimagetext' in images) {
                    return [images];
                }
                return _.flatten(
                    _.map(images, function (item) {
                        if (_.isArray(item)) {
                            return item;
                        }
                        return flattenImages(item);
                    })
                );
            }
            var imageData = flattenImages(itemimages);
            var defaultImage = _.find(imageData, function (image) {
                var match = image.url.match(/.*\.default\.[A-Za-z]*/i);
                return !!match && match[0] === image.url;
            });
            return defaultImage || imageData[0];
        },
        contextDataRequest: [],
        validateContextDataRequest: function () {
            return true;
        },
        getContext: function () {
            return {
                merchRule: this.settings.custrecord_merchzone_merchrule,
                displayMode: this.settings.custrecord_merchzone_display_mode,
                numItems: this.settings.custrecord_merchzone_numitems,
            };
        },
    });
});
// @module CXExtensibility.CoreContent.CMSMerchzoneCCT
// An example cct that shows a message with the price, using the context data from the item
// Use: Utils.getAbsoluteUrl(getExtensionAssetsPath('services/service.ss'))
// to reference services or images available in your extension assets folder
define('CXExtensibility.CoreContent.CMSMerchzoneCCT', ['CXExtensibility.CoreContent.CMSMerchzoneCCT.View'], function (
    CMSMerchzoneCCTView
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var environment = container.getComponent('Environment');
            environment.setTranslation('fr_CA', [{ key: 'See More', value: 'Voir Plus' }]);
            environment.setTranslation('es_ES', [{ key: 'See More', value: 'Ver Más' }]);
            container.getComponent('CMS').registerCustomContentType({
                // this property value MUST be lowercase
                id: 'CMS_MERCHZONETWO',
                // The view to render the CCT
                view: CMSMerchzoneCCTView,
            });
        },
    };
});
define('CXExtensibility.CoreContent.CoreContentModule', [
    'CXExtensibility.CoreContent.CMSMerchzoneCCT',
], function (CMSMerchzoneCCT) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            CMSMerchzoneCCT.mountToApp(container);
        },
    };
});
};
extensions['SuiteCommerce.CustomFields.1.1.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/CustomFields/1.1.4/' + asset;
};
/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation.Helper"/>
define("SuiteCommerce.CustomFields.Instrumentation.Helper", ["require", "exports", "SuiteCommerce.CustomFields.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComponentArea = 'SC Custom Fields';
    exports.ExtensionVersion = '1.1.4';
    exports.QueueNameSuffix = '-CustomFields';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (container) {
            Instrumentation_1.default.initialize({
                environment: container.getComponent('Environment'),
                queueNameSuffix: exports.QueueNameSuffix,
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.CustomFields.JavaScript.Utils"/>
define("SuiteCommerce.CustomFields.JavaScript.Utils", ["require", "exports", "Utils"], function (require, exports, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.formatDate = function (receivedDate, dateFormat) {
            var newDate = dateFormat;
            var monthReplaced = false;
            var date = new Date(receivedDate);
            var replaceMonth = function (monthLength, format) {
                var matched = newDate.match(monthLength);
                if (matched && !monthReplaced) {
                    monthReplaced = true;
                    return newDate.replace(monthLength, date.toLocaleString('en-us', { month: format }));
                }
                return newDate;
            };
            var ua = navigator.userAgent;
            var isOldIe = ua.indexOf('MSIE ') > -1;
            if (isOldIe) {
                return receivedDate;
            }
            newDate = newDate.replace('yyyy', date.toLocaleString('en-us', { year: 'numeric' }));
            newDate = newDate.replace('yy', date.toLocaleString('en-us', { year: '2-digit' }));
            newDate = newDate.replace('dd', date.toLocaleString('en-us', { day: '2-digit' }));
            newDate = newDate.replace('d', date.toLocaleString('en-us', { day: 'numeric' }));
            newDate = replaceMonth('mmmm', 'long');
            newDate = replaceMonth('mmm', 'short');
            newDate = replaceMonth('mm', '2-digit');
            newDate = replaceMonth('m', 'numeric');
            return newDate;
        };
        // @method urlIsAbsolute @param {String} url @returns {Boolean}
        Utils.isUrlAbsolute = function (url) {
            return /^https?:\/\//.test(url);
        };
        // @method getAbsoluteUrl @param {String} file @returns {String}
        Utils.getAbsoluteUrl = function (file, isServices2) {
            return Utils_1.getAbsoluteUrl(file, isServices2);
        };
        Utils.translate = function (text) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            return Utils_1.translate.apply(void 0, [text].concat(params));
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.CustomFields.Instrumentation.Log", ["require", "exports", "SuiteCommerce.CustomFields.Instrumentation.Logger", "SuiteCommerce.CustomFields.Instrumentation.Helper"], function (require, exports, Instrumentation_Logger_1, Instrumentation_Helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.defaultParametersToSubmit = {
                componentArea: Instrumentation_Helper_1.ComponentArea,
                extensionVersion: Instrumentation_Helper_1.ExtensionVersion,
            };
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                parametersToSubmit: this.defaultParametersToSubmit || {},
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign({}, defaultAttributes, attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return (!!navigator.userAgent.match(/Trident/g) ||
                !!navigator.userAgent.match(/MSIE/g));
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation.Logger"/>
define("SuiteCommerce.CustomFields.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.CustomFields.Instrumentation.MockAppender"], function (require, exports, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger')
                    .LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] },
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return {
                    info: function (obj) { },
                    error: function (obj) { },
                };
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation.MockAppender"/>
define("SuiteCommerce.CustomFields.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.prototype.ready = function () {
            return true;
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        MockAppender.prototype.start = function (action, options) {
            return options;
        };
        MockAppender.prototype.end = function (startOptions, options) { };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation"/>
define("SuiteCommerce.CustomFields.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.Instrumentation.Logger", "SuiteCommerce.CustomFields.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var log = new Instrumentation_Log_1.Log({ label: label });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.CustomFields.Utils"/>
define("SuiteCommerce.CustomFields.Utils", ["require", "exports", "underscore"], function (require, exports, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CustomFieldsUtils = /** @class */ (function () {
        function CustomFieldsUtils() {
        }
        CustomFieldsUtils.compileText = function (textInput, variables) {
            var text = textInput || '';
            _(variables || {}).each(function (value, name) {
                var regex = new RegExp("{{" + name + "}}", 'g');
                text = text.replace(regex, value);
            });
            return text;
        };
        return CustomFieldsUtils;
    }());
    exports.CustomFieldsUtils = CustomFieldsUtils;
});
/// <amd-module name="SuiteCommerce.CustomFields.PDP.Configuration"/>
define("SuiteCommerce.CustomFields.PDP.Configuration", ["require", "exports", "underscore"], function (require, exports, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var DataMarkupTypes;
    (function (DataMarkupTypes) {
        DataMarkupTypes["JsonLd"] = "JSON-LD";
    })(DataMarkupTypes = exports.DataMarkupTypes || (exports.DataMarkupTypes = {}));
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Configuration.setEnvironment = function (environmentComponent) {
            environment = environmentComponent;
        };
        Configuration.getFieldsFromConfiguration = function () {
            var _this = this;
            var fieldsArray = [];
            var fieldsArrayUnparsed = Configuration.get('customFields.pdp.fields', []);
            fieldsArrayUnparsed.forEach(function (unparsedField) {
                fieldsArray.push({
                    nameInConfiguration: unparsedField.fieldid,
                    fieldText: unparsedField.fieldid,
                    fieldsToParse: [],
                    schema: unparsedField.schema,
                    show: unparsedField.show,
                    hideFromQuickView: unparsedField.hideFromQuickView,
                    parsedText: '',
                    visible: false,
                });
            });
            fieldsArray.forEach(function (fieldObject) {
                var fieldsToParse = _this.parseField(fieldObject.fieldText);
                fieldObject.fieldsToParse = fieldsToParse;
            });
            return fieldsArray;
        };
        Configuration.get = function (key, defaultValue) {
            if (environment) {
                var configValue = environment.getConfig(key);
                if (_.isUndefined(configValue) && !_.isUndefined(defaultValue)) {
                    return defaultValue;
                }
                return configValue;
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        Configuration.parseField = function (fieldText) {
            var regexForParse = /\[\[(.+?)\]\]/g;
            var matches = fieldText.match(regexForParse);
            matches = matches ? matches : [];
            matches = matches.map(function (field) {
                return field.replace(']]', '').replace('[[', '');
            });
            return matches;
        };
        Object.defineProperty(Configuration, "structuredDataMarkupType", {
            get: function () {
                return this.get('structureddatamarkup.type');
            },
            enumerable: true,
            configurable: true
        });
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
/// <amd-module name="SuiteCommerce.CustomFields.PDP.Main.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.CustomFields.PDP.Main.View", ["require", "exports", "Backbone", "suitecommerce_customfields_pdp_field.tpl", "SuiteCommerce.CustomFields.Instrumentation"], function (require, exports, Backbone_1, pdpFieldsTpl, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPFieldsView = /** @class */ (function (_super) {
        __extends(PDPFieldsView, _super);
        function PDPFieldsView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = pdpFieldsTpl;
            _this.isQuickView = !!options.isQuickView;
            _this.model.on('childSelected', function () {
                _this.render();
            });
            return _this;
        }
        PDPFieldsView.prototype.logFieldsQuantity = function (quantity) {
            var log = Instrumentation_1.default.getLog('usage');
            var SECTION = this.isQuickView ? 'Quick View' : 'PDP';
            log.setParameters({
                activity: "Show custom " + SECTION + " fields.",
                instanceCount: quantity,
            });
            log.submit();
        };
        PDPFieldsView.prototype.getContext = function () {
            var model = this.model;
            var fieldList = model.get('fieldsList');
            var fieldsToShow = fieldList.filter(function (field) {
                return field.show;
            });
            var fieldQuantityToShow = fieldsToShow.length;
            this.logFieldsQuantity(fieldQuantityToShow);
            return {
                field: fieldsToShow,
                showContainer: fieldQuantityToShow > 0,
            };
        };
        return PDPFieldsView;
    }(Backbone_1.View));
    exports.PDPFieldsView = PDPFieldsView;
});
/// <amd-module name="SuiteCommerce.CustomFields.PDP.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.CustomFields.PDP.Model", ["require", "exports", "Backbone", "SuiteCommerce.CustomFields.PDP.Configuration", "underscore"], function (require, exports, Backbone_1, PDP_Configuration_1, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPModel = /** @class */ (function (_super) {
        __extends(PDPModel, _super);
        function PDPModel(modelAttributes) {
            var _this = _super.call(this, modelAttributes) || this;
            _this.isQuickView = !!modelAttributes.isQuickView;
            _this.fieldsList = PDP_Configuration_1.Configuration.getFieldsFromConfiguration();
            _this.itemInfo = _this.pdp.getItemInfo().item;
            _this.fieldsForJsonLd = {};
            _this.updateFields();
            if (PDP_Configuration_1.Configuration.structuredDataMarkupType === PDP_Configuration_1.DataMarkupTypes.JsonLd) {
                _this.addJsonLdValues();
            }
            _this.pdp.on('afterOptionSelection', function () {
                _this.updateFields();
                _this.trigger('childSelected');
            });
            return _this;
        }
        Object.defineProperty(PDPModel.prototype, "pdp", {
            get: function () {
                return this.get('pdp');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "fieldsList", {
            get: function () {
                return this.get('fieldsList');
            },
            set: function (fieldsList) {
                this.set('fieldsList', fieldsList);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "itemInfo", {
            get: function () {
                return this.get('itemInfo');
            },
            set: function (itemInfo) {
                this.set('itemInfo', itemInfo);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "childItemInfo", {
            get: function () {
                return this.pdp.getSelectedMatrixChilds();
            },
            enumerable: true,
            configurable: true
        });
        PDPModel.prototype.updateFields = function () {
            var _this = this;
            var fieldList = this.fieldsList;
            fieldList.forEach(function (fieldObject) {
                var show = fieldObject.show, hideFromQuickView = fieldObject.hideFromQuickView, fieldText = fieldObject.fieldText, fieldsToParse = fieldObject.fieldsToParse;
                fieldObject.show = !!(show && (!_this.isQuickView || !hideFromQuickView));
                if (fieldObject.show) {
                    fieldObject.parsedText = _this.replaceFromFieldList(fieldText, fieldsToParse);
                    if (fieldObject.schema) {
                        _this.populateJsonLdValues(fieldObject);
                    }
                    fieldObject.visible = fieldObject.show && _this.updateVisibility(fieldsToParse);
                }
            });
            this.fieldsList = fieldList;
        };
        PDPModel.prototype.replaceFromFieldList = function (fieldText, stringList) {
            var _this = this;
            var resultText = fieldText;
            stringList.forEach(function (replaceValue) {
                var replaceString = _this.getItemInfoFieldValue(replaceValue);
                resultText = resultText
                    .split("[[" + replaceValue + "]]")
                    .join("" + replaceString);
            });
            return resultText;
        };
        PDPModel.prototype.updateVisibility = function (propertyList) {
            var _this = this;
            var foundProperties = false;
            propertyList.forEach(function (property) {
                var fieldValue = _this.getItemInfoFieldValue(property);
                if ((fieldValue && fieldValue !== '&nbsp;') || fieldValue === 0) {
                    foundProperties = true;
                }
            });
            return foundProperties;
        };
        PDPModel.prototype.getItemInfoFieldValue = function (fieldId) {
            var itemInfo = this.itemInfo;
            var childItemInfo = this.childItemInfo;
            if (childItemInfo.length === 1) {
                return childItemInfo[0][fieldId] || itemInfo[fieldId] || '';
            }
            return itemInfo[fieldId] || '';
        };
        PDPModel.prototype.populateJsonLdValues = function (fieldObject) {
            var _this = this;
            var fieldValue = '';
            fieldObject.fieldsToParse.forEach(function (field) {
                fieldValue += _this.getItemInfoFieldValue(field);
            });
            this.fieldsForJsonLd[fieldObject.schema] = fieldValue;
        };
        PDPModel.prototype.addJsonLdValues = function () {
            var _this = this;
            this.pdp.modifyViewJsonLd('ProductDetails.Full.View', function (json) {
                var extendedJson = _.extend(json, _this.fieldsForJsonLd);
                return jQuery.Deferred().resolve(extendedJson);
            });
        };
        return PDPModel;
    }(Backbone_1.Model));
    exports.PDPModel = PDPModel;
});
/// <amd-module name="SuiteCommerce.CustomFields.PDP"/>
define("SuiteCommerce.CustomFields.PDP", ["require", "exports", "SuiteCommerce.CustomFields.PDP.Configuration", "SuiteCommerce.CustomFields.PDP.Main.View", "SuiteCommerce.CustomFields.PDP.Model"], function (require, exports, PDP_Configuration_1, PDP_Main_View_1, PDP_Model_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            PDP_Configuration_1.Configuration.setEnvironment(container.getComponent('Environment'));
            var pdp = container.getComponent('PDP');
            if (pdp) {
                this.addCustomFields(pdp);
            }
        },
        addCustomFields: function (pdp) {
            this.addCustomFieldsToPDP(pdp);
            this.addCustomFieldsToQuickViews(pdp);
        },
        addCustomFieldsToPDP: function (pdp) {
            pdp.addChildView('Product.Sku', this.pdpFieldsViewConstructor(pdp));
        },
        addCustomFieldsToQuickViews: function (pdp) {
            pdp.addChildViews(pdp.PDP_QUICK_VIEW, {
                'Product.Sku': {
                    'CustomFields.PDPFields': {
                        childViewIndex: 11,
                        childViewConstructor: this.pdpFieldsViewConstructor(pdp, true),
                    },
                },
            });
        },
        pdpFieldsViewConstructor: function (pdp, isQuickView) {
            if (isQuickView === void 0) { isQuickView = false; }
            return function () {
                var model = new PDP_Model_1.PDPModel({
                    pdp: pdp,
                    isQuickView: isQuickView,
                });
                return new PDP_Main_View_1.PDPFieldsView({
                    model: model,
                    isQuickView: isQuickView,
                });
            };
        },
    };
});
/// <amd-module name="SuiteCommerce.CustomFields.PDP.Main"/>
define("SuiteCommerce.CustomFields.PDP.Main", ["require", "exports", "SuiteCommerce.CustomFields.PDP", "SuiteCommerce.CustomFields.Instrumentation.Helper"], function (require, exports, PDPFields, Instrumentation_Helper_1) {
    "use strict";
    var Module = {
        mountToApp: function (container) {
            Instrumentation_Helper_1.InstrumentationHelper.initializeInstrumentation(container);
            PDPFields.mountToApp(container);
        },
    };
    return Module;
});
};
extensions['CampusStores.DepartmentChargeExtension.1.2.5'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/DepartmentChargeExtension/1.2.5/' + asset;
};
/*
	© 2016 NetSuite Inc.
	User may not copy, modify, distribute, or re-bundle or otherwise make available this code;
	provided, however, if you are an authorized user with a NetSuite account or log-in, you
	may use this code subject to the terms that govern your access and use.
*/
// @module Cart
define('Cart.Summary.View.DepartmentCharge', [	
	'Cart.Summary.View',
	'cart_summary_departmentcharge.tpl',
	'DepartmentCharge.Model',
	'SC.Configuration',
	'jQuery',
	'underscore'
	]
,	function (
		CartSummaryView,
		cartSummaryDepartmentChargeTpl,
		DepartmentChargeModel,
		Configuration,
		jQuery,
		_
	)
{
	'use strict';
		
	var viewPrototype = CartSummaryView.prototype;
	if (Configuration && Configuration.get('departmentChargeEnabled')) {
		_.extend(viewPrototype, {
			template: cartSummaryDepartmentChargeTpl,
			events: {// Add new event as no events are defined in Cart.Summary.View
				'click [data-action="validate-segments"]': 'callRestlet'
			},
			initialize: _.wrap(viewPrototype.initialize, function initialize(fn) {
				var self = this;
				self.departmentChargePromise = jQuery.Deferred();
				fn.apply(this, _.toArray(arguments).slice(1));
				
				self.departmentChargeModel = new DepartmentChargeModel();
				self.departmentChargeModel.fetch().done(function() {
					self.departmentChargePromise.resolve();
					self.render();
				});
			}),	
			callRestlet: function callRestlet() {
				var checkoutURL = Configuration.get('siteSettings').touchpoints.checkout;
				var self = this;
				// Redirect to checkout if DC session is not active
				var sessionStatus = this.departmentChargeModel.get('SessionStatus');
				if (sessionStatus === 'F') {
					window.location.href = checkoutURL;
					return;
				}
				
				var inArray = [];
				var inObj = {};
				var segment1Req = SC.ENVIRONMENT.published.CSConfig.departmentCharge.segment_one_required;
				var segment2Req = SC.ENVIRONMENT.published.CSConfig.departmentCharge.segment_two_required;
				
				if (segment1Req === false && segment2Req === false) {					
					//no validation needed, going to checkout
					window.location.href = checkoutURL;
				}
				else {
					inObj.line = 1;
					
					if (segment1Req === true) {
						var segment1 = this.$('input[name=segment1]').val();
						inObj.seg1Text = segment1;
					}
					else {
						inObj.seg1Text = '';
					}
					if (segment2Req === true) {
						var segment2 = this.$('input[name=segment2]').val();
						inObj.seg2Text = segment2;
					}
					else {
						inObj.seg2Text = '';
					}
					
					inArray.push(inObj);
					
					var segmentInputs = {validateSegments: inArray};
					var params = segmentInputs;
					var model = new DepartmentChargeModel();
					model.save(
						params, {
							success: function(data) {
						}
					}).done(function(data) {
						var response = _.first(data.validateSegments);
						//append custom segments in checkout URL
						if (!checkoutURL.indexOf('?')) {
							checkoutURL += '?';
						}
						checkoutURL += '&segment1=' + response.seg1ID + '&segment2=' + response.seg2ID;
						
						var response = data;
						var responseJSON = data.validateSegments;
						var valuesArr = Object.keys(responseJSON).map(function(e) {
							return responseJSON[e]
						});
						
						var valuesObj = valuesArr[0];
						
						var values = _.values(valuesObj);
							
						var segmentStatus = values.indexOf(false);
						//could possible loop the indexOf(value, start) by changing the start position to the last value found
						//store false and position to an object, place in array then use for error messages
						
						if (segmentStatus !== -1) {
							var errorString;
							
							if (segmentStatus === 3) {
								errorString = Configuration.get('departmentChargeSeg1Label');
							}
							else {
								errorString = Configuration.get('departmentChargeSeg2Label');
							}
							
							//no error message in prefs, should add one
							var errorMessage = 'One of the segments you entered is invalid. Please review ' + errorString + ' and try again.';
							self.showError(errorMessage);				
						}
						else {
							window.location.href = checkoutURL;
						}
					});			
				}
			},
			getContext: _.wrap(viewPrototype.getContext, function getContext(fn) {
				// maybe something here is causing an undefined? view isn't returning to entry point
				var originalResults = fn.apply(this, _.toArray(arguments).slice(1));
				
				if (this.departmentChargeModel != null) {
					var segment1Req = SC.ENVIRONMENT.published.CSConfig.departmentCharge.segment_one_required;
					var segment2Req = SC.ENVIRONMENT.published.CSConfig.departmentCharge.segment_two_required;
					var seg1label = Configuration.get('departmentChargeSeg1Label');
					var seg2label = Configuration.get('departmentChargeSeg2Label');
					var sessionStatus = this.departmentChargeModel.get('SessionStatus');
								
					_.extend(originalResults, {
						dcSession: sessionStatus === 'T',
						segment1: segment1Req,
						segment2: segment2Req,
						seg1label: seg1label,
						seg2label: seg2label
					});
				}
				// Disable proceed to checkout button while departmentChargeModel fetch promise is pending
				_.extend(originalResults, {
					isDcPromisePending: this.departmentChargePromise.state() === 'pending',
				});
				
				return originalResults;
			})
		});
	}
});
define('DepartmentCharge.Helper', [], function DepartmentChargeHelper() {
    'use strict';
    return {
        getDepartmentChargePrice: function getDepartmentChargePrice(item) {
            var dcPriceResult = {};
            var dcPriceLevel = 'pricelevel' + SC.ENVIRONMENT.published.CSConfig.departmentCharge.price_level;
            var dcPrice = item.get(dcPriceLevel);
            var dcPriceFormatted = item.get(dcPriceLevel + '_formatted');
            if (dcPrice) {
                dcPriceResult = {
                    price: dcPrice,
                    price_formatted: dcPriceFormatted,
                    compare_price: dcPrice,
                    compare_price_formatted: dcPriceFormatted,
                    rate: dcPrice,
                    rate_formatted: dcPriceFormatted,
                    total: dcPrice,
                    total_formatted: dcPriceFormatted
                };
            }
            return dcPriceResult;
        }
    };
});
define('DepartmentCharge.MiniCart.Child.View', [
	'DepartmentCharge.Model',
	'Backbone',
	'jQuery',
	'underscore'
], function DepartmentChargeMiniCartChildView(
	DepartmentChargeModel,
	Backbone,
	jQuery,
	_
) {
	'use strict';
	return Backbone.View.extend({
		template: function minicartChildViewTpl() {
			return '';
		},
		initialize: function initialize() {
			var self = this;
			this.departmentChargeModel = new DepartmentChargeModel();
			this.departmentChargeModel.fetch().done(function fetchDcModel(result) {
				self.dcSession = result && result.SessionStatus === 'T';
				self.render();
			});
			this.on('afterViewRender', function() {
				_.defer(function deferRender() {
					if (self.dcSession) {
						// Remove checkout link from mini cart.
						jQuery('.header-mini-cart-button-checkout').remove();
					}
				});
			});
		}
	});
});
define('DepartmentCharge.Model', [
    'Backbone',
    'underscore',
    'Utils'
], function DepartmentChargeModel(
    Backbone,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/DepartmentCharge.Service.ss'))
    });
});
define('Product.Model.DepartmentCharge', [
    'Product.Model',
    'DepartmentCharge.Model',
    'DepartmentCharge.Helper',
    'SC.Configuration',
    'underscore'
], function ProductModelDepartmentCharge(
    ProductModel,
    DepartmentChargeModel,
    DepartmentChargeHelper,
    Configuration,
    _
) {
    'use strict';
    if (Configuration && Configuration.get('departmentChargeEnabled')) {
        var departmentChargeModel = new DepartmentChargeModel();
        departmentChargeModel.fetch().done(function() {
            var sessionStatus = departmentChargeModel.get('SessionStatus');
            if (sessionStatus === 'T') {
                _.extend(ProductModel.prototype, DepartmentChargeHelper);
                _.extend(ProductModel.prototype, {
                    getPrice: _.wrap(ProductModel.prototype.getPrice, function getPrice(fn) {
                        var price = fn.apply(this, _.toArray(arguments).slice(1));
                        var selectedMatrixChildren = this.getSelectedMatrixChilds();
                        var selectedItem = selectedMatrixChildren && selectedMatrixChildren.length === 1 ? selectedMatrixChildren[0] : this;
                        var dcPrice = this.getDepartmentChargePrice(selectedItem);
                        
                        return _.extend(price, dcPrice);
                    })    
                });
            }
        })
    }
});
define(
    'Rentals.View.DepartmentCharge'
,	[
        'DepartmentCharge.Model',
        'SC.Configuration',
		'underscore'
	]
,	function (
        DepartmentChargeModel,
        Configuration,
		_
	)
{
    'use strict';
    // might need to change how we get config
    if (Configuration && Configuration.get('departmentChargeEnabled')) {
        if (SC.CONFIGURATION.rentalsEnabled) {
            try {
                var RentalsView = require('Rentals.View');
                var rentalsPrototype = RentalsView.prototype;
                
                _.extend(rentalsPrototype, {
                    initialize: _.wrap(rentalsPrototype.initialize, function initialize(fn) {
                        fn.apply(this, _.toArray(arguments).slice(1));
                        var self = this;
                        this.departmentChargeModel = new DepartmentChargeModel();
                        this.departmentChargeModel.fetch().done(function() {
                            self.render();
                        });
                    }),
                
                    getContext: _.wrap(rentalsPrototype.getContext, function getContext(fn) {
                        var originalResults = fn.apply(this, _.toArray(arguments).slice(1));
                        // var sessionStatus = 'T';
                        var sessionStatus = this.departmentChargeModel.get('SessionStatus');
                        
                        if (sessionStatus === 'T') {
                            var purchaseTypes = originalResults.availablePurchaseTypes;
                            console.log('purch types list', purchaseTypes);
                            var purchaseTypesDC = [];
                            //for each item in purchTypes, iterate through and check for Rent. if false, push to new list if true do nothing
                            for (var i = 0; i < purchaseTypes.length; i ++) {
                                var purchaseTypeId = purchaseTypes[i].internalid;
                                // edit this per data structure
                                if (purchaseTypeId !== '2') {   //using internal id for 'Rent' instead of the label; label might change, but its id with the product type list/bundle won't
                                    purchaseTypesDC.push(purchaseTypes[i]);
                                }
                            }
                            _.extend(originalResults, {
                                availablePurchaseTypes: purchaseTypesDC
                            });
                        }
                        
                        return originalResults;
                    })
                });
            } catch (error) {
                /**
                * It's possible for the CDN cache to keep the adoptionsearchEnabled environment variable set to
                * true for a certain amount of time after the Adoption Search Extension has been deactivated. This
                * try/catch is added to catch the error where adoptionsearchEnabled is still true according to the
                * CDN cache, but Adoption Search Extension is deactivated.
                */
            console.log('error trying to find Rentals, exiting remove rentals logic ', error);
            }
        }
    }
});
define('Transaction.Line.Model.DepartmentCharge', [
    'Transaction.Line.Model',
    'DepartmentCharge.Model',
    'DepartmentCharge.Helper',
    'SC.Configuration',
    'underscore'
], function TransactionLineModelDepartmentCharge(
    TransactionLineModel,
    DepartmentChargeModel,
    DepartmentChargeHelper,
    Configuration,
    _
) {
    'use strict';
    if (Configuration && Configuration.get('departmentChargeEnabled')) {
        var departmentChargeModel = new DepartmentChargeModel();
        departmentChargeModel.fetch().done(function() {
            var sessionStatus = departmentChargeModel.get('SessionStatus');
            if (sessionStatus === 'T') {
                _.extend(TransactionLineModel.prototype, DepartmentChargeHelper);
                _.extend(TransactionLineModel.prototype, {
                    getPrice: _.wrap(TransactionLineModel.prototype.getPrice, function getPrice(fn) {
                        var price = fn.apply(this, _.toArray(arguments).slice(1));
                        var selectedItem = this.get('item');
                        var dcPrice = this.getDepartmentChargePrice(selectedItem);
                        
                        return _.extend(price, dcPrice);
                    })    
                });
            }
        })
    }
});
define('CampusStores.DepartmentCharge.Shopping', [
	'DepartmentCharge.MiniCart.Child.View',
	'DepartmentCharge.Model',
	'DepartmentCharge.Helper',
	'Cart.Summary.View.DepartmentCharge',
	'Rentals.View.DepartmentCharge',
	'Product.Model.DepartmentCharge',
	'Transaction.Line.Model.DepartmentCharge'
], function CampusStoresDepartmentChargeShopping(
	DepartmentChargeMiniCartChildView
) {
	'use strict';
    return {
		mountToApp: function mountToApp(container) {
			var layoutComponent = container.getComponent('Layout');
			var environmentComponent = container.getComponent('Environment');
			var cartComponent = container.getComponent('Cart');
			var featureEnabled = environmentComponent && environmentComponent.getConfig('departmentChargeEnabled');
			if (featureEnabled && layoutComponent && cartComponent) {
				layoutComponent.addChildViews(
					cartComponent.CART_MINI_VIEW, {
					  	'Header.MiniCartItemCell': {
							'DepartmentCharge.MiniCart.Child.View': {
								childViewIndex: 1,
								childViewConstructor: function() {
									return new DepartmentChargeMiniCartChildView();
								}
							}
					  	}
					}
				);
			}
		}
	}
});
};
extensions['SuiteCommerce.GiftCertificateValueCheck.1.2.5'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/GiftCertificateValueCheck/1.2.5/' + asset;
};
/// <amd-module name="SuiteCommerce.GiftCertificate.Utils.Configuration"/>
define("SuiteCommerce.GiftCertificate.Utils.Configuration", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Object.defineProperty(Configuration, "environment", {
            set: function (environmentComponent) {
                environment = environmentComponent;
            },
            enumerable: true,
            configurable: true
        });
        Configuration.get = function (key, defaultValue) {
            if (environment) {
                return environment.getConfig(key);
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        Configuration.getSearchApiMasterOptions = function () {
            if (environment) {
                var config = environment.application.getConfig();
                if (config)
                    return config.searchApiMasterOptions;
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Currency.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Currency.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CurrencyModel = /** @class */ (function (_super) {
        __extends(CurrencyModel, _super);
        function CurrencyModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(CurrencyModel.prototype, "id", {
            get: function () {
                return this.get('id');
            },
            set: function (id) {
                this.set('id', id);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CurrencyModel.prototype, "name", {
            get: function () {
                return this.get('name');
            },
            set: function (name) {
                this.set('name', name);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CurrencyModel.prototype, "symbol", {
            get: function () {
                return this.get('symbol');
            },
            set: function (symbol) {
                this.set('symbol', symbol);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CurrencyModel.prototype, "symbolPlacement", {
            get: function () {
                return this.get('symbolPlacement');
            },
            set: function (symbolPlacement) {
                this.set('symbolPlacement', symbolPlacement);
            },
            enumerable: true,
            configurable: true
        });
        return CurrencyModel;
    }(Backbone_1.Model));
    exports.CurrencyModel = CurrencyModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Customer.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Customer.Model", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificates.Collection"], function (require, exports, Backbone_1, GiftCertificate_Collection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CustomerModel = /** @class */ (function (_super) {
        __extends(CustomerModel, _super);
        function CustomerModel(attributes) {
            var _this = _super.call(this, attributes) || this;
            _this.giftCertificatesCollection = new GiftCertificate_Collection_1.GiftCertificateCollection();
            if (attributes.customerId) {
                _this.customerId = attributes.customerId;
            }
            return _this;
        }
        Object.defineProperty(CustomerModel.prototype, "customerId", {
            get: function () {
                return this.get('customerId');
            },
            set: function (customerId) {
                this.set('customerId', customerId);
            },
            enumerable: true,
            configurable: true
        });
        CustomerModel.prototype.fetchGiftCertificateList = function () {
            return this.giftCertificatesCollection.fetch();
        };
        return CustomerModel;
    }(Backbone_1.Model));
    exports.CustomerModel = CustomerModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Common.DependencyProvider"/>
define("SuiteCommerce.GiftCertificate.Common.DependencyProvider", ["require", "exports", "underscore", "Utils", "Backbone.CachedCollection", "Backbone.CachedModel"], function (require, exports, _, UtilsModuleSC, BackboneCCollection, BackboneCModel) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BackboneCachedModel = getDependency(BackboneCModel);
    exports.BackboneCachedCollection = getDependency(BackboneCCollection);
    exports.UtilsModule = getDependency(UtilsModuleSC);
    function getDependency(module) {
        if (isTranspiledModule(module)) {
            return module[Object.keys(module)[0]];
        }
        return module;
    }
    function isTranspiledModule(module) {
        var moduleKeys = Object.keys(module);
        return !_.isFunction(module) && moduleKeys.length === 1;
    }
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager"/>
define("SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AddFeedbackMessageEvent = 'FeedbackMessageEvent';
    exports.RemoveFeedbackMessageEvent = 'RemoveFeedbackMessageEvent';
    var FeedbackMessageType;
    (function (FeedbackMessageType) {
        FeedbackMessageType["ERROR"] = "error";
        FeedbackMessageType["WARNING"] = "warning";
        FeedbackMessageType["INFO"] = "info";
        FeedbackMessageType["SUCCESS"] = "success";
    })(FeedbackMessageType = exports.FeedbackMessageType || (exports.FeedbackMessageType = {}));
    var FeedbackMessageManager = /** @class */ (function () {
        function FeedbackMessageManager() {
        }
        FeedbackMessageManager.triggerMessageEvent = function (eventBuilder) {
            eventBuilder.context.trigger(exports.AddFeedbackMessageEvent, {
                message: eventBuilder.message,
                type: eventBuilder.type,
            });
        };
        FeedbackMessageManager.triggerRemoveMessageEvent = function (context) {
            context.trigger(exports.RemoveFeedbackMessageEvent, undefined);
        };
        return FeedbackMessageManager;
    }());
    exports.FeedbackMessageManager = FeedbackMessageManager;
});
/// <amd-module name="SuiteCommerce.GiftCertificates.Collection"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificates.Collection", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Common.Utils", "Backbone", "SuiteCommerce.GiftCertificate.Model"], function (require, exports, _, Utils_1, Backbone_1, GiftCertificate_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateCollection = /** @class */ (function (_super) {
        __extends(GiftCertificateCollection, _super);
        function GiftCertificateCollection() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.url = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_sl_gift_cert_mgmt' +
                '&deploy=customdeploy_ns_sc_sl_gift_cert_mgmt';
            return _this;
        }
        Object.defineProperty(GiftCertificateCollection.prototype, "model", {
            get: function () {
                return GiftCertificate_Model_1.GiftCertificateModel;
            },
            enumerable: true,
            configurable: true
        });
        GiftCertificateCollection.prototype.parse = function (response) {
            response.forEach(GiftCertificate_Model_1.GiftCertificateModel.formatGCCurrency);
            return response;
        };
        GiftCertificateCollection.prototype.getBalance = function () {
            var _this = this;
            var giftCertificateBalance = [];
            var activeGiftCertificates = this.getActiveGiftCertificates();
            var balanceByCurrency = _.groupBy(activeGiftCertificates, function (giftCertificateModel) {
                return giftCertificateModel.currency.get('id');
            });
            _.each(balanceByCurrency, function (giftCertificateModels, currencyId) {
                // @ts-ignore
                var balanceAmount = _.reduce(giftCertificateModels, function (memo, giftCertificateModel) {
                    return memo + parseFloat(giftCertificateModel.amountRemaining);
                }, 0);
                var balanceAmountFormatted;
                var currency = giftCertificateModels[0].currency;
                if (currency && currency.symbol) {
                    var currencySymbol = currency.symbol;
                    balanceAmountFormatted = Utils_1.Utils.formatCurrency(balanceAmount.toFixed(2), currencySymbol);
                    balanceAmountFormatted = _this.fixSymbolPosition(balanceAmountFormatted, currency);
                }
                else {
                    balanceAmountFormatted = Utils_1.Utils.formatCurrency(balanceAmount.toFixed(2));
                }
                giftCertificateBalance.push({
                    balanceAmount: balanceAmount,
                    balanceAmountFormatted: balanceAmountFormatted,
                    currency: giftCertificateModels[0].currency,
                });
            });
            return giftCertificateBalance;
        };
        GiftCertificateCollection.prototype.fixSymbolPosition = function (amount, currency) {
            var symbol = currency.symbol;
            var symbolBefore = currency.symbolPlacement === 1;
            var amountWithoutSymbol = amount.replace(/^\D*|\D*$/g, "");
            if (symbolBefore) {
                return symbol + amountWithoutSymbol;
            }
            return amountWithoutSymbol + symbol;
        };
        GiftCertificateCollection.prototype.getActiveGiftCertificates = function () {
            return _.filter(this.models, function (giftCertificateModel) {
                return giftCertificateModel.isActive();
            });
        };
        return GiftCertificateCollection;
    }(Backbone_1.Collection));
    exports.GiftCertificateCollection = GiftCertificateCollection;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Model", ["require", "exports", "SuiteCommerce.GiftCertificate.Item.Model", "SuiteCommerce.GiftCertificate.Currency.Model", "SuiteCommerce.GiftCertificate.Common.Utils"], function (require, exports, Item_Model_1, Currency_Model_1, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateStatus;
    (function (GiftCertificateStatus) {
        GiftCertificateStatus["active"] = "ACTIVE";
        GiftCertificateStatus["expired"] = "EXPIRED";
        GiftCertificateStatus["inactive"] = "INACTIVE";
        GiftCertificateStatus["invalid"] = "INVALID";
    })(GiftCertificateStatus = exports.GiftCertificateStatus || (exports.GiftCertificateStatus = {}));
    var GiftCertificateModel = /** @class */ (function (_super) {
        __extends(GiftCertificateModel, _super);
        function GiftCertificateModel(attributes) {
            var _this = _super.call(this, attributes) || this;
            _this.urlRoot = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_sl_gift_cert_mgmt' +
                '&deploy=customdeploy_ns_sc_sl_gift_cert_mgmt';
            _this.giftcertcode = attributes.giftcertcode || '';
            _this.status = attributes.status || '';
            _this.expirationDate = attributes.expirationDate || '';
            _this.sentOnDate = attributes.sentOnDate || '';
            _this.amountRemaining = attributes.amountRemaining || '';
            _this.amountRemainingFormatted = attributes.amountRemainingFormatted || '';
            _this.originalAmount = attributes.originalAmount || '';
            _this.originalAmountFormatted = attributes.originalAmountFormatted || '';
            _this.sender = attributes.sender || '';
            _this.currency = new Currency_Model_1.CurrencyModel(attributes.currency);
            return _this;
        }
        GiftCertificateModel.prototype.parse = function (data) {
            return GiftCertificateModel.formatGCCurrency(data);
        };
        GiftCertificateModel.formatGCCurrency = function (data) {
            if (!data.currency) {
                data.amountRemainingFormatted = Utils_1.Utils.formatCurrency(data.amountRemaining);
                data.originalAmountFormatted = Utils_1.Utils.formatCurrency(data.originalAmount);
            }
            return data;
        };
        Object.defineProperty(GiftCertificateModel.prototype, "giftcertcode", {
            get: function () {
                return this.get('giftcertcode');
            },
            set: function (giftcertcode) {
                this.set('giftcertcode', giftcertcode);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "status", {
            get: function () {
                return this.get('status');
            },
            set: function (status) {
                this.set('status', status);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "expirationDate", {
            get: function () {
                return this.get('expirationDate');
            },
            set: function (expirationDate) {
                this.set('expirationDate', expirationDate);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "sentOnDate", {
            get: function () {
                return this.get('sentOnDate');
            },
            set: function (sentOnDate) {
                this.set('sentOnDate', sentOnDate);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "amountRemaining", {
            get: function () {
                return this.get('amountRemaining');
            },
            set: function (amountRemaining) {
                this.set('amountRemaining', amountRemaining);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "amountRemainingFormatted", {
            get: function () {
                return this.get('amountRemainingFormatted');
            },
            set: function (amountRemainingFormatted) {
                this.set('amountRemainingFormatted', amountRemainingFormatted);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "originalAmount", {
            get: function () {
                return this.get('originalAmount');
            },
            set: function (originalAmount) {
                this.set('originalAmount', originalAmount);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "originalAmountFormatted", {
            get: function () {
                return this.get('originalAmountFormatted');
            },
            set: function (originalAmountFormatted) {
                this.set('originalAmountFormatted', originalAmountFormatted);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "sender", {
            get: function () {
                return this.get('sender');
            },
            set: function (sender) {
                this.set('sender', sender);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateModel.prototype, "currency", {
            get: function () {
                return this.get('currency');
            },
            set: function (currency) {
                this.set('currency', currency);
            },
            enumerable: true,
            configurable: true
        });
        GiftCertificateModel.prototype.isRemainingAmountGreaterThanZero = function () {
            return parseInt(this.get('amountRemaining'), 10) > 0;
        };
        GiftCertificateModel.prototype.isActive = function () {
            return this.get('status') === GiftCertificateStatus.active;
        };
        GiftCertificateModel.prototype.isExpired = function () {
            return this.get('status') === GiftCertificateStatus.expired;
        };
        return GiftCertificateModel;
    }(Item_Model_1.ItemModel));
    exports.GiftCertificateModel = GiftCertificateModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Common.InstrumentationHelper"/>
define("SuiteCommerce.GiftCertificate.Common.InstrumentationHelper", ["require", "exports", "SuiteCommerce.GiftCertificate.Instrumentation", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "SuiteCommerce.GiftCertificate.Main.Configuration"], function (require, exports, Instrumentation_1, OptionTiles_Configuration_1, Main_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueueNameSuffix = '-GiftCertificate';
    var ExtensionVersion = '1.2.5';
    var ComponentArea = 'SC Gift Certificate';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (environment) {
            Instrumentation_1.default.initialize({
                environment: environment,
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                },
            });
        };
        InstrumentationHelper.sendLogForDomainConfiguration = function () {
            InstrumentationHelper.sendLogForMyAccountEnablement();
            InstrumentationHelper.sendLogForShoppingEnablement();
            InstrumentationHelper.sendLogForGiftCertificatesGroupEnablement();
            InstrumentationHelper.sendLogForHideInventoryTypesFromFacetsEnablement();
            InstrumentationHelper.sendLogForShowImageOptionsSwatchEnablement();
        };
        InstrumentationHelper.sendLogForMyAccountEnablement = function () {
            var requestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            var message = Main_Configuration_1.MainConfiguration.enableGiftCertMyAccount
                ? 'Gift Certificate Management enabled on My Account'
                : 'Gift Certificate Management disabled on My Account';
            requestLog.setParameters({
                activity: message,
            });
            requestLog.submit();
        };
        InstrumentationHelper.sendLogForShoppingEnablement = function () {
            var requestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            var message = Main_Configuration_1.MainConfiguration.enableGiftCertShopping
                ? 'Gift Certificate Management enabled on Shopping'
                : 'Gift Certificate Management disabled on Shopping';
            requestLog.setParameters({
                activity: message,
            });
            requestLog.submit();
        };
        InstrumentationHelper.sendLogForGiftCertificatesGroupEnablement = function () {
            var requestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            var message = OptionTiles_Configuration_1.OptionTilesConfiguration.groupCertificatesAsItemOptions
                ? 'Gift Certificate groups enabled'
                : 'Gift Certificate groups disabled';
            requestLog.setParameters({
                activity: message,
            });
            requestLog.submit();
        };
        InstrumentationHelper.sendLogForHideInventoryTypesFromFacetsEnablement = function () {
            var requestLog = Instrumentation_1.default.getLog('hideInventoryTypesFromFacetsEnablementLog');
            var message = Main_Configuration_1.MainConfiguration.hideInventoryTypesFromFacets
                ? 'Hide Inventory Types from Facets enabled'
                : 'Hide Inventory Types from Facets disabled';
            requestLog.setParameters({
                activity: message,
            });
            requestLog.submit();
        };
        InstrumentationHelper.sendLogForShowImageOptionsSwatchEnablement = function () {
            var requestLog = Instrumentation_1.default.getLog('showImageOptionsSwatchSettingEnablement');
            var message = OptionTiles_Configuration_1.OptionTilesConfiguration.useThumbnailInButtonLabel
                ? 'Show image options swatch enabled'
                : 'Show image options swatch disabled';
            requestLog.setParameters({
                activity: message,
            });
            requestLog.submit();
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Common.Utils"/>
define("SuiteCommerce.GiftCertificate.Common.Utils", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Common.DependencyProvider", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, _, DependencyProvider_1, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var profile = null;
    var RegistrationType;
    (function (RegistrationType) {
        // no login, no register, checkout as guest only
        RegistrationType["disabled"] = "disabled";
        // login, register, guest
        RegistrationType["optional"] = "optional";
        // login, register, no guest
        RegistrationType["required"] = "required";
        // login, no register, no guest
        RegistrationType["existing"] = "existing";
    })(RegistrationType || (RegistrationType = {}));
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.translate = function (text) {
            var continuationText = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                continuationText[_i - 1] = arguments[_i];
            }
            return DependencyProvider_1.UtilsModule.translate(text, continuationText);
        };
        Utils.formatCurrency = function (value, symbol, noDecimalPosition) {
            return DependencyProvider_1.UtilsModule.formatCurrency(value, symbol, noDecimalPosition);
        };
        Utils.addParamsToUrl = function (baseUrl, params, avoidDoubleRedirect) {
            if (avoidDoubleRedirect) {
                var newParams_1 = {};
                _.each(params, function (paramValue, paramKey) {
                    newParams_1["__" + paramKey] = paramValue;
                });
                params = newParams_1;
            }
            if (baseUrl && !_.isEmpty(params)) {
                var paramString = jQuery.param(params);
                var joinString = baseUrl.indexOf('?') !== -1 ? '&' : '?';
                return baseUrl + joinString + paramString;
            }
            return baseUrl;
        };
        Utils.parseUrlOptions = function (optionsString) {
            var urlOption = optionsString || '';
            if (urlOption && urlOption.indexOf('?') !== -1) {
                urlOption = _.last(urlOption.split('?'));
            }
            if (urlOption && urlOption.indexOf('#') !== -1) {
                urlOption = _.first(urlOption.split('#'));
            }
            var options = {};
            if (urlOption && urlOption.length > 0) {
                var tokens = urlOption.split(/&/g);
                var currentToken = [];
                while (tokens.length > 0) {
                    var firstElement = tokens.shift();
                    if (firstElement) {
                        currentToken = firstElement.split(/=/g);
                    }
                    if (currentToken && currentToken[0].length !== 0) {
                        options[currentToken[0]] = this.getDecodedURLParameter(currentToken[1]);
                    }
                }
            }
            return options;
        };
        Utils.getDecodedURLParameter = function (urlParameter) {
            if (urlParameter === void 0) { urlParameter = ''; }
            var position;
            var temporal;
            for (temporal = ''; (position = urlParameter.indexOf('%')) >= 0; urlParameter = urlParameter.substring(position + 3)) {
                temporal += urlParameter.substring(0, position);
                var extract = urlParameter.substring(position, position + 3);
                try {
                    temporal += decodeURIComponent(extract);
                }
                catch (e) {
                    temporal += extract;
                }
            }
            return temporal + urlParameter;
        };
        Utils.imageFlatten = function (images) {
            var _this = this;
            var result = [];
            if ('url' in images && 'altimagetext' in images) {
                return [images];
            }
            Object.getOwnPropertyNames(images).forEach(function (key) {
                if (_.isArray(images[key])) {
                    result.push(images[key]);
                }
                else {
                    result.push(_this.imageFlatten(images[key]));
                }
            });
            return _.flatten(result);
        };
        Utils.hidePrices = function () {
            if (this.userProfileData) {
                return (this.getRegistrationType() !== RegistrationType.disabled &&
                    Configuration_1.Configuration.get('siteSettings.requireloginforpricing', 'F') === 'T' &&
                    !this.userProfileData.isloggedin);
            }
            //SCA <19.1
            var ProfileModel = require('Profile.Model');
            return ProfileModel.getInstance().hidePrices();
        };
        Utils.getRegistrationType = function () {
            // registrationmandatory is 'T' when customer registration is disabled
            if (Configuration_1.Configuration.get('siteSettings.registration.registrationmandatory', null) === 'T') {
                return RegistrationType.disabled;
            }
            if (Configuration_1.Configuration.get('siteSettings.registration.registrationoptional', null) === 'T') {
                return RegistrationType.optional;
            }
            if (Configuration_1.Configuration.get('siteSettings.registration.registrationallowed', null) === 'T') {
                return RegistrationType.required;
            }
            return RegistrationType.existing;
        };
        Object.defineProperty(Utils, "userProfileData", {
            get: function () {
                if (profile) {
                    return profile;
                }
                return null;
            },
            set: function (profileData) {
                profile = profileData;
            },
            enumerable: true,
            configurable: true
        });
        return Utils;
    }());
    exports.Utils = Utils;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.GiftCertificateMessage.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.GiftCertificateMessage.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateMessageModel = /** @class */ (function (_super) {
        __extends(GiftCertificateMessageModel, _super);
        function GiftCertificateMessageModel(options) {
            return _super.call(this, options) || this;
        }
        Object.defineProperty(GiftCertificateMessageModel.prototype, "message", {
            get: function () {
                return this.get('message');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateMessageModel.prototype, "type", {
            get: function () {
                return this.get('type');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GiftCertificateMessageModel.prototype, "closable", {
            get: function () {
                return this.get('closable');
            },
            enumerable: true,
            configurable: true
        });
        return GiftCertificateMessageModel;
    }(Backbone_1.Model));
    exports.GiftCertificateMessageModel = GiftCertificateMessageModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.GiftCertificateMessage.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.GiftCertificateMessage.View", ["require", "exports", "Backbone", "sc_gift_certificate_message.tpl"], function (require, exports, Backbone_1, MessageViewTemplate) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateMessageView = /** @class */ (function (_super) {
        __extends(GiftCertificateMessageView, _super);
        function GiftCertificateMessageView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = MessageViewTemplate;
            _this.events = {
                'click [data-action="ext-message-close-message"]': 'closeMessage',
            };
            return _this;
        }
        ;
        GiftCertificateMessageView.prototype.closeMessage = function () {
            this.remove();
        };
        ;
        GiftCertificateMessageView.prototype.getContext = function () {
            return {
                showMessage: this.model.message.length > 0,
                message: this.model.message,
                isClosable: this.model.closable,
                type: this.model.type ? this.model.type : '',
            };
        };
        return GiftCertificateMessageView;
    }(Backbone_1.View));
    exports.GiftCertificateMessageView = GiftCertificateMessageView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.GiftCertificatesList.Button.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.GiftCertificatesList.Button.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.GiftCertificatesList.Configuration", "SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager", "gift_certificates_list_row_button.tpl"], function (require, exports, Backbone_1, GiftCertificatesList_Configuration_1, FeedbackMessageManager_1, giftCertificatesButtonTpl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateButtonView = /** @class */ (function (_super) {
        __extends(GiftCertificateButtonView, _super);
        function GiftCertificateButtonView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = giftCertificatesButtonTpl;
            _this.isRemoved = false;
            _this.events = {
                'click [data-action="remove-gift-certificate"]': 'removeGiftCertificate',
            };
            _this.parentCollection = options.parentCollection;
            return _this;
        }
        GiftCertificateButtonView.prototype.removeGiftCertificate = function () {
            var _this = this;
            this.isRemoved = !this.isRemoved;
            var requestObj;
            if (this.isRemoved) {
                requestObj = this.model.destroy({}).done(function () {
                    FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                        context: _this,
                        type: FeedbackMessageManager_1.FeedbackMessageType.SUCCESS,
                        message: GiftCertificatesList_Configuration_1.GiftCertificatesListConfiguration.codeRemovedMessage,
                    });
                });
            }
            else {
                requestObj = this.model.save({}).done(function () {
                    FeedbackMessageManager_1.FeedbackMessageManager.triggerRemoveMessageEvent(_this);
                    _this.parentCollection.add(requestObj.responseJSON, { silent: true });
                });
            }
            this.render();
        };
        GiftCertificateButtonView.prototype.getContext = function () {
            return {
                isRemoved: this.isRemoved,
                removeLabel: GiftCertificatesList_Configuration_1.GiftCertificatesListConfiguration.tableRemoveLabel,
                undoLabel: GiftCertificatesList_Configuration_1.GiftCertificatesListConfiguration.tableUndoLabel,
            };
        };
        return GiftCertificateButtonView;
    }(Backbone_1.View));
    exports.GiftCertificateButtonView = GiftCertificateButtonView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Group.Collection"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Group.Collection", ["require", "exports", "SuiteCommerce.GiftCertificate.Common.DependencyProvider", "SuiteCommerce.GiftCertificate.Group.Model", "SuiteCommerce.GiftCertificates.Collection", "SuiteCommerce.GiftCertificate.Model"], function (require, exports, DependencyProvider_1, Group_Model_1, GiftCertificate_Collection_1, GiftCertificate_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GroupCollection = /** @class */ (function (_super) {
        __extends(GroupCollection, _super);
        function GroupCollection(models, options) {
            var _this = _super.call(this, models, options) || this;
            _this.url = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_sl_gift_cert_groups' +
                '&deploy=customdeploy_ns_sc_sl_gift_cert_groups';
            _this.itemToGroupMap = {};
            if (models) {
                _this.generateItemToGroupMap(models);
            }
            return _this;
        }
        GroupCollection.prototype.getGroupById = function (id) {
            return this.findWhere({ recordid: id });
        };
        GroupCollection.prototype.parse = function (rawData) {
            var models = [];
            rawData.forEach(function (rawGroup) {
                var giftCertificates = [];
                rawGroup.giftCertificates.forEach(function (giftCertificateData) {
                    var giftCertificate = new GiftCertificate_Model_1.GiftCertificateModel(giftCertificateData);
                    giftCertificates.push(giftCertificate);
                });
                var groupModel = new Group_Model_1.GroupModel({
                    giftCertificates: new GiftCertificate_Collection_1.GiftCertificateCollection(giftCertificates),
                    isinactive: rawGroup.isinactive,
                    name: rawGroup.name,
                    recordid: rawGroup.recordid,
                });
                models.push(groupModel);
            });
            this.generateItemToGroupMap(models);
            return models;
        };
        GroupCollection.prototype.generateItemToGroupMap = function (models) {
            var _this = this;
            models.forEach(function (group) {
                group.giftCertificates.forEach(function (giftCertificate) {
                    _this.itemToGroupMap[giftCertificate.id] = group.id;
                });
            });
        };
        return GroupCollection;
    }(DependencyProvider_1.BackboneCachedCollection));
    exports.GroupCollection = GroupCollection;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Group.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Group.Model", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificates.Collection"], function (require, exports, Backbone_1, GiftCertificate_Collection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GroupModel = /** @class */ (function (_super) {
        __extends(GroupModel, _super);
        function GroupModel(attributes, options) {
            var _this = _super.call(this, attributes, options) || this;
            if (attributes) {
                attributes.giftCertificates.forEach(function (giftCertificate) {
                    if (!_this.maxPrice || giftCertificate.price > _this.maxPrice) {
                        _this.maxPrice = giftCertificate.price;
                        _this.maxPriceStr = giftCertificate.priceStr;
                    }
                    if (!_this.minPrice || giftCertificate.price < _this.minPrice) {
                        _this.minPrice = giftCertificate.price;
                        _this.minPriceStr = giftCertificate.priceStr;
                    }
                });
            }
            return _this;
        }
        Object.defineProperty(GroupModel.prototype, "giftCertificates", {
            get: function () {
                return this.get('giftCertificates');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "id", {
            get: function () {
                return this.get('recordid');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "isInactive", {
            get: function () {
                return this.get('isinactive');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "name", {
            get: function () {
                return this.get('name');
            },
            enumerable: true,
            configurable: true
        });
        GroupModel.prototype.parse = function (rawData) {
            var parsedData = {
                recordid: rawData.recordid,
                name: rawData.name,
                isinactive: rawData.isinactive,
                giftCertificates: null,
            };
            parsedData.giftCertificates = new GiftCertificate_Collection_1.GiftCertificateCollection(rawData.giftCertificates);
            return parsedData;
        };
        return GroupModel;
    }(Backbone_1.Model));
    exports.GroupModel = GroupModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.GiftCertificate.Instrumentation.Log", ["require", "exports", "SuiteCommerce.GiftCertificate.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Instrumentation.Logger"/>
define("SuiteCommerce.GiftCertificate.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.GiftCertificate.Instrumentation.MockAppender"], function (require, exports, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger')
                    .LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] }
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return {
                    info: function (obj) { },
                    error: function (obj) { },
                };
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Instrumentation.MockAppender"/>
define("SuiteCommerce.GiftCertificate.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.prototype.ready = function () {
            return true;
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        MockAppender.prototype.start = function (action, options) {
            return options;
        };
        MockAppender.prototype.end = function (startOptions, options) { };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Instrumentation"/>
define("SuiteCommerce.GiftCertificate.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Instrumentation.Logger", "SuiteCommerce.GiftCertificate.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Item.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Item.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ItemModel = /** @class */ (function (_super) {
        __extends(ItemModel, _super);
        function ItemModel(attributes, options) {
            var _this = _super.call(this, attributes, options) || this;
            if (attributes.id) {
                _this.set('internalid', attributes.id);
            }
            return _this;
        }
        Object.defineProperty(ItemModel.prototype, "id", {
            get: function () {
                return this.get('internalid');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ItemModel.prototype, "price", {
            get: function () {
                return parseInt(this.get('onlinecustomerprice'), 10);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ItemModel.prototype, "priceStr", {
            get: function () {
                return this.get('onlinecustomerprice');
            },
            enumerable: true,
            configurable: true
        });
        return ItemModel;
    }(Backbone_1.Model));
    exports.ItemModel = ItemModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.LandingPage.Configuration"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.LandingPage.Configuration", ["require", "exports", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LandingPageConfiguration = /** @class */ (function (_super) {
        __extends(LandingPageConfiguration, _super);
        function LandingPageConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(LandingPageConfiguration, "landingPageTitle", {
            get: function () {
                return this.get('giftcertbalance.title');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LandingPageConfiguration, "landingPageRoute", {
            get: function () {
                return this.get('giftcertbalance.route');
            },
            enumerable: true,
            configurable: true
        });
        return LandingPageConfiguration;
    }(Configuration_1.Configuration));
    exports.LandingPageConfiguration = LandingPageConfiguration;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.LandingPage.Router"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.LandingPage.Router", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.ValueCheck.Model", "SuiteCommerce.GiftCertificate.LandingPage.Configuration", "SuiteCommerce.GiftCertificate.LandingPage.View"], function (require, exports, Backbone_1, ValueCheck_Model_1, LandingPage_Configuration_1, LandingPage_View_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LandingPageRouter = /** @class */ (function (_super) {
        __extends(LandingPageRouter, _super);
        function LandingPageRouter(options) {
            var _this = _super.call(this, options) || this;
            _this.application = options.application;
            _this.model = new ValueCheck_Model_1.ValueCheckModel({});
            return _this;
        }
        Object.defineProperty(LandingPageRouter.prototype, "routes", {
            get: function () {
                var dynamicRouteObj = {};
                dynamicRouteObj[this.getFormUrl()] = 'showGiftCertificateMain';
                return dynamicRouteObj;
            },
            enumerable: true,
            configurable: true
        });
        LandingPageRouter.prototype.getFormUrl = function () {
            return LandingPage_Configuration_1.LandingPageConfiguration.landingPageRoute;
        };
        LandingPageRouter.prototype.getResultUrl = function () {
            return this.getFormUrl() + "/result";
        };
        LandingPageRouter.prototype.showGiftCertificateMain = function () {
            var view = new LandingPage_View_1.LandingPageView({
                application: this.application,
                container: this.application,
                model: this.model,
            });
            view.showContent();
        };
        return LandingPageRouter;
    }(Backbone_1.Router));
    exports.LandingPageRouter = LandingPageRouter;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.LandingPage.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.LandingPage.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.LandingPage.Configuration", "SuiteCommerce.GiftCertificate.ValueCheck.Model", "SuiteCommerce.GiftCertificate.ValueCheck.View", "SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager", "giftcertificate_landing_page.tpl", "SuiteCommerce.GiftCertificate.GiftCertificateMessage.View", "SuiteCommerce.GiftCertificate.GiftCertificateMessage.Model"], function (require, exports, Backbone_1, LandingPage_Configuration_1, ValueCheck_Model_1, ValueCheck_View_1, FeedbackMessageManager_1, template, GiftCertificate_Message_View_1, GiftCertificate_Message_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LandingPageView = /** @class */ (function (_super) {
        __extends(LandingPageView, _super);
        function LandingPageView(options) {
            var _this = _super.call(this, options) || this;
            _this.type = options.type;
            _this.container = options.container;
            _this.template = template;
            _this.title = LandingPage_Configuration_1.LandingPageConfiguration.landingPageTitle;
            _this.updateBreadcrumbPages();
            return _this;
        }
        LandingPageView.prototype.updateBreadcrumbPages = function () {
            var pages = [
                {
                    text: LandingPage_Configuration_1.LandingPageConfiguration.landingPageTitle,
                    href: LandingPage_Configuration_1.LandingPageConfiguration.landingPageRoute,
                }
            ];
            this.getBreadcrumbPages = function () { return pages; };
        };
        Object.defineProperty(LandingPageView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    ValueCheckView: function () {
                        var valueCheckView = new ValueCheck_View_1.ValueCheckView({
                            model: new ValueCheck_Model_1.ValueCheckModel({}),
                            container: _this.container,
                            environment: ValueCheck_View_1.ExternalEnvironment.SHOPPING,
                            title: _this.title,
                        });
                        valueCheckView.on(FeedbackMessageManager_1.AddFeedbackMessageEvent, function (messageEvent) {
                            _this.showFeedbackMessage(messageEvent.type, messageEvent.message);
                        });
                        valueCheckView.on(FeedbackMessageManager_1.RemoveFeedbackMessageEvent, function () {
                            _this.clearFeedbackMessage();
                        });
                        return valueCheckView;
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        LandingPageView.prototype.getContext = function () {
            return {
                title: this.title,
            };
        };
        LandingPageView.prototype.showFeedbackMessage = function (type, message) {
            var placeholder = this.$('[data-view="GlobalMessagesView"]');
            var feedbackMessage = new GiftCertificate_Message_View_1.GiftCertificateMessageView({
                model: new GiftCertificate_Message_Model_1.GiftCertificateMessageModel({
                    message: message,
                    type: type,
                    closable: true,
                })
            });
            placeholder.empty();
            placeholder.append(feedbackMessage.render().$el.html());
        };
        LandingPageView.prototype.clearFeedbackMessage = function () {
            var placeholder = this.$('[data-view="GlobalMessagesView"]');
            placeholder.empty();
        };
        return LandingPageView;
    }(Backbone_1.View));
    exports.LandingPageView = LandingPageView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Main.Configuration"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.Main.Configuration", ["require", "exports", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MainConfiguration = /** @class */ (function (_super) {
        __extends(MainConfiguration, _super);
        function MainConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(MainConfiguration, "hideInventoryTypesFromFacets", {
            get: function () {
                return this.get('giftcertadvanced.hideInventoryTypesFromFacets');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MainConfiguration, "enableGiftCertShopping", {
            get: function () {
                return this.get('giftcertbalance.enableGiftCertShopping');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MainConfiguration, "enableGiftCertMyAccount", {
            get: function () {
                return this.get('giftcertadvanced.enableGiftCertMyAccount');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MainConfiguration, "dateFormat", {
            get: function () {
                return this.get('giftcertadvanced.dateFormat');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MainConfiguration, "priceRange", {
            get: function () {
                return this.get('giftcertadvanced.priceRange');
            },
            enumerable: true,
            configurable: true
        });
        return MainConfiguration;
    }(Configuration_1.Configuration));
    exports.MainConfiguration = MainConfiguration;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Utils"/>
define("SuiteCommerce.GiftCertificate.Utils", ["require", "exports", "SuiteCommerce.GiftCertificate.Main.Configuration"], function (require, exports, Main_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.formatDate = function (receivedDate) {
            var newDate = Main_Configuration_1.MainConfiguration.dateFormat;
            var monthReplaced = false;
            var date = new Date(receivedDate);
            var replaceMonth = function (monthLength, format) {
                var matched = newDate.match(monthLength);
                if (matched && !monthReplaced) {
                    monthReplaced = true;
                    return newDate.replace(monthLength, date.toLocaleString('en-us', { month: format }));
                }
                return newDate;
            };
            var ua = navigator.userAgent;
            var isOldIe = ua.indexOf('MSIE ') > -1;
            if (isOldIe) {
                return receivedDate;
            }
            newDate = newDate.replace('yyyy', date.toLocaleString('en-us', { year: 'numeric' }));
            newDate = newDate.replace('yy', date.toLocaleString('en-us', { year: '2-digit' }));
            newDate = newDate.replace('dd', date.toLocaleString('en-us', { day: '2-digit' }));
            newDate = newDate.replace('d', date.toLocaleString('en-us', { day: 'numeric' }));
            newDate = replaceMonth('mmmm', 'long');
            newDate = replaceMonth('mmm', 'short');
            newDate = replaceMonth('mm', '2-digit');
            newDate = replaceMonth('m', 'numeric');
            return newDate;
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.Configuration"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.Configuration", ["require", "exports", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var OptionTilesConfiguration = /** @class */ (function (_super) {
        __extends(OptionTilesConfiguration, _super);
        function OptionTilesConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(OptionTilesConfiguration, "itemOptionsLabel", {
            get: function () {
                return this.get('giftcertadvanced.itemOptionsLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OptionTilesConfiguration, "giftOptionButtonLabel", {
            get: function () {
                return this.get('giftcertadvanced.giftOptionButtonLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OptionTilesConfiguration, "useThumbnailInButtonLabel", {
            get: function () {
                return this.get('giftcertadvanced.useThumbnailInButtonLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OptionTilesConfiguration, "searchApiMasterOptions", {
            get: function () {
                return this.get('searchApiMasterOptions');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OptionTilesConfiguration, "groupCertificatesAsItemOptions", {
            get: function () {
                return this.get('giftcertadvanced.groupCertificatesAsItemOptions');
            },
            enumerable: true,
            configurable: true
        });
        return OptionTilesConfiguration;
    }(Configuration_1.Configuration));
    exports.OptionTilesConfiguration = OptionTilesConfiguration;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.Tile.Collection"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.Tile.Collection", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Common.Utils", "SuiteCommerce.GiftCertificate.Common.DependencyProvider", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "SuiteCommerce.GiftCertificate.OptionTiles.Tile.Model"], function (require, exports, _, Utils_1, DependencyProvider_1, OptionTiles_Configuration_1, OptionTiles_Tile_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TileCollection = /** @class */ (function (_super) {
        __extends(TileCollection, _super);
        function TileCollection(options) {
            var _this = _super.call(this) || this;
            _this.environment = options.environment;
            _this.filters = options.filters;
            _this.url = _this.getUrl();
            _this.model = OptionTiles_Tile_Model_1.TileModel;
            _this.comparator = function (model) {
                return model.price;
            };
            return _this;
        }
        TileCollection.prototype.getUrl = function () {
            return Utils_1.Utils.addParamsToUrl('/api/items', this.getSearchApiParams());
        };
        TileCollection.prototype.getSearchApiParams = function () {
            return _({}).extend(OptionTiles_Configuration_1.OptionTilesConfiguration.searchApiMasterOptions.itemDetails, this.getSessionSearchApiParams(), this.getItemsParams());
        };
        TileCollection.prototype.getSessionSearchApiParams = function () {
            var searchApiParams = {};
            var sessionInfo = this.environment
                ? this.environment.getSession()
                : null;
            var locale = '';
            var currency = '';
            var priceLevel = '';
            if (sessionInfo) {
                locale = sessionInfo.language && sessionInfo.language.locale;
                currency = sessionInfo.currency && sessionInfo.currency.code;
                priceLevel = sessionInfo.priceLevel;
            }
            var localeTokens;
            var language;
            var country;
            if (locale.indexOf('_') >= 0) {
                localeTokens = locale.split('_');
                language = localeTokens[0];
                country = localeTokens[1];
            }
            else {
                language = locale;
            }
            // SET API PARAMS
            if (language) {
                searchApiParams.language = language;
            }
            if (country) {
                searchApiParams.country = country;
            }
            if (currency) {
                searchApiParams.currency = currency;
            }
            searchApiParams.pricelevel = priceLevel;
            // No cache
            if (Utils_1.Utils.parseUrlOptions(window.location.search).nocache === 'T') {
                searchApiParams.nocache = 'T';
            }
            searchApiParams.limit = 100;
            return searchApiParams;
        };
        TileCollection.prototype.getItemsParams = function () {
            return this.filters;
        };
        TileCollection.prototype.parse = function (response) {
            return _(response.items).compact() || null;
        };
        return TileCollection;
    }(DependencyProvider_1.BackboneCachedCollection));
    exports.TileCollection = TileCollection;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.Tile.CollectionView"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.Tile.CollectionView", ["require", "exports", "Backbone.CollectionView", "SuiteCommerce.GiftCertificate.OptionTiles.Tile.View"], function (require, exports, BackboneCollectionView, OptionTiles_Tile_View_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TileCollectionView = /** @class */ (function (_super) {
        __extends(TileCollectionView, _super);
        function TileCollectionView(options) {
            var _this = _super.call(this, options) || this;
            _this.childView = OptionTiles_Tile_View_1.TileView;
            return _this;
        }
        return TileCollectionView;
    }(BackboneCollectionView));
    exports.TileCollectionView = TileCollectionView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.Tile.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.Tile.Model", ["require", "exports", "SuiteCommerce.GiftCertificate.Common.Utils", "SuiteCommerce.GiftCertificate.Common.DependencyProvider", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration"], function (require, exports, Utils_1, DependencyProvider_1, OptionTiles_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TileModel = /** @class */ (function (_super) {
        __extends(TileModel, _super);
        function TileModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(TileModel.prototype, "giftCertificateGroupId", {
            get: function () {
                return this.get('custitem_ns_sc_ext_gift_cert_group_id');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "url", {
            get: function () {
                return this.get('urlcomponent') || "/product/" + this.internalId;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "internalId", {
            get: function () {
                return this.get('internalid');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "name", {
            get: function () {
                return (this.get('storedisplayname2') ||
                    this.get('displayname') ||
                    this.get('itemid') ||
                    '');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "price", {
            get: function () {
                var onlinePriceDetails = this.get('onlinecustomerprice_detail');
                return onlinePriceDetails.onlinecustomerprice;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "formattedPrice", {
            get: function () {
                var onlinePriceDetails = this.get('onlinecustomerprice_detail');
                return onlinePriceDetails.onlinecustomerprice_formatted;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "label", {
            get: function () {
                var label = this.get('custitem_ns_sc_ext_options_button_lbl') ||
                    OptionTiles_Configuration_1.OptionTilesConfiguration.giftOptionButtonLabel;
                if (label) {
                    label = label.replace('[[name]]', this.name);
                    if (this.isLoginToSeePriceEnabled()) {
                        label = label.replace('[[price]]', '');
                        label.trim();
                        if (label.length === 0) {
                            label = this.name;
                        }
                    }
                    else {
                        label = label.replace('[[price]]', this.formattedPrice);
                    }
                }
                return label;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TileModel.prototype, "thumbnail", {
            get: function () {
                if (this.get('itemimages_detail').thumbnail) {
                    return this.get('itemimages_detail').thumbnail;
                }
                return this.thumbnailFromAll();
            },
            enumerable: true,
            configurable: true
        });
        TileModel.prototype.isGiftCertificateItem = function () {
            return this.get('itemtype') === 'GiftCert';
        };
        TileModel.prototype.thumbnailFromAll = function () {
            var flattenedImages;
            var itemImagesDetail = this.get('itemimages_detail');
            itemImagesDetail = itemImagesDetail.media || itemImagesDetail;
            flattenedImages = Utils_1.Utils.imageFlatten(itemImagesDetail);
            if (flattenedImages.length) {
                return flattenedImages[0];
            }
            return;
        };
        TileModel.prototype.isLoginToSeePriceEnabled = function () {
            return Utils_1.Utils.hidePrices();
        };
        return TileModel;
    }(DependencyProvider_1.BackboneCachedModel));
    exports.TileModel = TileModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.Tile.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.Tile.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "option_tile_label.tpl", "option_tile_thumbnail.tpl"], function (require, exports, Backbone_1, OptionTiles_Configuration_1, tileLabelTemplate, tileThumbnailTemplate) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TileView = /** @class */ (function (_super) {
        __extends(TileView, _super);
        function TileView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = _this.isEnabledThumbnailUsage() ? tileThumbnailTemplate : tileLabelTemplate;
            _this.isSelectedTile = options.currentGiftCertificate.internalId === _this.model.internalId;
            return _this;
        }
        TileView.prototype.getContext = function () {
            return {
                itemId: this.model.internalId,
                itemURL: this.model.url,
                isSelectedTile: this.isSelectedTile,
                tileLabel: this.model.label,
                thumbnail: this.model.thumbnail,
            };
        };
        TileView.prototype.isEnabledThumbnailUsage = function () {
            return OptionTiles_Configuration_1.OptionTilesConfiguration.useThumbnailInButtonLabel;
        };
        return TileView;
    }(Backbone_1.View));
    exports.TileView = TileView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles.TilesContainer.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.OptionTiles.TilesContainer.View", ["require", "exports", "underscore", "Backbone", "SuiteCommerce.GiftCertificate.Common.Utils", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "SuiteCommerce.GiftCertificate.OptionTiles.Tile.CollectionView", "option_tiles_container.tpl", "SuiteCommerce.GiftCertificate.Instrumentation"], function (require, exports, _, Backbone_1, Utils_1, OptionTiles_Configuration_1, OptionTiles_Tile_CollectionView_1, template, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TilesContainerView = /** @class */ (function (_super) {
        __extends(TilesContainerView, _super);
        function TilesContainerView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = template;
            if (_this.model.isGiftCertificateItem()) {
                _this.collection.fetch().done(function () {
                    _this.collection.sort();
                    _this.render();
                });
            }
            _this.events = {
                'click [data-action="open-gift-certificate"]': 'openGiftCertificate',
            };
            return _this;
        }
        Object.defineProperty(TilesContainerView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    GiftCertificateTiles: function () {
                        return new OptionTiles_Tile_CollectionView_1.TileCollectionView({
                            collection: _this.collection,
                            childViewOptions: {
                                currentGiftCertificate: _this.model,
                            },
                        });
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        TilesContainerView.prototype.openGiftCertificate = function (event) {
            var itemUrl = this.$el.find(event.target).data('itemurl')
                || this.$el.find(event.target).parent('button').data('itemurl');
            if (itemUrl) {
                itemUrl = this.getItemUrlWithCurrentUrlParams(itemUrl);
                Backbone_1.history.navigate(itemUrl, { trigger: true });
            }
            this.logClickOnTile();
        };
        TilesContainerView.prototype.logClickOnTile = function () {
            var clickOnTailLog = Instrumentation_1.default.getLog('clickOnTailLog');
            clickOnTailLog.setParameters({
                activity: 'Click on Option Tile button',
            });
            clickOnTailLog.submit();
        };
        TilesContainerView.prototype.getItemUrlWithCurrentUrlParams = function (itemUrl) {
            var giftCertificateFormFieldsSelected = _.pick(Utils_1.Utils.parseUrlOptions(location.href), 'from', 'to', 'to-email', 'message');
            return Utils_1.Utils.addParamsToUrl(itemUrl, giftCertificateFormFieldsSelected);
        };
        TilesContainerView.prototype.getContext = function () {
            return {
                giftCertificateOptionsLabel: OptionTiles_Configuration_1.OptionTilesConfiguration.itemOptionsLabel,
            };
        };
        return TilesContainerView;
    }(Backbone_1.View));
    exports.TilesContainerView = TilesContainerView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.OptionTiles"/>
define("SuiteCommerce.GiftCertificate.OptionTiles", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, _, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var OptionTiles = /** @class */ (function () {
        function OptionTiles() {
        }
        OptionTiles.excludeGiftCertificatesFromSearch = function () {
            var searchApiMasterOptions = Configuration_1.Configuration.getSearchApiMasterOptions();
            searchApiMasterOptions.CmsAdapterSearch.custitem_ns_sc_ext_only_pdp = false;
            searchApiMasterOptions.Facets.custitem_ns_sc_ext_only_pdp = false;
            searchApiMasterOptions.itemsSearcher.custitem_ns_sc_ext_only_pdp = false;
            searchApiMasterOptions.merchandisingZone.custitem_ns_sc_ext_only_pdp = false;
            searchApiMasterOptions.relatedItems.custitem_ns_sc_ext_only_pdp = false;
            searchApiMasterOptions.typeAhead.custitem_ns_sc_ext_only_pdp = false;
        };
        OptionTiles.injectInVisualComponent = function (visualComponent, options) {
            _.each(options.viewsToInject, function (viewName) {
                visualComponent.addChildViews(viewName, options.childViewConstructor);
            });
        };
        return OptionTiles;
    }());
    exports.OptionTiles = OptionTiles;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.PDP"/>
define("SuiteCommerce.GiftCertificate.PDP", ["require", "exports", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "SuiteCommerce.GiftCertificate.OptionTiles", "SuiteCommerce.GiftCertificate.OptionTiles.Tile.Collection", "SuiteCommerce.GiftCertificate.OptionTiles.Tile.Model", "SuiteCommerce.GiftCertificate.OptionTiles.TilesContainer.View"], function (require, exports, OptionTiles_Configuration_1, OptionTiles_1, OptionTiles_Tile_Collection_1, OptionTiles_Tile_Model_1, OptionTiles_TilesContainer_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            if (this.isEnabledGroupCertificatesAsItemOptions()) {
                OptionTiles_1.OptionTiles.excludeGiftCertificatesFromSearch();
                this.mountOptionTilesComponent(container.getComponent('PDP'), container.getComponent('Environment'));
            }
        },
        isEnabledGroupCertificatesAsItemOptions: function () {
            return OptionTiles_Configuration_1.OptionTilesConfiguration.groupCertificatesAsItemOptions;
        },
        mountOptionTilesComponent: function (pdp, environment) {
            var childViewConstructor = {
                'Product.Options': {
                    'GiftCertificate.Tiles': {
                        childViewIndex: 1,
                        childViewConstructor: function () {
                            var tileModel = new OptionTiles_Tile_Model_1.TileModel(pdp.getItemInfo().item);
                            if (tileModel.isGiftCertificateItem()) {
                                return new OptionTiles_TilesContainer_View_1.TilesContainerView({
                                    model: tileModel,
                                    collection: new OptionTiles_Tile_Collection_1.TileCollection({
                                        environment: environment,
                                        filters: {
                                            itemtype: 'GiftCert',
                                            custitem_ns_sc_ext_gift_cert_group_id: tileModel.giftCertificateGroupId,
                                        },
                                    }),
                                });
                            }
                        },
                    },
                },
            };
            var viewsToInject = [pdp.PDP_FULL_VIEW];
            OptionTiles_1.OptionTiles.injectInVisualComponent(pdp, {
                childViewConstructor: childViewConstructor,
                viewsToInject: viewsToInject,
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.GiftCertificate.PLP.Group.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.PLP.Group.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.Item.Model", "SuiteCommerce.GiftCertificate.Main.Configuration"], function (require, exports, Backbone_1, Item_Model_1, Main_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PLPGroupView = /** @class */ (function (_super) {
        __extends(PLPGroupView, _super);
        function PLPGroupView(options) {
            var _this = _super.call(this, options) || this;
            _this.contextDataRequest = ['item'];
            _this.template = function () { return ''; };
            _this.groupsCollection = options.groupsCollection;
            _this.environment = options.environment;
            _this.facetsSelector = ".facets-item-cell-" + _this.getPLPDisplayFormat(options.PLP);
            options.PLP.on('afterShowContent', function () {
                if (_this.matchingGroup) {
                    _this.modifyCellData(_this.matchingGroup);
                }
            });
            return _this;
        }
        PLPGroupView.prototype.getContext = function () {
            if (this.contextData.item) {
                var item = this.getItemData();
                this.matchingGroup = this.findMatchingGroup(item);
            }
        };
        PLPGroupView.prototype.getItemData = function () {
            var itemData = this.contextData.item();
            return new Item_Model_1.ItemModel(itemData);
        };
        PLPGroupView.prototype.findMatchingGroup = function (item) {
            var matchingGroupId = this.groupsCollection.itemToGroupMap[item.id];
            if (matchingGroupId) {
                return this.groupsCollection.getGroupById(matchingGroupId);
            }
        };
        PLPGroupView.prototype.modifyCellData = function (group) {
            var cell = this.$el.parents(this.facetsSelector);
            this.removeQuickViewButton(cell);
            this.modifyTitle(cell, group.name);
            if (group.minPrice !== group.maxPrice) {
                this.modifyPrice(cell, group.minPriceStr, group.maxPriceStr);
            }
        };
        PLPGroupView.prototype.modifyTitle = function (cell, newTitle) {
            var titleElement = cell.find(this.facetsSelector + "-title");
            titleElement.html(newTitle);
        };
        PLPGroupView.prototype.modifyPrice = function (cell, minPrice, maxPrice) {
            var priceElement = cell.find('.product-views-price-lead');
            var formattedMinPrice = this.formatPrice(minPrice);
            var formattedMaxPrice = this.formatPrice(maxPrice);
            var priceRange = Main_Configuration_1.MainConfiguration.priceRange;
            if (priceRange) {
                priceRange = priceRange.replace('[[minPrice]]', formattedMinPrice);
                priceRange = priceRange.replace('[[maxPrice]]', formattedMaxPrice);
            }
            priceElement.html(priceRange);
        };
        PLPGroupView.prototype.formatPrice = function (value) {
            var symbol;
            if (this.environment && this.environment.getSession() && this.environment.getSession().currency) {
                symbol = this.environment.getSession().currency.symbol;
            }
            return "" + symbol + value;
        };
        PLPGroupView.prototype.removeQuickViewButton = function (parent) {
            var quickViewElement = parent.find(this.facetsSelector + "-quick-view-wrapper");
            quickViewElement.remove();
        };
        PLPGroupView.prototype.getPLPDisplayFormat = function (PLP) {
            return PLP.getDisplay().id;
        };
        return PLPGroupView;
    }(Backbone_1.View));
    exports.PLPGroupView = PLPGroupView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.PLP"/>
define("SuiteCommerce.GiftCertificate.PLP", ["require", "exports", "SuiteCommerce.GiftCertificate.OptionTiles.Configuration", "SuiteCommerce.GiftCertificate.PLP.Group.View", "SuiteCommerce.GiftCertificate.Group.Collection", "SuiteCommerce.GiftCertificate.Instrumentation"], function (require, exports, OptionTiles_Configuration_1, PLP_Group_View_1, Group_Collection_1, Instrumentation_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            if (OptionTiles_Configuration_1.OptionTilesConfiguration.groupCertificatesAsItemOptions) {
                var PLP = container.getComponent('PLP');
                var groupsCollection = this.getGroups(PLP);
                var environment = container.getComponent('Environment');
                this.addPLPChildView(PLP, groupsCollection, environment);
            }
        },
        getGroups: function (PLP) {
            var _this = this;
            var groupsCollection = new Group_Collection_1.GroupCollection();
            PLP.on('beforeShowContent', function () { return groupsCollection.fetch().done(function () {
                groupsCollection.each(function (group) {
                    _this.registerLogForGiftCertificatesInGroup(group);
                });
            }); });
            return groupsCollection;
        },
        registerLogForGiftCertificatesInGroup: function (group) {
            if (group.giftCertificates.size() > 0) {
                var giftCertificatesByGroupLog = Instrumentation_1.default.getLog('giftCertificatesByGroupLog');
                giftCertificatesByGroupLog.setParameters({
                    activity: 'Gift Certificates quantity by group',
                    instanceCount: group.giftCertificates.size(),
                });
                giftCertificatesByGroupLog.submit();
            }
        },
        addPLPChildView: function (PLP, groupsCollection, environment) {
            PLP.addChildView('StockDescription', function () {
                return new PLP_Group_View_1.PLPGroupView({
                    PLP: PLP,
                    groupsCollection: groupsCollection,
                    environment: environment,
                });
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.GiftCertificate.ValueCheck.Configuration"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.ValueCheck.Configuration", ["require", "exports", "SuiteCommerce.GiftCertificate.Utils.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValueCheckConfiguration = /** @class */ (function (_super) {
        __extends(ValueCheckConfiguration, _super);
        function ValueCheckConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(ValueCheckConfiguration, "invalidCodeMessage", {
            get: function () {
                return this.get('giftcertbalance.invalidCodeMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "inactiveCodeMessage", {
            get: function () {
                return this.get('giftcertbalance.inactiveCodeMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "labelText", {
            get: function () {
                return this.get('giftcertbalance.labelText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "buttonText", {
            get: function () {
                return this.get('giftcertbalance.buttonText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "saveButtonText", {
            get: function () {
                return this.get('giftcertbalance.saveButtonText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "placeholderText", {
            get: function () {
                return this.get('giftcertbalance.placeholderText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "helpText", {
            get: function () {
                return this.get('giftcertbalance.helpText');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "inputFieldMinLength", {
            get: function () {
                return this.get('giftcertbalance.inputFieldMinLength');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "inputFieldMaxLength", {
            get: function () {
                return this.get('giftcertbalance.inputFieldMaxLength');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "expiredCodeMessage", {
            get: function () {
                return this.get('giftcertbalance.expiredCodeMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "remainingBalanceLabel", {
            get: function () {
                return this.get('giftcertbalance.remainingBalanceLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "giftCertificateCodeLabel", {
            get: function () {
                return this.get('giftcertbalance.giftCertificateCodeLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "codeExpiredLabel", {
            get: function () {
                return this.get('giftcertbalance.codeExpiredLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "expiryDateLabel", {
            get: function () {
                return this.get('giftcertbalance.expiryDateLabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "invalidCodeFieldHelp", {
            get: function () {
                return this.get('giftcertbalance.invalidCodeFieldHelp');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "codeSavedMessage", {
            get: function () {
                return this.get('giftcertadvanced.codeSavedMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "codeDuplicatedMessage", {
            get: function () {
                return this.get('giftcertadvanced.codeDuplicatedMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "codeExpiredMessage", {
            get: function () {
                return this.get('giftcertadvanced.codeExpiredMessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueCheckConfiguration, "generalWarning", {
            get: function () {
                return this.get('giftcertadvanced.generalWarning');
            },
            enumerable: true,
            configurable: true
        });
        return ValueCheckConfiguration;
    }(Configuration_1.Configuration));
    exports.ValueCheckConfiguration = ValueCheckConfiguration;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.ValueCheck.Form.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.ValueCheck.Form.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.Instrumentation", "SuiteCommerce.GiftCertificate.Main.Configuration", "SuiteCommerce.GiftCertificate.ValueCheck.Configuration", "SuiteCommerce.GiftCertificate.ValueCheck.Model", "value_check_form.tpl"], function (require, exports, Backbone_1, Instrumentation_1, Main_Configuration_1, ValueCheck_Configuration_1, ValueCheck_Model_1, template) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValueCheckModelSubmittedEvent = 'ValueCheckModelSubmitted';
    exports.ValueCheckModelSubmittingErrorEvent = 'ValueCheckModelSubmittingErrorEvent';
    var ValueCheckFormView = /** @class */ (function (_super) {
        __extends(ValueCheckFormView, _super);
        function ValueCheckFormView(options) {
            var _this = _super.call(this, options) || this;
            _this.showFeedbackMessages = true;
            _this.events = {
                'click button[data-action="gift-certificate-save"]': 'saveGiftCertificate',
                'click button[data-action="gift-certificate-get"]': 'getGiftCertificateDetail',
                'mousedown a[data-action="gift-certificate-save"]': 'setupNavigationToMyAccount',
                'submit form': 'submitForm',
            };
            _this.application = options.application;
            _this.template = template;
            _this.showFeedbackMessages = options.showFeedbackMessages;
            _this.showAddToMyAccountButtonAsLink =
                options.showAddToMyAccountButtonAsLink;
            _this.displayedInShopping = options.displayedInShopping || false;
            _this.displayedInCheckout = options.displayedInCheckout || false;
            _this.displayedInMyAccount = options.displayedInMyAccount || false;
            Backbone_1.Validation.bind(_this);
            if (_this.model.get('giftcertcode')) {
                _this.model.set('hasDefaultCode', true);
            }
            return _this;
        }
        ValueCheckFormView.prototype.submitForm = function (event) {
            event.preventDefault();
        };
        ValueCheckFormView.prototype.getGiftCertificateDetail = function (event) {
            var _this = this;
            if (this.isValidModel()) {
                this.$('.gift-certificate-balance-main-form-button').attr('disabled', 'disabled');
                var requestObj = this.model.getGiftCertificateData();
                requestObj.done(function () {
                    if (_this.model.get('status') === ValueCheck_Model_1.GiftCertificateStatus.active ||
                        _this.model.get('status') === ValueCheck_Model_1.GiftCertificateStatus.expired) {
                        _this.cleanValidationErrors();
                    }
                    else {
                        _this.displayError(_this.model.validation.giftcertcode.msg);
                    }
                    _this.$('.gift-certificate-balance-main-form-button').removeAttr('disabled');
                    _this.sendLogForCheckGiftCertificateBalance();
                });
                requestObj.then(null, function (error) {
                    return _this.triggerException(error);
                });
            }
            else {
                this.displayError(this.model.validation.giftcertcode.msg);
            }
        };
        ValueCheckFormView.prototype.saveGiftCertificate = function (code) {
            var _this = this;
            var giftCertificateCode = typeof code === 'string'
                ? code
                : this.$('[name="giftcertcode"]').val().toString().trim();
            if (this.isValidModel(giftCertificateCode)) {
                var requestObj = void 0;
                this.$('.gift-certificate-balance-main-form-save-button').attr('disabled', 'disabled');
                this.cleanValidationErrors();
                requestObj = this.model.save({
                    giftcertcode: giftCertificateCode,
                });
                requestObj.done(function (response) {
                    _this.model.trigger(exports.ValueCheckModelSubmittedEvent, response);
                    _this.$('.gift-certificate-balance-main-form-save-button').removeAttr('disabled');
                    _this.$('[name="giftcertcode"]').val('');
                    _this.sendLogForGiftCertificateSaved();
                });
                requestObj.then(null, function (error) {
                    _this.triggerException(error);
                    if (error.responseJSON.error === 'ERROR_GIFT_CERTIFICATE_INVALID' ||
                        error.responseJSON.error === 'ERROR_GIFT_CERTIFICATE_INACTIVE') {
                        _this.displayError(_this.model.validation.giftcertcode.msg);
                    }
                });
                return requestObj;
            }
            this.displayError(this.model.validation.giftcertcode.msg);
        };
        ValueCheckFormView.prototype.triggerException = function (error) {
            this.$('.gift-certificate-balance-main-form-save-button').removeAttr('disabled');
            this.$('.gift-certificate-balance-main-form-button').removeAttr('disabled');
            this.model.trigger(exports.ValueCheckModelSubmittingErrorEvent, error);
        };
        ValueCheckFormView.prototype.setupNavigationToMyAccount = function (event) {
            event.preventDefault();
            if (this.isValidModel()) {
                var link = this.$el.find(event.target);
                link.data('touchpoint', 'customercenter');
                link.data('hashtag', encodeURIComponent("#/gift-certificates?giftcertcode=" + this.model.get('giftcertcode')));
            }
            else {
                this.displayError(this.model.validation.giftcertcode.msg);
                return false;
            }
        };
        ValueCheckFormView.prototype.isValidModel = function (defaultCode) {
            var giftCertificateCode = this.$('[name="giftcertcode"]').val() || defaultCode;
            if (giftCertificateCode) {
                this.model.set({ giftcertcode: giftCertificateCode.trim() });
            }
            else {
                this.model.set({ giftcertcode: '' });
            }
            this.model.validate(this.model.attributes);
            return this.model.isValid();
        };
        ValueCheckFormView.prototype.displayError = function (message) {
            var placeholder = this.$('[data-type="input-help-text"]');
            this.$('.gift-certificate-balance-main-form-input-field-column').attr('data-validation-error', 'true');
            placeholder.html(message);
        };
        ValueCheckFormView.prototype.cleanValidationErrors = function () {
            this.$('[data-type="input-help-text"]').html('');
            this.$('.gift-certificate-balance-main-form-input-field-column').removeAttr('data-validation-error');
        };
        ValueCheckFormView.prototype.sendLogForCheckGiftCertificateBalance = function () {
            var requestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            var requestLogActivity = 'Click on "Add to my account button"';
            if (this.displayedInShopping) {
                requestLogActivity = 'Check gift certificate balance from Shopping';
            }
            else if (this.displayedInCheckout) {
                requestLogActivity = 'Check gift certificate balance from Checkout';
            }
            else if (this.displayedInMyAccount) {
                requestLogActivity = 'Check gift certificate balance from My Account';
            }
            requestLog.setParameters({
                activity: requestLogActivity,
            });
            requestLog.submit();
        };
        ValueCheckFormView.prototype.sendLogForGiftCertificateSaved = function () {
            var requestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            var requestLogActivity = 'Click on "Add to my account button"';
            if (this.displayedInShopping) {
                requestLogActivity = 'Click on "Add to my account button" from Shopping';
            }
            else if (this.displayedInCheckout) {
                requestLogActivity = 'Click on "Add to my account button" from Checkout';
            }
            else if (this.displayedInMyAccount) {
                requestLogActivity =
                    'Click on "Add to my account button" from My Account';
            }
            requestLog.setParameters({
                activity: requestLogActivity,
            });
            requestLog.submit();
        };
        ValueCheckFormView.prototype.getContext = function () {
            return {
                labelText: ValueCheck_Configuration_1.ValueCheckConfiguration.labelText,
                buttonText: ValueCheck_Configuration_1.ValueCheckConfiguration.buttonText,
                addToMyAccountButtonText: ValueCheck_Configuration_1.ValueCheckConfiguration.saveButtonText,
                placeholderText: ValueCheck_Configuration_1.ValueCheckConfiguration.placeholderText,
                helpText: ValueCheck_Configuration_1.ValueCheckConfiguration.helpText,
                hasHelpText: !!ValueCheck_Configuration_1.ValueCheckConfiguration.helpText,
                invalidCodeMessage: ValueCheck_Configuration_1.ValueCheckConfiguration.invalidCodeMessage,
                inactiveCodeMessage: ValueCheck_Configuration_1.ValueCheckConfiguration.inactiveCodeMessage,
                showAddToMyAccountButtonAsLink: this.showAddToMyAccountButtonAsLink,
                giftCode: this.model.get('giftcertcode'),
                isEnabledAddToMyAccount: Main_Configuration_1.MainConfiguration.enableGiftCertMyAccount,
            };
        };
        ValueCheckFormView.prototype.render = function () {
            this._render();
            if (this.model.get('hasDefaultCode')) {
                this.saveGiftCertificate(this.model.get('giftcertcode'));
            }
            return this;
        };
        return ValueCheckFormView;
    }(Backbone_1.View));
    exports.ValueCheckFormView = ValueCheckFormView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.ValueCheck.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.ValueCheck.Model", ["require", "exports", "SuiteCommerce.GiftCertificate.Instrumentation", "SuiteCommerce.GiftCertificate.ValueCheck.Configuration", "SuiteCommerce.GiftCertificate.Model"], function (require, exports, Instrumentation_1, ValueCheck_Configuration_1, GiftCertificate_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GiftCertificateStatus;
    (function (GiftCertificateStatus) {
        GiftCertificateStatus["active"] = "ACTIVE";
        GiftCertificateStatus["expired"] = "EXPIRED";
        GiftCertificateStatus["inactive"] = "INACTIVE";
        GiftCertificateStatus["invalid"] = "INVALID";
    })(GiftCertificateStatus = exports.GiftCertificateStatus || (exports.GiftCertificateStatus = {}));
    var ValueCheckModel = /** @class */ (function (_super) {
        __extends(ValueCheckModel, _super);
        function ValueCheckModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.urlRoot = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_sl_gift_cert_mgmt' +
                '&deploy=customdeploy_ns_sc_sl_gift_cert_mgmt';
            _this.validation = {
                giftcertcode: {
                    required: true,
                    minLength: ValueCheck_Configuration_1.ValueCheckConfiguration.inputFieldMinLength,
                    maxLength: ValueCheck_Configuration_1.ValueCheckConfiguration.inputFieldMaxLength,
                    msg: ValueCheck_Configuration_1.ValueCheckConfiguration.invalidCodeFieldHelp,
                },
            };
            return _this;
        }
        ValueCheckModel.prototype.getGiftCertificateData = function () {
            var giftCertificateRequestLog = Instrumentation_1.default.getLog('giftCertificateRequestLog');
            giftCertificateRequestLog.startTimer();
            this.unset('result', { silent: true });
            return this.fetch({
                data: {
                    giftcertcode: this.get('giftcertcode'),
                },
            }).done(function () {
                giftCertificateRequestLog.endTimer();
                giftCertificateRequestLog.setParameters({
                    activity: 'Time it takes load gift certificate data',
                    totalTime: giftCertificateRequestLog.getElapsedTimeForTimer(),
                });
                giftCertificateRequestLog.submit();
            });
        };
        return ValueCheckModel;
    }(GiftCertificate_Model_1.GiftCertificateModel));
    exports.ValueCheckModel = ValueCheckModel;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.ValueCheck.Result.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.ValueCheck.Result.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.ValueCheck.Configuration", "SuiteCommerce.GiftCertificate.ValueCheck.Model", "SuiteCommerce.GiftCertificate.Utils", "value_check_result.tpl"], function (require, exports, Backbone_1, ValueCheck_Configuration_1, ValueCheck_Model_1, Utils_1, template) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValueCheckResultView = /** @class */ (function (_super) {
        __extends(ValueCheckResultView, _super);
        function ValueCheckResultView(options) {
            var _this = _super.call(this, options) || this;
            _this.application = options.application;
            _this.template = template;
            return _this;
        }
        ValueCheckResultView.prototype.getContext = function () {
            var expirationDate = this.model.get('expirationDate');
            return {
                expirationDate: Utils_1.Utils.formatDate(expirationDate),
                giftCertificateCode: this.model.get('giftcertcode'),
                amountRemaining: this.model.get('amountRemainingFormatted'),
                isAmountRemainingGreaterThanZero: Number(this.model.get('amountRemaining')) > 0,
                hasExpirationDate: !!expirationDate,
                showExpirationDateInformation: this.model.get('status') === ValueCheck_Model_1.GiftCertificateStatus.expired || Number(this.model.get('amountRemaining')) > 0,
                isCodeExpired: this.model.get('status') === ValueCheck_Model_1.GiftCertificateStatus.expired,
                expiredCodeMessage: ValueCheck_Configuration_1.ValueCheckConfiguration.expiredCodeMessage,
                remainingBalanceLabel: ValueCheck_Configuration_1.ValueCheckConfiguration.remainingBalanceLabel,
                gifCertificateCodeLabel: ValueCheck_Configuration_1.ValueCheckConfiguration.giftCertificateCodeLabel,
                codeExpiredLabel: ValueCheck_Configuration_1.ValueCheckConfiguration.codeExpiredLabel,
                expiryDateLabel: ValueCheck_Configuration_1.ValueCheckConfiguration.expiryDateLabel,
            };
        };
        return ValueCheckResultView;
    }(Backbone_1.View));
    exports.ValueCheckResultView = ValueCheckResultView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.ValueCheck.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.GiftCertificate.ValueCheck.View", ["require", "exports", "Backbone", "SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager", "SuiteCommerce.GiftCertificate.ValueCheck.Configuration", "SuiteCommerce.GiftCertificate.ValueCheck.Model", "SuiteCommerce.GiftCertificate.ValueCheck.Form.View", "SuiteCommerce.GiftCertificate.ValueCheck.Result.View", "value_check.tpl"], function (require, exports, Backbone_1, FeedbackMessageManager_1, ValueCheck_Configuration_1, ValueCheck_Model_1, ValueCheck_Form_View_1, ValueCheck_Result_View_1, value_check_template) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ExternalEnvironment;
    (function (ExternalEnvironment) {
        ExternalEnvironment["SHOPPING"] = "shopping";
        ExternalEnvironment["MYACCOUNT"] = "my_account";
        ExternalEnvironment["CHECKOUT"] = "checkout";
    })(ExternalEnvironment = exports.ExternalEnvironment || (exports.ExternalEnvironment = {}));
    var ErrorCode;
    (function (ErrorCode) {
        ErrorCode["DUPLICATED_GIFT_CERTIFICATE"] = "ERROR_CUSTOMER_ALREADY_HAS_GIFT_CERTIFICATE";
        ErrorCode["EXPIRED_GIFT_CERTIFICATE_CODE"] = "ERROR_GIFT_CERTIFICATE_EXPIRED";
        ErrorCode["INVALID_GIFT_CERTIFICATE_CODE"] = "ERROR_GIFT_CERTIFICATE_INVALID";
        ErrorCode["INACTIVE_GIFT_CERTIFICATE_CODE"] = "ERROR_GIFT_CERTIFICATE_INACTIVE";
    })(ErrorCode || (ErrorCode = {}));
    var ValueCheckView = /** @class */ (function (_super) {
        __extends(ValueCheckView, _super);
        function ValueCheckView(options) {
            var _a;
            var _this = _super.call(this, options) || this;
            _this.template = value_check_template;
            _this.ErrorCodeMessageTypeMap = (_a = {},
                _a[ErrorCode.DUPLICATED_GIFT_CERTIFICATE] = {
                    type: FeedbackMessageManager_1.FeedbackMessageType.INFO,
                    message: ValueCheck_Configuration_1.ValueCheckConfiguration.codeDuplicatedMessage,
                },
                _a[ErrorCode.EXPIRED_GIFT_CERTIFICATE_CODE] = {
                    type: FeedbackMessageManager_1.FeedbackMessageType.WARNING,
                    message: ValueCheck_Configuration_1.ValueCheckConfiguration.expiredCodeMessage,
                },
                _a[ErrorCode.INVALID_GIFT_CERTIFICATE_CODE] = {
                    type: FeedbackMessageManager_1.FeedbackMessageType.WARNING,
                    message: ValueCheck_Configuration_1.ValueCheckConfiguration.invalidCodeMessage,
                },
                _a[ErrorCode.INACTIVE_GIFT_CERTIFICATE_CODE] = {
                    type: FeedbackMessageManager_1.FeedbackMessageType.WARNING,
                    message: ValueCheck_Configuration_1.ValueCheckConfiguration.inactiveCodeMessage,
                },
                _a);
            _this.model = options.model;
            _this.container = options.container;
            _this.title = options.title;
            if (options.environment)
                _this.environment = options.environment;
            return _this;
        }
        Object.defineProperty(ValueCheckView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    ValueCheckForm: function () {
                        var valueCheckFormView = new ValueCheck_Form_View_1.ValueCheckFormView({
                            application: _this.container,
                            model: _this.model,
                            showFeedbackMessages: false,
                            showAddToMyAccountButtonAsLink: _this.environment === ExternalEnvironment.SHOPPING,
                            displayedInShopping: _this.environment === ExternalEnvironment.SHOPPING,
                            displayedInCheckout: _this.environment === ExternalEnvironment.CHECKOUT,
                            displayedInMyAccount: _this.environment === ExternalEnvironment.MYACCOUNT,
                        });
                        _this.model.on('change:id change:status', function () {
                            _this.onValueCheckFormSyncModel();
                        });
                        _this.model.on('sync', function () {
                            _this.onValueCheckFormSyncModel();
                        });
                        _this.model.on(ValueCheck_Form_View_1.ValueCheckModelSubmittedEvent, function () {
                            return _this.onValueCheckFormSubmittedModel();
                        });
                        _this.model.on(ValueCheck_Form_View_1.ValueCheckModelSubmittingErrorEvent, function (response) {
                            return _this.onValueCheckFormErrorSubmittingModel(response);
                        });
                        return valueCheckFormView;
                    },
                    ValueCheckResult: function () {
                        var valueCheckResultView = new ValueCheck_Result_View_1.ValueCheckResultView({
                            application: _this.container,
                            model: _this.model,
                            showCheckAnotherGiftCertificateLink: false,
                        });
                        _this.model.on('change:id change:status', function () {
                            var status = _this.model.get('status');
                            if (status === ValueCheck_Model_1.GiftCertificateStatus.active ||
                                status === ValueCheck_Model_1.GiftCertificateStatus.expired) {
                                valueCheckResultView.render();
                                valueCheckResultView.$el
                                    .find('.gift-certificate-balance-main-result')
                                    .removeClass('hide');
                            }
                            else {
                                valueCheckResultView.$el
                                    .find('.gift-certificate-balance-main-result')
                                    .addClass('hide');
                            }
                        });
                        return valueCheckResultView;
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        ValueCheckView.prototype.onValueCheckFormSyncModel = function () {
            var status = this.model.get('status');
            if (status === ValueCheck_Model_1.GiftCertificateStatus.invalid) {
                FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                    context: this,
                    type: this.ErrorCodeMessageTypeMap[ErrorCode.INVALID_GIFT_CERTIFICATE_CODE].type,
                    message: this.ErrorCodeMessageTypeMap[ErrorCode.INVALID_GIFT_CERTIFICATE_CODE].message,
                });
            }
            else if (status === ValueCheck_Model_1.GiftCertificateStatus.inactive) {
                FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                    context: this,
                    type: this.ErrorCodeMessageTypeMap[ErrorCode.INACTIVE_GIFT_CERTIFICATE_CODE].type,
                    message: this.ErrorCodeMessageTypeMap[ErrorCode.INACTIVE_GIFT_CERTIFICATE_CODE].message,
                });
            }
            else {
                FeedbackMessageManager_1.FeedbackMessageManager.triggerRemoveMessageEvent(this);
            }
        };
        ValueCheckView.prototype.onValueCheckFormSubmittedModel = function () {
            FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                context: this,
                type: FeedbackMessageManager_1.FeedbackMessageType.SUCCESS,
                message: ValueCheck_Configuration_1.ValueCheckConfiguration.codeSavedMessage,
            });
        };
        ValueCheckView.prototype.onValueCheckFormErrorSubmittingModel = function (response) {
            var errorCode = response.responseJSON && response.responseJSON.error
                ? response.responseJSON.error
                : '';
            if (errorCode && this.ErrorCodeMessageTypeMap[errorCode]) {
                FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                    context: this,
                    type: this.ErrorCodeMessageTypeMap[errorCode].type,
                    message: this.ErrorCodeMessageTypeMap[errorCode].message,
                });
            }
            else {
                FeedbackMessageManager_1.FeedbackMessageManager.triggerMessageEvent({
                    context: this,
                    type: FeedbackMessageManager_1.FeedbackMessageType.WARNING,
                    message: ValueCheck_Configuration_1.ValueCheckConfiguration.generalWarning,
                });
            }
        };
        ValueCheckView.prototype.getContext = function () {
            return {
                title: this.title,
            };
        };
        return ValueCheckView;
    }(Backbone_1.View));
    exports.ValueCheckView = ValueCheckView;
});
/// <amd-module name="SuiteCommerce.GiftCertificate.Shopping"/>
define("SuiteCommerce.GiftCertificate.Shopping", ["require", "exports", "underscore", "SuiteCommerce.GiftCertificate.Common.InstrumentationHelper", "SuiteCommerce.GiftCertificate.Utils.Configuration", "SuiteCommerce.GiftCertificate.Common.Utils", "SuiteCommerce.GiftCertificate.PDP", "SuiteCommerce.GiftCertificate.PLP", "SuiteCommerce.GiftCertificate.LandingPage.Router", "SuiteCommerce.GiftCertificate.Main.Configuration"], function (require, exports, _, InstrumentationHelper_1, Configuration_1, Utils_1, PDP, PLP, LandingPage_Router_1, Main_Configuration_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            InstrumentationHelper_1.InstrumentationHelper.initializeInstrumentation(container.getComponent('Environment'));
            this.initializeConfigurationComponent(container);
            if (!Main_Configuration_1.MainConfiguration.enableGiftCertShopping) {
                return;
            }
            this.initializeUserProfileComponent(container);
            PLP.mountToApp(container);
            this.excludeFieldsFromFacets(this.getFieldsToExcludeFromFacets());
            this.initializeValueCheckRouter(container);
            this.initializePDPModules(container);
            this.addMenuTreeItem(container);
        },
        initializeConfigurationComponent: function (container) {
            Configuration_1.Configuration.environment = container.getComponent('Environment');
            InstrumentationHelper_1.InstrumentationHelper.sendLogForDomainConfiguration();
        },
        initializeUserProfileComponent: function (container) {
            var userProfile = container.getComponent('UserProfile');
            if (userProfile) {
                userProfile
                    .getUserProfile()
                    .then(function (userProfileData) {
                    Utils_1.Utils.userProfileData = userProfileData;
                });
            }
        },
        getFieldsToExcludeFromFacets: function () {
            var fields = [
                'custitem_ns_sc_ext_only_pdp',
                'custitem_ns_sc_ext_gift_cert_group_id',
            ];
            if (Main_Configuration_1.MainConfiguration.hideInventoryTypesFromFacets) {
                fields.push('itemtype');
            }
            return fields;
        },
        excludeFieldsFromFacets: function (fields) {
            _.each(Configuration_1.Configuration.getSearchApiMasterOptions(), function (searchMasterOption) {
                _.each(fields, function (field) {
                    if (searchMasterOption['facet.exclude']) {
                        searchMasterOption['facet.exclude'] += "," + field;
                    }
                    else {
                        searchMasterOption['facet.exclude'] = field;
                    }
                });
            });
        },
        addMenuTreeItem: function (container) {
            var myAccountMenuComponent = container.getComponent('MyAccountMenu');
            if (myAccountMenuComponent) {
                myAccountMenuComponent.addGroup({
                    id: 'MyAccountGiftCertificates',
                    name: 'Gift Certificates',
                    url: 'gift-certificates',
                    index: 3,
                });
            }
        },
        initializeValueCheckRouter: function (container) {
            new LandingPage_Router_1.LandingPageRouter({ application: container, routes: {} });
        },
        initializePDPModules: function (container) {
            PDP.mountToApp(container);
        },
    };
});
};
extensions['SuiteCommerce.InfiniteScrollExtension.1.1.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/InfiniteScrollExtension/1.1.4/' + asset;
};
/// <amd-module name="SuiteCommerce.InfiniteScroll.Configuration"/>
define("SuiteCommerce.InfiniteScroll.Configuration", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Object.defineProperty(Configuration, "environment", {
            set: function (environmentComponent) {
                environment = environmentComponent;
            },
            enumerable: true,
            configurable: true
        });
        Configuration.get = function (key) {
            if (environment) {
                return environment.getConfig(key);
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Common.InstrumentationHelper"/>
define("SuiteCommerce.InfiniteScroll.Common.InstrumentationHelper", ["require", "exports", "SuiteCommerce.InfiniteScroll.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueueNameSuffix = '-InfiniteScroll';
    var ExtensionVersion = '1.1.4';
    var ComponentArea = 'SC Infinite Scroll';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (environment) {
            setInterval(InstrumentationHelper.logPageLoads, 60000);
            Instrumentation_1.default.initialize({
                environment: environment,
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                },
            });
        };
        InstrumentationHelper.addLoadTime = function (time) {
            InstrumentationHelper.pageLoadTimes.push(time);
        };
        InstrumentationHelper.logPageLoads = function () {
            var activity = 'Page loads per minute';
            var quantity = InstrumentationHelper.pageLoadTimes.length;
            if (quantity === 0)
                return;
            var totalTime = Math.ceil(InstrumentationHelper.pageLoadTimes.reduce(function (a, b) { return a + b; }) / quantity);
            InstrumentationHelper.pageLoadTimes = [];
            var log = Instrumentation_1.default.getLog('PageLoads');
            log.setParameters({
                activity: activity,
                quantity: quantity,
                totalTime: totalTime,
            });
            log.submit();
        };
        InstrumentationHelper.pageLoadTimes = [];
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.BottomControlView"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.InfiniteScroll.BottomControlView", ["require", "exports", "SuiteCommerce.InfiniteScroll.ControlView", "infinitescroll_button_bottom.tpl", "SuiteCommerce.InfiniteScroll.Pagination", "SuiteCommerce.InfiniteScroll.ControlConfiguration", "jQuery", "underscore", "SuiteCommerce.InfiniteScroll.InfiniteScroll"], function (require, exports, ControlView_1, template, Pagination_1, Control_Configuration_1, jQuery, _, InfiniteScroll_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var BottomControlView = /** @class */ (function (_super) {
        __extends(BottomControlView, _super);
        function BottomControlView() {
            var _this = _super.call(this, {
                label: Control_Configuration_1.default.getBottomControlLabel(),
            }) || this;
            _this.template = template;
            _this.visible = true;
            _this.hideIfAutoScroll();
            InfiniteScroll_1.default.bottomControl = _this;
            return _this;
        }
        BottomControlView.prototype.hideIfAutoScroll = function () {
            if (Control_Configuration_1.default.isAutoScrollEnabled() && this.model.isActive) {
                this.visible = false;
                this.setAutoScroll();
            }
        };
        BottomControlView.prototype.getPageNumber = function () {
            return Pagination_1.default.getNextPageNumber();
        };
        BottomControlView.prototype.hasMorePages = function () {
            return Pagination_1.default.hasMorePagesBelow;
        };
        BottomControlView.prototype.setAutoScroll = function () {
            var _this = this;
            var autoScroll = function () {
                if (_this.isVisible()) {
                    jQuery(document).off('scroll.InfiniteScrollAutoScroll');
                    _this.loadPage()
                        .then(function () {
                        if (Pagination_1.default.hasMorePagesBelow) {
                            jQuery(document).on('scroll.InfiniteScrollAutoScroll', _.throttle(autoScroll, 500));
                        }
                    })
                        .fail(function () {
                        if (Pagination_1.default.hasMorePagesBelow) {
                            jQuery(document).on('scroll.InfiniteScrollAutoScroll', _.throttle(autoScroll, 500));
                        }
                    });
                }
            };
            jQuery(document).off('scroll.InfiniteScrollAutoScroll');
            jQuery(document).on('scroll.InfiniteScrollAutoScroll', _.throttle(autoScroll, 500));
        };
        BottomControlView.prototype.isVisible = function () {
            var viewportHeight = jQuery(window).height();
            var distanceScrolled = jQuery(window).scrollTop();
            var control = jQuery('.infinite-scroll-ctrl-bottom');
            if (control.length == 0) {
                return false;
            }
            var controlPosition = control.offset().top;
            return controlPosition < viewportHeight + distanceScrolled;
        };
        BottomControlView.prototype.undoPageChange = function () {
            Pagination_1.default.restoreNextPage();
        };
        BottomControlView.prototype.getContext = function () {
            return __assign(__assign({}, _super.prototype.getContext.call(this)), { visible: this.visible });
        };
        return BottomControlView;
    }(ControlView_1.default));
    exports.default = BottomControlView;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.ControlConfiguration"/>
define("SuiteCommerce.InfiniteScroll.ControlConfiguration", ["require", "exports", "SuiteCommerce.InfiniteScroll.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        getBottomControlLabel: function () {
            return Configuration_1.Configuration.get('infiniteScroll.nextBtnText');
        },
        getTopControlLabel: function () {
            return Configuration_1.Configuration.get('infiniteScroll.prevBtnText');
        },
        isAutoScrollEnabled: function () {
            return Configuration_1.Configuration.get('infiniteScroll.enableAutoScroll');
        },
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.ControlModel"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.InfiniteScroll.ControlModel", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ControlModel = /** @class */ (function (_super) {
        __extends(ControlModel, _super);
        function ControlModel(options) {
            var _this = _super.call(this, options) || this;
            _this.isLoading = false;
            _this.label = options.label;
            _this.isActive = options.isActive;
            return _this;
        }
        return ControlModel;
    }(Backbone_1.Model));
    exports.default = ControlModel;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.ControlView"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.InfiniteScroll.ControlView", ["require", "exports", "Backbone", "SuiteCommerce.InfiniteScroll.ControlModel", "SuiteCommerce.InfiniteScroll.Pagination", "SuiteCommerce.InfiniteScroll.ItemsHandler", "SuiteCommerce.InfiniteScroll.InfiniteScroll", "SuiteCommerce.InfiniteScroll.Common.InstrumentationHelper"], function (require, exports, Backbone_1, ControlModel_1, Pagination_1, ItemsHandler_1, InfiniteScroll_1, InstrumentationHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ControlView = /** @class */ (function (_super) {
        __extends(ControlView, _super);
        function ControlView(options) {
            var _this = _super.call(this, options) || this;
            _this.loadBelow = true;
            _this.events = {
                'click [data-action="load-pages"]': 'loadPage',
            };
            Pagination_1.default.reset();
            _this.model = new ControlModel_1.default({
                label: options.label,
                isActive: _this.hasMorePages(),
            });
            return _this;
        }
        ControlView.prototype.loadPage = function () {
            var _this = this;
            var pageNumber = this.getPageNumber();
            if (InfiniteScroll_1.default.isEnabled) {
                var startTime_1 = new Date().getTime();
                this.showSpinner();
                var pageURL = Pagination_1.default.getSearchApiUrl();
                var loadingPage = ItemsHandler_1.default.loadPage(pageURL, pageNumber, this.loadBelow);
                loadingPage
                    .then(function () {
                    if (_this.hasMorePages()) {
                        _this.showSpinner(false);
                    }
                    else {
                        _this.hideControl();
                    }
                    InstrumentationHelper_1.InstrumentationHelper.addLoadTime(new Date().getTime() - startTime_1);
                })
                    .fail(function () {
                    _this.undoPageChange();
                    _this.showSpinner(false);
                });
                return loadingPage;
            }
            else {
                return Pagination_1.default.setCurrentPage(pageNumber);
            }
        };
        ControlView.prototype.showSpinner = function (show) {
            if (show === void 0) { show = true; }
            this.model.isLoading = show;
            this.render();
        };
        ControlView.prototype.hideControl = function () {
            this.model.isActive = false;
            this.render();
        };
        ControlView.prototype.getContext = function () {
            return {
                label: this.model.label,
                showSpinner: this.model.isLoading,
                isActive: this.model.isActive,
            };
        };
        return ControlView;
    }(Backbone_1.View));
    exports.default = ControlView;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.TopControlView"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.InfiniteScroll.TopControlView", ["require", "exports", "SuiteCommerce.InfiniteScroll.ControlView", "infinitescroll_button_top.tpl", "SuiteCommerce.InfiniteScroll.Pagination", "SuiteCommerce.InfiniteScroll.ControlConfiguration"], function (require, exports, ControlView_1, template, Pagination_1, Control_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TopControlView = /** @class */ (function (_super) {
        __extends(TopControlView, _super);
        function TopControlView() {
            var _this = _super.call(this, {
                label: Control_Configuration_1.default.getTopControlLabel(),
            }) || this;
            _this.loadBelow = false;
            _this.template = template;
            return _this;
        }
        TopControlView.prototype.getPageNumber = function () {
            return Pagination_1.default.getPreviousPageNumber();
        };
        TopControlView.prototype.hasMorePages = function () {
            return Pagination_1.default.hasMorePagesAbove;
        };
        TopControlView.prototype.undoPageChange = function () {
            Pagination_1.default.restorePreviousPage();
        };
        return TopControlView;
    }(ControlView_1.default));
    exports.default = TopControlView;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.GoToTop.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.InfiniteScroll.GoToTop.View", ["require", "exports", "Backbone", "infinite_scroll_gototop.tpl", "jQuery", "underscore"], function (require, exports, Backbone_1, template, jQuery, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SCROLL_OFFSET = 1500;
    var GoToTopView = /** @class */ (function (_super) {
        __extends(GoToTopView, _super);
        function GoToTopView() {
            var _this = _super.call(this) || this;
            _this.template = template;
            _this.events = {
                'click [data-action="scroll-to-top"]': 'scrollToTop',
            };
            jQuery(document).on('scroll.infiniteScroll', _.debounce(_this.updateVisibility, 500));
            jQuery(function () {
                jQuery('.infinite-scroll-top').css('display', 'none');
            });
            return _this;
        }
        GoToTopView.prototype.scrollToTop = function () {
            jQuery('html, body').animate({
                scrollTop: 0,
            }, 700);
            this.updateVisibility();
        };
        GoToTopView.prototype.updateVisibility = function () {
            var currentScroll = jQuery(document).scrollTop();
            if (currentScroll > SCROLL_OFFSET) {
                jQuery('.infinite-scroll-top').fadeIn('slow');
            }
            else {
                jQuery('.infinite-scroll-top').fadeOut('slow');
            }
        };
        return GoToTopView;
    }(Backbone_1.View));
    exports.GoToTopView = GoToTopView;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.InfiniteScroll"/>
define("SuiteCommerce.InfiniteScroll.InfiniteScroll", ["require", "exports", "SuiteCommerce.InfiniteScroll.BottomControlView", "SuiteCommerce.InfiniteScroll.URLHelper", "jQuery", "underscore", "SuiteCommerce.InfiniteScroll.TopControlView", "SuiteCommerce.InfiniteScroll.GoToTop.View", "SuiteCommerce.InfiniteScroll.Pagination"], function (require, exports, BottomControlView_1, URLHelper_1, jQuery, _, TopControl_View_1, GoToTop_View_1, Pagination_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        bottomControl: null,
        isEnabled: true,
        replacePagination: function (PLP) {
            this.removePagination(PLP);
            this.manageControls(PLP);
            this.addGoToTopButton(PLP);
        },
        removePagination: function (PLP) {
            PLP.removeChildView(PLP.PLP_VIEW, 'GlobalViews.Pagination', 'GlobalViews.Pagination');
        },
        manageControls: function (PLP) {
            this.addBottomControl(PLP);
            this.addTopControl(PLP);
        },
        addBottomControl: function (PLP) {
            PLP.addChildViews(PLP.PLP_VIEW, {
                'GlobalViews.Pagination': {
                    'InfiniteScroll.BottomControl': {
                        childViewIndex: 1,
                        childViewConstructor: BottomControlView_1.default,
                    },
                },
            });
        },
        addTopControl: function (PLP) {
            PLP.addChildViews(PLP.PLP_VIEW, {
                'Facets.FacetsDisplay': {
                    'InfiniteScroll.TopControl': {
                        childViewIndex: 3,
                        childViewConstructor: TopControl_View_1.default,
                    },
                },
            });
        },
        updatePageURLOnScrollEvent: function () {
            jQuery(document).off('scroll.InfiniteScroll');
            jQuery(document).on('scroll.InfiniteScroll', _.throttle(this.updatePageURL, 500, { leading: false }));
        },
        updatePageURL: function () {
            var currentPage;
            var closestPosToTop;
            var scroll = jQuery(document).scrollTop();
            var firstItemPerPage = Pagination_1.default.getFirstItemPerPage();
            var itemsIds = Object.keys(firstItemPerPage);
            var firstItemsPos = itemsIds.map(function (id) {
                var element = jQuery("[data-view=\"Facets.Items\"] [data-item-id=\"" + id + "\"]");
                if (element.length === 1)
                    return element.offset().top - scroll;
                return Infinity;
            });
            var posiblePagesPositions = firstItemsPos.filter(function (itemPos) { return itemPos <= 0; });
            if (!posiblePagesPositions.length) {
                closestPosToTop = Math.min.apply(Math, firstItemsPos);
            }
            else {
                closestPosToTop = Math.max.apply(Math, posiblePagesPositions);
            }
            var closestItemToTop = itemsIds[firstItemsPos.indexOf(closestPosToTop)];
            currentPage = firstItemPerPage[closestItemToTop];
            if (Pagination_1.default.validPage(currentPage))
                URLHelper_1.default.updateURL(currentPage);
        },
        addGoToTopButton: function (PLP) {
            PLP.addChildViews(PLP.PLP_VIEW, {
                'GlobalViews.Pagination': {
                    'InfiniteScroll.GoToTop': {
                        childViewIndex: 6,
                        childViewConstructor: GoToTop_View_1.GoToTopView,
                    },
                },
            });
        },
        disable: function (PLP) {
            this.isEnabled = false;
            this.bottomControl.visible = true;
            this.bottomControl.render();
            jQuery(document).off('scroll.InfiniteScrollAutoScroll');
        },
        enable: function (PLP) {
            this.isEnabled = true;
            this.bottomControl.hideIfAutoScroll();
            this.bottomControl.render();
        },
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.ItemsHandler"/>
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
define("SuiteCommerce.InfiniteScroll.ItemsHandler", ["require", "exports", "SuiteCommerce.InfiniteScroll.Pagination", "SuiteCommerce.InfiniteScroll.InfiniteScroll"], function (require, exports, Pagination_1, InfiniteScroll_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var facetsItems;
    var collection;
    exports.default = {
        initialize: function (PLP) {
            var facetsItems;
            // @ts-ignore
            if (PLP.current_view) {
                // @ts-ignore
                facetsItems = PLP.current_view.getChildViewInstance('Facets.Items');
            }
            if (!facetsItems ||
                (!facetsItems.collection.fetch && !facetsItems.collection[0]) ||
                (!!facetsItems.collection.fetch && !facetsItems.collection.models[0]))
                return false;
            if (!facetsItems.collection.fetch) {
                facetsItems.collection = facetsItems.collection[0].collection;
            }
            this.collection = facetsItems.collection;
            this.facetsItems = facetsItems;
            Pagination_1.default.addFirstItemOfPage("" + this.collection.models[0].get('internalid'), Pagination_1.default.currentPage);
            return true;
        },
        loadPage: function (searchApiUrl, pageNumber, loadBelow) {
            var _this = this;
            if (!searchApiUrl) {
                return jQuery.Deferred().reject();
            }
            this.collection.url = function () { return searchApiUrl; };
            var oldItems = __spreadArrays(this.collection.models);
            return this.collection
                .fetch()
                .then(function () {
                Pagination_1.default.addFirstItemOfPage("" + _this.collection.models[0].get('internalid'), pageNumber);
                if (loadBelow) {
                    _this.facetsItems.collection.add(oldItems, { at: 0 });
                }
                else {
                    _this.facetsItems.collection.add(oldItems);
                }
                _this.renderContent(pageNumber, loadBelow);
            });
        },
        renderContent: function (pageNumber, loadBelow) {
            var $itemsContainer = jQuery('.facets-facet-browse-items');
            $itemsContainer.css('min-height', $itemsContainer.height());
            if (!loadBelow) {
                var append = this.facetsItems.$el.append;
                this.facetsItems.$el.append = this.facetsItems.$el.prepend;
                this.facetsItems.render();
                InfiniteScroll_1.default.updatePageURL();
                this.facetsItems.$el.append = append;
            }
            else {
                this.facetsItems.render();
            }
            $itemsContainer.css('min-height', '');
        },
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.URLHelper"/>
define("SuiteCommerce.InfiniteScroll.URLHelper", ["require", "exports", "underscore", "Backbone"], function (require, exports, _, Backbone) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        updateURL: function (pageNumber) {
            var oldFragment = Backbone.history.getFragment();
            var newFragment = this.generateNewFragment(oldFragment, 'page', pageNumber);
            this.setNewURL(newFragment);
        },
        generateNewFragment: function (oldFragment, parameter, newValue) {
            if (oldFragment.indexOf('?') > -1) {
                if (oldFragment.indexOf(parameter + "=") > -1) {
                    return this.parseFragment(oldFragment, parameter, newValue);
                }
                return oldFragment + ("&" + parameter + "=" + newValue);
            }
            return oldFragment + ("?" + parameter + "=" + newValue);
        },
        parseFragment: function (oldFragment, parameter, newValue) {
            var tempFragment = oldFragment.split('?');
            if (tempFragment && tempFragment[0] && tempFragment[1]) {
                if (tempFragment[1].indexOf(parameter + "=") > -1) {
                    var setParams = _.map(tempFragment[1].split('&'), function (curr) {
                        if (curr.indexOf(parameter) > -1) {
                            return parameter + "=" + newValue;
                        }
                        return curr;
                    });
                    return tempFragment[0] + '?' + setParams.join('&');
                }
            }
            return oldFragment;
        },
        setNewURL: function (newFragment) {
            if (newFragment.length !== 0) {
                Backbone.history.navigate(newFragment, {
                    trigger: false,
                    replace: true,
                });
            }
        },
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.InfiniteScroll.Instrumentation.Log", ["require", "exports", "SuiteCommerce.InfiniteScroll.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return (!!navigator.userAgent.match(/Trident/g) ||
                !!navigator.userAgent.match(/MSIE/g));
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Instrumentation.Logger"/>
define("SuiteCommerce.InfiniteScroll.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.InfiniteScroll.Instrumentation.MockAppender"], function (require, exports, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger').LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] },
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return {
                    info: function (obj) { },
                    error: function (obj) { },
                };
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Instrumentation.MockAppender"/>
define("SuiteCommerce.InfiniteScroll.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.prototype.ready = function () {
            return true;
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        MockAppender.prototype.start = function (action, options) {
            return options;
        };
        MockAppender.prototype.end = function (startOptions, options) { };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Instrumentation"/>
define("SuiteCommerce.InfiniteScroll.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.InfiniteScroll.Instrumentation.Logger", "SuiteCommerce.InfiniteScroll.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Pagination"/>
define("SuiteCommerce.InfiniteScroll.Pagination", ["require", "exports", "SuiteCommerce.InfiniteScroll.URLHelper"], function (require, exports, URLHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PLP;
    var pagination;
    var lowestLoadedPage;
    var highestLoadedPage;
    var lastPage;
    var firstItemPerPage;
    exports.default = {
        initialize: function (PLP) {
            this.PLP = PLP;
            this.pagination = this.PLP.getPagination();
            this.lowestLoadedPage = this.highestLoadedPage = this.currentPage;
            this.firstItemPerPage = {};
        },
        getPreviousPageNumber: function () {
            if (this.hasMorePagesAbove)
                this.lowestLoadedPage--;
            this.lastPage = this.currentPage;
            this.currentPage = this.lowestLoadedPage;
            return this.currentPage;
        },
        getNextPageNumber: function () {
            if (this.hasMorePagesBelow)
                this.highestLoadedPage++;
            this.lastPage = this.currentPage;
            this.currentPage = this.highestLoadedPage;
            return this.currentPage;
        },
        getSearchApiUrl: function () {
            var url = this.PLP.getUrl(this.pagination);
            if (url.lastIndexOf('commercecategoryid') == -1 && url.lastIndexOf('commercecategoryurl') == -1)
                url = this.appendCategoryToURL(url);
            return url;
        },
        appendCategoryToURL: function (url) {
            var categoryInfo = this.PLP.getCategoryInfo();
            if (categoryInfo && categoryInfo.internalid) {
                url = URLHelper_1.default.generateNewFragment(url, 'commercecategoryid', categoryInfo.internalid);
                url = url.replace('sort=relevance', 'sort=commercecategory');
            }
            return url;
        },
        reset: function () {
            this.pagination = this.PLP.getPagination();
            this.lowestLoadedPage = this.highestLoadedPage = this.currentPage;
        },
        restoreNextPage: function () {
            this.highestLoadedPage--;
            this.currentPage = this.lastPage;
        },
        restorePreviousPage: function () {
            this.lowestLoadedPage++;
            this.currentPage = this.lastPage;
        },
        setCurrentPage: function (currentPage) {
            return this.PLP.setCurrentPage({
                currentPage: currentPage,
            });
        },
        get currentPage() {
            if (this.pagination) {
                return this.pagination.currentPage;
            }
            return null;
        },
        set currentPage(pageNumber) {
            this.pagination.currentPage = pageNumber;
        },
        get hasMorePagesBelow() {
            return this.highestLoadedPage < this.pagination.pageCount;
        },
        get hasMorePagesAbove() {
            return this.lowestLoadedPage > 1 && this.validPage(this.currentPage);
        },
        getFirstItemPerPage: function () {
            return this.firstItemPerPage;
        },
        addFirstItemOfPage: function (itemId, page) {
            this.firstItemPerPage[itemId] = page;
        },
        validPage: function (page) {
            return page > 0 && page <= this.pagination.pageCount;
        }
    };
});
/// <amd-module name="SuiteCommerce.InfiniteScroll.Shopping"/>
define("SuiteCommerce.InfiniteScroll.Shopping", ["require", "exports", "SuiteCommerce.InfiniteScroll.InfiniteScroll", "SuiteCommerce.InfiniteScroll.Pagination", "SuiteCommerce.InfiniteScroll.ItemsHandler", "SuiteCommerce.InfiniteScroll.Configuration", "SuiteCommerce.InfiniteScroll.Common.InstrumentationHelper", "jQuery"], function (require, exports, InfiniteScroll_1, Pagination_1, ItemsHandler_1, Configuration_1, InstrumentationHelper_1, jQuery) {
    "use strict";
    return {
        mountToApp: function (container) {
            var environment = container.getComponent('Environment');
            var PLP = container.getComponent('PLP');
            var PDP = container.getComponent('PDP');
            PDP.on('afterShowContent', function () {
                jQuery(document).off('scroll.InfiniteScroll');
            });
            InstrumentationHelper_1.InstrumentationHelper.initializeInstrumentation(environment);
            Configuration_1.Configuration.environment = environment;
            this.initializeInfiniteScroll(PLP);
        },
        initializeInfiniteScroll: function (PLP) {
            PLP.on('beforeShowContent', function () {
                Pagination_1.default.initialize(PLP);
                InfiniteScroll_1.default.replacePagination(PLP);
            });
            PLP.on('afterShowContent', function () {
                InfiniteScroll_1.default.enable(PLP);
                if (ItemsHandler_1.default.initialize(PLP)) {
                    InfiniteScroll_1.default.updatePageURLOnScrollEvent();
                }
                else {
                    InfiniteScroll_1.default.disable(PLP);
                }
            });
        },
    };
});
};
extensions['CampusStores.InventoryLookupExtension.1.2.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/InventoryLookupExtension/1.2.4/' + asset;
};
define('Cart.AddToCart.Button.View.InventoryLookup', [
    'Cart.AddToCart.Button.View',
    'underscore'
], function CartAddToCartButtonViewInventoryLookup(
    CartAddToCartButtonView,
    _
) {
    'use strict';
    /*
        Don't allow adding item to cart if it fails basic quantity validation or if ATP and OOS behavior validation fails
    */
    _.extend(CartAddToCartButtonView.prototype, {
        getAddToCartValidators: _.wrap(CartAddToCartButtonView.prototype.getAddToCartValidators, function getAddToCartValidators(fn) {
            var self = this;
            var result = fn.apply(this, _.toArray(arguments).slice(1));
            /* eslint-disable */
            result.quantity.fn = function validateQuantity() {
                //original vars
                var line_on_cart = self.cart.findLine(self.model)
                ,	quantity = self.model.get('quantity')
                ,	minimum_quantity = self.model.getItem().get('_minimumQuantity') || 1
                ,	maximum_quantity = self.model.getItem().get('_maximumQuantity');
                //campus vars
                var item = self.model.getItem();
                //TODO: think this just grabs the whole config object, may need to update as this was the vinson way
                var configuration = self.options.application.Configuration;
                var messageMaxQuantityExceeded = configuration.onlineatpMaxQuantityExceeded;
                // var messageOutOfStockLineItem = configuration.onlineatpOutOfStockLineItem;
                // var messageOutOfStock = configuration.onlineatpOutOfStock;
                // var messageReducedStock = configuration.onlineatpReducedStock;
                // var messagePartialBackOrder = configuration.onlineatpPartialBackOrder;
                // var itemField = configuration.onlineatpItemfield;
                //TODO: move these ids out to prefs, no reason to hardcode
                var idOutOfStockBehavior = 'custitem_nsts_csic_web_oos_behavior';
                var idOnlineATP = 'custitem_nsts_csic_online_atp';
                var isMatrix = _.some(self.model.get('options').models, function isMatrix(model) {
                    return model.attributes.isMatrixDimension;
                });
                var outOfStockBehavior;
                var onlineATP;
                
                if (isMatrix) {
                    outOfStockBehavior = self.model.getSelectedMatrixChilds()[0].get(idOutOfStockBehavior);
                    onlineATP = parseFloat(self.model.getSelectedMatrixChilds()[0].get(idOnlineATP));
                } else {
                    outOfStockBehavior = item.get(idOutOfStockBehavior);
                    onlineATP = parseFloat(item.get(idOnlineATP));
                }
                //original logical statements
                if (!_.isNumber(quantity) || _.isNaN(quantity) || quantity < 1)
                {
                    return _.translate('Invalid quantity value');
                }
                else if (!line_on_cart && line_on_cart + quantity < minimum_quantity)
                {
                    return _.translate('Please add $(0) or more of this item', minimum_quantity);
                }
                else if(!!maximum_quantity)
                {
                    maximum_quantity = (!line_on_cart) ? maximum_quantity : maximum_quantity - line_on_cart.quantity;
                    if(quantity > maximum_quantity)
                    {
                        return _.translate('Please add $(0) or less of this item', maximum_quantity);
                    }
                }
                
                //campus logical statements
                else if (onlineATP !== undefined && onlineATP >= 0) 
                {
                    //TODO: remove these hardcoded values, should check against config or pefs or something
                    if (outOfStockBehavior === 'Disallow backorders but display out-of-stock message' ||
                        outOfStockBehavior === 'ATP based add and remove from web display') 
                    {
                        if (onlineATP === 0) {
                            // should only go here for Disallow, ATP Based will remove OOS items from store entirely
                            return _.translate('This item is currently out of stock and does not allow backorders.')
                        }
                        else if (quantity > onlineATP) 
                        {
                            return _.translate(messageMaxQuantityExceeded + onlineATP);
                        }
                    }
                }
                //TODO: i think we need to add more validations here, only one is running currently
            };
            return result;
            /* eslint-enable */
        })
    });
});
define('Cart.Detailed.View.InventoryLookup', [
    'Cart.Detailed.View',
    'SC.Configuration',
    'jQuery',
    'underscore'
], function CartDetailedViewInventoryLookup(
    CartDetailedView,
    Configuration,
    jQuery,
    _
) {
    'use strict';
    /*
        This file does ATP validation on the detailed cart summary
        and will display errors near item quantity if validation fails
    */
    _.extend(CartDetailedView.prototype, {
        events: _.extend(CartDetailedView.prototype.events || {}, {
            'click [data-touchpoint="checkout"]': 'validateOnlineATP'
        }),
        validateOnlineATP: function validateOnlineATP(e, validated) {
            var self = this;
            var itemsInCart = [];
            var eventTargetCalss;
            this.hideError();
            if (!validated) {
                eventTargetCalss = e.target && e.target.className;
                e.stopPropagation();
                e.preventDefault();
                this.model.get('lines').each(function eachLine(line) {
                    itemsInCart.push(line.get('item').get('internalid'));
                }, this);
                this.model.validateOnlineATP(itemsInCart).done(function doneValidateOnlineATP(invalidQuantity) {
                    if (invalidQuantity.outOfStockItems.length > 0) {
                        self.showError(
                            _(Configuration.onlineatpOutOfStock + '<br>' + invalidQuantity.outOfStockItems.join('<br>')).translate(),
                            self.$('#shopping-cart')
                        );
                    } else if (invalidQuantity.reduceStockItems.length > 0) {
                        self.showError(
                            _(Configuration.onlineatpReducedStock + '<br>' + invalidQuantity.reduceStockItems.join('<br>')).translate(),
                            self.$('#shopping-cart')
                        );
                    } else {
                        jQuery('.' + eventTargetCalss).trigger('click', true);
                    }
                }).fail(function failValidateOnlineATP(err) {
                    console.error(err); //eslint-disable-line
                });
            }
        },
        debouncedUpdateItemQuantity: _.debounce(function debouncedUpdateItemQuantity(e) {
            var $line;
            var options = this.$(e.target).closest('form').serializeObject();
            var internalid = options.internalid;
            var quantity = options.quantity;
            var line = this.model.get('lines').get(internalid);
            var onlineATP = line.get('item').get('custitem_nsts_csic_online_atp');
            var allowBackorders = line.get('item').get('custitem_nsts_csic_web_oos_behavior') === 'Allow back orders but display out-of-stock message'
                || line.get('item').get('custitem_nsts_csic_web_oos_behavior') === 'Allow back orders with no out-of-stock message';
            if (!allowBackorders && quantity > onlineATP) {
                $line = this.$('#' + internalid);
                if (onlineATP <= 0) this.showError(_(Configuration.onlineatpOutOfStockLineItem).translate(), $line);
                else if (onlineATP > 0 && onlineATP >= line.get('quantity')) {
                    this.showError(_(Configuration.onlineatpMaxQuantityExceeded + onlineATP).translate(), $line);
                }
            } else this.updateItemQuantity(e);
        }, 1000)
    });
});
define('Cart.Summary.View.InventoryLookup', [
    'Cart.Summary.View',
    'SC.Configuration',
    'jQuery',
    'underscore'
], function CartSummaryViewInventoryLookup(
    CartSummaryView,
    Configuration,
    jQuery,
    _
) {
    'use strict';
    /*
        This file does ATP validation on the small cart summary
        and displays an error above the summary if validation fails
    */
    _.extend(CartSummaryView.prototype, {
        events: _.extend(CartSummaryView.prototype.events || {}, {
            'click [id="btn-proceed-checkout"]': 'validateOnlineATP'
        }),
        validateOnlineATP: function validateOnlineATP(e, validated) {
            var self = this;
            var itemsInCart = [];
            this.hideError();
            if (!validated) {
                e.stopPropagation();
                e.preventDefault();
                this.model.get('lines').each(function eachLine(line) {
                    itemsInCart.push(line.get('item').get('internalid'));
                }, this);
                this.model.validateOnlineATP(itemsInCart).done(function doneValidateOnlineATP(invalidQuantity) {
                    if (invalidQuantity.outOfStockItems.length > 0) {
                        self.showError(_(Configuration.onlineatpOutOfStock + '<br>' + invalidQuantity.outOfStockItems.join('<br>')).translate());
                    } else if (invalidQuantity.reduceStockItems.length > 0) {
                        self.showError(_(Configuration.onlineatpReducedStock + '<br>' + invalidQuantity.reduceStockItems.join('<br>')).translate());
                    } else jQuery('#btn-proceed-checkout').trigger('click', true);
                }).fail(function failValidateOnlineATP(err) {
                    console.error(err); //eslint-disable-line
                });
            }
        }
    });
});
define('Header.MiniCart.View.InventoryLookup', [
    'Header.MiniCart.View',
    'LiveOrder.Model',
    'Backbone',
    'jQuery',
    'underscore'
], function HeaderMiniCartViewInventoryLookup(
    HeaderMiniCartView,
    LiveOrderModel,
    Backbone,
    jQuery,
    _
) {
    'use strict';
    /*
        This file does ATP validation on the minicart when clicking Checkout.
        It then redirects to Checkout if validation passes, otherwise to Cart if it fails.
    */
    _.extend(HeaderMiniCartView.prototype, {
        events: _.extend(HeaderMiniCartView.prototype.events || {}, {
            'click [data-touchpoint="checkout"]': 'validateOnlineATP'
        }),
        validateOnlineATP: function validateOnlineATP(e, validated) {
            var itemsInCart = [];
            this.hideError();
            if (!validated) {
                e.stopPropagation();
                e.preventDefault();
                LiveOrderModel.getInstance().get('lines').each(function eachLine(line) {
                    itemsInCart.push(line.get('item').get('internalid'));
                }, this);
                LiveOrderModel.getInstance().validateOnlineATP(itemsInCart).done(function doneValidateOnlineATP(invalidQuantity) {
                    if (invalidQuantity.outOfStockItems.length > 0 || invalidQuantity.reduceStockItems.length > 0) {
                        window.location.href = SC.ENVIRONMENT.siteSettings.touchpoints.viewcart;
                    } else {
                        window.location.href = _.getPathFromObject(SC.CONFIGURATION, 'siteSettings.touchpoints.checkout');
                    }
                }).fail(function failValidateOnlineATP(err) {
                    console.error(err); // eslint-disable-line
                });
            }
        }
    });
});
define('LiveOrder.Model.InventoryLookup', [
    'LiveOrder.Model',
    'Item.Collection',
    'SC.Configuration',
    'jQuery',
    'underscore'
], function LiveOrderModelInventoryLookup(
    LiveOrderModel,
    ItemCollection,
    Configuration,
    jQuery,
    _
) {
    'use strict';
    /*
        LiveOrder valiation used by the mini cart, cart summary view, and cart detailed view
    */
    LiveOrderModel.prototype.validateOnlineATP = function validateOnlineATP(itemsInCart) {
        var self = this;
        var promise = jQuery.Deferred();
        var invalidQuantity = {
            outOfStockItems: [],
            reduceStockItems: []
        };
        
        var itemsToAdd = new ItemCollection();
        itemsToAdd.url = _.addParamsToUrl('/api/items', {
            fieldset: 'details',
            id: _.uniq(itemsInCart).join(',')
        });
        itemsToAdd.fetch().done(function doneFetch(collection) {
            _.each(collection.items, function forEachItem(item) {
                _.each(self.get('lines').models, function forEachLine(line) {
                    if (line.get('item').id === item.internalid && line.get('quantity') > item.custitem_nsts_csic_online_atp
                        && (item.custitem_nsts_csic_web_oos_behavior === 'Disallow backorders but display out-of-stock message'
                        || item.custitem_nsts_csic_web_oos_behavior === 'Remove item when out-of-stock'
                        || item.custitem_nsts_csic_web_oos_behavior === 'ATP based add and remove from web display')) {
                        if (item.custitem_nsts_csic_online_atp <= 0) {
                            invalidQuantity.outOfStockItems.push(line.get('item').get(Configuration.onlineatpItemfield));
                        } else {
                            invalidQuantity.reduceStockItems.push(line.get('item').get(Configuration.onlineatpItemfield)
                                + ', MAX: ' + item.custitem_nsts_csic_online_atp);
                        }
                    }
                });
            });
            promise.resolve(invalidQuantity);
        });
        return promise;
    };
});
define('PickupInStore.View.InventoryLookup', [
    'PickupInStore.View',
    'SC.Configuration',
    'underscore'
],
function PickupInStoreViewInventoryLookup(
    PickupInStoreView,
    Configuration,
    _
) {
    'use strict';
    var viewPrototype = PickupInStoreView.prototype;
    _.extend(viewPrototype, {
        getContext: _.wrap(viewPrototype.getContext, function getContext(fn) {
            var originalResults = fn.apply(this, _.toArray(arguments).slice(1));
            var item = this.model.getItem()
            // console.log('item model', item)
            var onlineATP = item.get('custitem_nsts_csic_online_atp')
            // console.log('online atp', onlineATP);
            // set stockInfo.stock from originalResults to onlineATP value
            originalResults.stockInfo.stock = onlineATP;
            // console.log('new originalResults', originalResults);
            return originalResults;
        })
    });
});
define('Product.Model.InventoryLookup', [
    'Product.Model',
    'SC.Configuration',
    'Backbone',
    'underscore'
],
function ProductModelInventoryLookup(
    ProductModel,
    Configuration,
    Backbone,
    _
) {
    'use strict';
    /*
        Sets product stock message based on OnlineATP and Out-of-Stock behavior settings
    */
    _.extend(ProductModel.prototype, {
        getStockInfo: _.wrap(ProductModel.prototype.getStockInfo, function getStockInfo(fn) {
            var origStockInfo = fn.apply(this, _.toArray(arguments).slice(1));
            if (this.showReducedStockMessage() || this.showWebOutOfStockMessage()) {
                origStockInfo.isInStock = false;
            }
            _.extend(origStockInfo, {
                showQuantityAvailable: this.isSelectionComplete() ? origStockInfo.showQuantityAvailable : false,
                showOutOfStockMessage: this.showWebOutOfStockMessage() ? true : this.showReducedStockMessage(),
                outOfStockMessage: this.showReducedStockMessage() ? this.showReducedStockMessage() : origStockInfo.outOfStockMessage
            });
            return origStockInfo;
        }),
        //TODO: definitely need to move hardcoded values out if possible, for field ids and OOS behavior selection
        showReducedStockMessage: function showReducedStockMessage() {
            var stockMessage;
            var isMatrix = _.some(this.get('options').models, function isMatrix(model) {
                return model.attributes.isMatrixDimension;
            });
            var outOfStockBehavior = isMatrix && this.isSelectionComplete() && this.getSelectedMatrixChilds()[0]
                ? this.getSelectedMatrixChilds()[0].get('custitem_nsts_csic_web_oos_behavior')
                : this.getItem().get('custitem_nsts_csic_web_oos_behavior');
            var onlineATP = isMatrix && this.isSelectionComplete() && this.getSelectedMatrixChilds()[0]
                ? parseFloat(this.getSelectedMatrixChilds()[0].get('custitem_nsts_csic_online_atp'))
                : parseFloat(this.getItem().get('custitem_nsts_csic_online_atp'));
            var quantity = isMatrix && this.isSelectionComplete() && this.getSelectedMatrixChilds()[0]
                ? parseFloat(this.getSelectedMatrixChilds()[0].get('quantity'))
                : parseFloat(this.getItem().get('quantity'));
            if (outOfStockBehavior === 'Allow back orders but display out-of-stock message') {
                stockMessage = Configuration.onlineatpPartialBackOrder;
            }
            else {
                stockMessage = Configuration.onlineatpMaxQuantityExceeded + onlineATP;
            }
            var retVal = onlineATP > 0 && quantity > onlineATP && outOfStockBehavior !== 'Allow back orders with no out-of-stock message' ? stockMessage : false;
            return retVal;
        },
        showWebOutOfStockMessage: function showWebOutOfStockMessage() {
            var onlineATP;
            var outOfStockBehavior;
            var isMatrix = _.some(this.getItem().get('options').models, function isMatrix(model) {
                return model.attributes.isMatrixDimension;
            });
            var matrixChildren = this.getSelectedMatrixChilds();
            var itemDetail = this.getItem();
            var retVal;
            
            // If selection is complete, there'll be only one matrix child.
            if (this.isSelectionComplete()) {
                outOfStockBehavior = isMatrix && matrixChildren && matrixChildren.length
                    ? matrixChildren[0].get('custitem_nsts_csic_web_oos_behavior')
                    : itemDetail.get('custitem_nsts_csic_web_oos_behavior');
                onlineATP = isMatrix && matrixChildren && matrixChildren.length
                    ? parseFloat(matrixChildren[0].get('custitem_nsts_csic_online_atp'))
                    : parseFloat(itemDetail.get('custitem_nsts_csic_online_atp'));
                retVal = outOfStockBehavior !== 'Allow back orders with no out-of-stock message' && onlineATP <= 0;
                return retVal;
            }
            if (isMatrix && matrixChildren.length === 0) {
                // If matrix item with length 0
                // True if online atp <= 0 and oos is not equal to 'Allow back orders with no out-of-stock message', false otherwise
                retVal =  parseFloat(itemDetail.get('custitem_nsts_csic_online_atp')) <= 0 && itemDetail.get('custitem_nsts_csic_web_oos_behavior') !== 'Allow back orders with no out-of-stock message'
            } else {
                // All other items (matrix with length > 0, standalone items)
                // True if list.length and all matrix childs.length are equal & oos is not 'Allow back orders with no out-of-stock message', false otherwise
                var childrenwithATP = _.reject(matrixChildren, function rejectMatrixChild(child) {
                    // Returns matrix childs with atp not equal to zero
                    return parseFloat(child.get('custitem_nsts_csic_online_atp')) !== 0;
                });
                
                retVal = childrenwithATP.length === matrixChildren.length && itemDetail.get('custitem_nsts_csic_web_oos_behavior') !== 'Allow back orders with no out-of-stock message';
            }
            return retVal;
        }
    });
});
define('CampusStores.InventoryLookup.Shopping', [
    'Cart.AddToCart.Button.View.InventoryLookup',
    'Cart.Detailed.View.InventoryLookup',
    'Cart.Summary.View.InventoryLookup',
    'Header.MiniCart.View.InventoryLookup',
    'LiveOrder.Model.InventoryLookup',
    'Product.Model.InventoryLookup',
    'PickupInStore.View.InventoryLookup'
], function CampusStoresInventoryLookupShopping() {
    'use strict';
    return {
        mountToApp: function mountToApp(container) { // eslint-disable-line
        }
    };
});
};
extensions['SuiteCommerce.ItemBadges.1.1.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/ItemBadges/1.1.4/' + asset;
};
define('SuiteCommerce.ItemBadges.Configuration', [], function Configuration() {
  'use strict';
  return {
    environment: null,
    initialize: function initialize(application)
    {
      this.environment = application.getComponent('Environment');
    },
    get: function get(name) {
      if (this.environment) {
        return this.environment.getConfig(name);
      }
      return null;
    }
  }
});
define('SuiteCommerce.ItemBadges.Instrumentation.FallbackLogger', [
  'Url',
  'jQuery'
], function define(
  Url,
  $
) {
  'use strict';
  var instance = null;
  var environment = null;
  function FallbackLogger() {
    var queueErrorTemp = [];
    var queueInfoTemp = [];
    var QUEUE_NAME_SUFFIX = '-ItemBadges';
    var QUEUE_ERROR_NAME = 'queueError' + QUEUE_NAME_SUFFIX;
    var QUEUE_INFO_NAME = 'queueInfo' + QUEUE_NAME_SUFFIX;
    var isWaiting = false;
    var self = this;
    if (this instanceof FallbackLogger) {
      throw new Error('Is not possible to create a new Logger. Please use getLogger method instead.');
    }
    this.isEnabled = function isEnabled() {
      return environment && !environment.isPageGenerator();
    };
    function clearQueues() {
      localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueErrorTemp));
      localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfoTemp));
      queueErrorTemp.length = 0;
      queueInfoTemp.length = 0;
      isWaiting = false;
    }
    function appendTemp() {
      var queueError = localStorage.getItem(QUEUE_ERROR_NAME);
      var queueInfo = localStorage.getItem(QUEUE_INFO_NAME);
      if (queueErrorTemp.length > 0) {
        queueError = queueError == null ? [] : JSON.parse(queueError);
        localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueError.concat(queueErrorTemp)));
      }
      if (queueInfoTemp.length > 0) {
        queueInfo = queueInfo == null ? [] : JSON.parse(queueInfo);
        localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfo.concat(queueInfoTemp)));
      }
      isWaiting = false;
    }
    function sendDataThroughUserAgent(url, data) {
      var successfullyTransfer = navigator.sendBeacon(url, JSON.stringify(data));
      if (successfullyTransfer) clearQueues();
      else appendTemp();
    }
    function sendDataThroughAjaxRequest(url, data, isAsync) {
      $.ajax({
        type: 'POST',
        url: url,
        data: JSON.stringify(data),
        async: isAsync
      }).success(clearQueues)
        .fail(appendTemp);
    }
    // eslint-disable-next-line complexity
    function processQueues(isAsync) {
      if (!self.isEnabled()) {
        return;
      }
      var data;
      var parsedURL = new Url().parse(SC.ENVIRONMENT.baseUrl);
      var product = SC.ENVIRONMENT.BuildTimeInf.product;
      var URL = parsedURL.schema + '://'
        + parsedURL.netLoc + '/app/site/hosting/scriptlet.nl?script=customscript_'
        + product.toLowerCase() + '_loggerendpoint&deploy=customdeploy_'
        + product.toLowerCase() + '_loggerendpoint';
      var queueError = JSON.parse(localStorage.getItem(QUEUE_ERROR_NAME));
      var queueInfo = JSON.parse(localStorage.getItem(QUEUE_INFO_NAME));
      if ((queueInfo && queueInfo.length > 0) || (queueError && queueError.length > 0)) {
        isWaiting = true;
        data = { type: product, info: queueInfo, error: queueError };
        if (navigator.sendBeacon) {
          sendDataThroughUserAgent(URL, data);
        } else {
          sendDataThroughAjaxRequest(URL, data, isAsync);
        }
      }
    }
    this.info = function info(obj) {
      var objWrapper = obj;
      var queueInfo;
      if (!this.isEnabled()) {
        return;
      }
      objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
      objWrapper.message = 'clientSideLogDateTime: ' + (new Date()).toISOString();
      if (isWaiting) {
        queueInfoTemp.push(objWrapper);
      } else {
        queueInfo = JSON.parse(localStorage.getItem(QUEUE_INFO_NAME)) || [];
        queueInfo.push(objWrapper);
        localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfo));
      }
    };
    this.error = function error(obj) {
      var queueError;
      var objWrapper = obj;
      if (!this.isEnabled()) {
        return;
      }
      objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
      objWrapper.message = 'clientSideLogDateTime: ' + (new Date()).toISOString();
      if (isWaiting) {
        queueErrorTemp.push(objWrapper);
      } else {
        queueError = JSON.parse(localStorage.getItem(QUEUE_ERROR_NAME)) || [];
        queueError.push(objWrapper);
        localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueError));
      }
    };
    if (!this.isEnabled()) {
      return this;
    }
    setInterval(function setInterval() {
      processQueues(true);
    }, 60000);
    window.addEventListener('beforeunload', function addListener() {
      processQueues(false);
    });
    return this;
  }
  FallbackLogger.getLogger = function getLogger(localEnvironment) {
    environment=localEnvironment;
    instance = instance || FallbackLogger.apply({});
    return instance;
  };
  return FallbackLogger;
});
define(
  'SuiteCommerce.ItemBadges.Instrumentation.MockAppender', [],
  function define() {
    'use strict';
    return  {
     info : function info(data) {
        console.info('MockAppender - Info', data);
      },
      error : function error(data) {
        console.error('MockAppender - Error', data);
      },
      ready : function ready() {
        return true;
      },
      getInstance : function getInstance() {
        if (!this.instance) {
          this.instance = this;
        }
        return this.instance;
      },
      start : function start(action, options) {
        return options;
      },
      end : function end(startOptions, options) {}
    };
  });
define(
  'SuiteCommerce.ItemBadges.Instrumentation.Collection',
  [
    'SuiteCommerce.ItemBadges.Instrumentation.Model',
    'underscore',
    'Backbone'
  ],
  function define(
    model,
    _,
    Backbone
  ) {
    'use strict';
    return Backbone.Collection.extend({
      model: model
    });
  }
);
define(
  'SuiteCommerce.ItemBadges.Instrumentation.Model',
  [
    'SuiteCommerce.ItemBadges.Instrumentation.Logger',
    'Backbone',
    'underscore'
  ],
  function define(
    Logger,
    Backbone,
    _
  ) {
    'use strict';
    var DEFAULT_SEVERITY = 'info';
    return Backbone.Model.extend({
      defaults: function defaults() {
        return {
          parametersToSubmit: {},
          timer: {},
          severity: DEFAULT_SEVERITY
        };
      },
      startTimer: function startTimer() {
        var startTime = this.getTimestamp();
        var timer = this.get('timer');
        timer.startTime = startTime;
        this.set('timer', timer);
      },
      endTimer: function endTimer() {
        var endTime = this.getTimestamp();
        var timer = this.get('timer');
        timer.endTime = endTime;
        this.set('timer', timer);
      },
      getTimestamp: function getTimestamp() {
        if (!this.isOldInternetExplorer()) {
          return performance.now() || Date.now();
        }
        return Date.now();
      },
      getElapsedTimeForTimer: function getElapsedTimeForTimer() {
        var timer = this.get('timer');
        if (timer.startTime && timer.endTime) {
          if (timer.startTime > timer.endTime) {
            console.warn('Start time should be minor that end time in timer');
            return null;
          }
          return timer.endTime - timer.startTime;
        }
        if (!timer.startTime) console.warn('The Start time is not defined');
        if (!timer.endTime) console.warn('The End time is not defined');
        return null;
      },
      setParametersToSubmit: function setParametersToSubmit(data) {
        var self = this;
        _.each(data, function setLogParameter(value, parameter) {
          self.setParameterToSubmit(parameter, data[parameter]);
        });
      },
      setParameterToSubmit: function setParameterToSubmit(parameter, value) {
        var logData = this.get('parametersToSubmit');
        logData[parameter] = value;
        this.set('parametersToSubmit', logData);
      },
      setSeverity: function setSeverity(severity) {
        this.set('severity', severity);
      },
      submit: function submit() {
        if (!this.isOldInternetExplorer()) {
          switch (this.get('severity')) {
            case 'error':
              this.submitAsError();
              break;
            default:
              this.submitAsInfo();
          }
        }
      },
      isOldInternetExplorer: function isOldInternetExplorer() {
        return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
      },
      submitAsError: function submitAsError() {
        Logger.getLogger().error(this.get('parametersToSubmit'));
      },
      submitAsInfo: function submitAsInfo() {
        Logger.getLogger().info(this.get('parametersToSubmit'));
      }
    });
  }
);
define(
  'SuiteCommerce.ItemBadges.Instrumentation.InstrumentationHelper',
  [
    'SuiteCommerce.ItemBadges.Instrumentation.Model',
    'SuiteCommerce.ItemBadges.Instrumentation.Collection',
    'SuiteCommerce.ItemBadges.Instrumentation.Logger'
  ],
  function define(
    Log,
    LogCollection,
    Logger
  ) {
    'use strict';
    var logs = new LogCollection();
    return {
      logs: logs,
      initialize: function initialize(container) {
        Logger.initialize(container.getComponent('Environment'));
      },
      getLog: function getLog(logLabel) {
        return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
      },
      getLogModelByLabel: function getLogModelByLabel(label) {
        return this.logs.findWhere({
          label: label
        });
      },
      registerNewLog: function registerNewLog(label) {
        var log = new Log();
        log.set('label', label);
        this.logs.add(log);
        return log;
      },
      setParameterToSubmitForAllLogs: function setParameterToSubmitForAllLogs(parameter, value) {
        this.logs.each(function updateLog(log) {
          log.setParameterToSubmit(parameter, value);
        });
      },
      setParametersToSubmitForAllLogs: function setParametersToSubmitForAllLogs(data) {
        this.logs.each(function updateLog(log) {
          log.setParametersToSubmit(data);
        });
      },
      submitAllLogs: function submitAllLogs() {
        this.logs.each(function submitLog(log) {
          log.submit();
        });
      }
    };
  }
);
define(
  'SuiteCommerce.ItemBadges.Instrumentation.Logger',
  [
    'SuiteCommerce.ItemBadges.Instrumentation.FallbackLogger',
    'SuiteCommerce.ItemBadges.Instrumentation.MockAppender'
  ], function define(
    InstrumentationFallbackLogger,
    InstrumentationMockAppender
  ) {
    'use strict';
    var environment = null;
    var instance = null;
    var QUEUE_NAME_SUFFIX = '-ItemBadges';
    return {
      initialize: function initialize(localEnvironment) {
        environment = localEnvironment;
      },
      getLogger: function getLogger() {
        instance = instance || this.buildLoggerInstance();
        return instance;
      },
      buildLoggerInstance: function buildLoggerInstance() {
        var logConfig = {};
        try {
          var LoggersModule = require('Loggers').Loggers;
          var elasticAppender = require('Loggers.Appender.ElasticLogger')
            .LoggersAppenderElasticLogger.getInstance();
          var mockAppender = InstrumentationMockAppender.getInstance();
          var configurationModule = require('Loggers.Configuration');
          var loggerName = 'CommerceExtensions' + QUEUE_NAME_SUFFIX;
          logConfig[loggerName] = {
            log: [
              { profile: configurationModule.prod, appenders: [elasticAppender] },
              { profile: configurationModule.dev, appenders: [mockAppender] },
            ],
            actions: {},
            loggers: {},
          };
          LoggersModule.setConfiguration(logConfig);
          return LoggersModule.getLogger(loggerName);
        } catch (e) {
          return InstrumentationFallbackLogger.getLogger(environment);
        }
      },
    };
  });
define('SuiteCommerce.ItemBadges.BadgesList.View', [
  'Backbone',
  'itembadges_list.tpl',
  'itembadges_svg_bookmark.tpl',
  'itembadges_svg_diagonal_banner.tpl',
  'itembadges_svg_flag.tpl',
  'itembadges_svg_rectangle_banner.tpl',
  'itembadges_svg_tag.tpl',
  'itembadges_svg_tapered_banner.tpl'
], function ItemBadgesBadgesListView(
  Backbone,
  itembadgesListTpl,
  bookmark,
  diagonalBanner,
  flag,
  rectangleBanner,
  tag,
  taperedBanner
) {
  'use strict';
  return Backbone.View.extend({
    template: itembadgesListTpl,
    initialize: function initialize(options) {
      this.model = options.model;
      this.position = options.position;
      this.currentView = options.currentView;
    },
    calculateWeight: function calculateWeight() {
      var weight = this.model.get('weight');
      switch (weight) {
        case '1':
          this.model.set('textWeight', '300');
          break;
        case '2':
          this.model.set('textWeight', '400');
          break;
        case '3':
          this.model.set('textWeight', '600');
          break;
        case '4':
          this.model.set('textWeight', '700');
          break;
        default:
          this.model.set('textWeight', '400');
      }
    },
    selectTemplate: function selectTemplate() {
      var modifier = this.model.get('text').length * 8;
      var padding = this.currentView === 'plp' ? 5 : 10;
      var totalPadding = padding * 2;
      switch (this.model.get('shape').shape) {
        case 'Bookmark':
          this.defineBookmark(totalPadding, modifier);
          break;
        case 'Diagonal Banner':
          this.defineDiangonalBanner();
          break;
        case 'Flag':
          this.defineFlag(totalPadding, modifier);
          break;
        case 'Rectangle Banner':
          this.defineRectangleBanner(totalPadding, modifier);
          break;
        case 'Tag':
          this.defineTag(totalPadding, modifier);
          break;
        case 'Tapered Banner':
          this.defineTaperedBanner(totalPadding, modifier);
          break;
        default:
          if (!this.model.get('shape').image) {
            this.defineRectangleBanner(totalPadding, modifier);
          }
      }
    },
    defineBookmark: function defineBookmark(totalPadding, modifier) {
      var textSpace = totalPadding + modifier;
      var shape = this.calculateBookmarkShape(textSpace);
      this.model.set('svg',
        {
          width: textSpace + 34.5,
          shape: shape,
          textEnd: this.currentView === 'plp' ? textSpace : textSpace - 10,
          textStart: this.currentView === 'plp' ? 30 : 40,
          height: this.currentView === 'plp' ? 54 : 64
        });
      this.template = bookmark;
    },
    calculateBookmarkShape: function calculateBookmarkShape(textSpace) {
      var plpModifier = this.currentView === 'plp' ? 10 : 0;
      if (this.position.match('right')) {
        return 'M' + (textSpace + 1 + plpModifier) + ',0 L' + (textSpace + 1 + plpModifier) + ','+(62-plpModifier)+' L' + (textSpace + 18 + (plpModifier/2)) + ','+(55-plpModifier)+' L' + (textSpace + 35.5) + ','+(62-plpModifier)+' L' + (textSpace + 35.5) + ',0 L' + (textSpace + 79) + ',0 Z';
      }
      return 'M1,0 L1,'+(62-plpModifier)+' L'+(18-(plpModifier/2))+','+(55-plpModifier)+' L'+(35.5-(plpModifier))+','+(62-plpModifier)+' L'+(35.5-(plpModifier))+',0 L79,0 Z';
    },
    defineDiangonalBanner: function defineDiangonalBanner() {
      this.model.set('svg',
        {
          textCenter: this.currentView === 'plp' ? 18 : 23,
          height: this.currentView === 'plp' ? 25 : 35
        });
      this.template = diagonalBanner;
    },
    defineFlag: function defineFlag(totalPadding, modifier) {
      var additionalPixels = 7.5;
      var totalPixels = totalPadding + additionalPixels;
      var width = totalPixels + modifier;
      var textMiddle = this.calculateTextMiddle(totalPadding, modifier, additionalPixels);
      var textHeight = this.currentView === 'plp' ? 16.75 : 21.75;
      this.model.set('svg',
        {
          shape: 'M0,0 L' + (totalPixels + modifier) + ',0 L' + (totalPadding + modifier) + ','+(7.5+(totalPadding/2))+' L' + (totalPixels + modifier) + ','+(15+totalPadding)+' L0,'+(15+totalPadding)+' Z',
          width: width,
          textMiddle: textMiddle,
          textHeight: textHeight,
          height: totalPadding + 15
        });
      this.template = flag;
    },
    defineRectangleBanner: function defineRectangleBanner(totalPadding, modifier) {
      var width = totalPadding + modifier;
      var textMiddle = this.calculateTextMiddle(totalPadding, modifier);
      var textHeight = this.currentView === 'plp' ? 16.75 : 21.75;
      this.model.set('svg',
        {
          width: width,
          textMiddle: textMiddle,
          textHeight: textHeight,
          height: totalPadding + 15
        });
      this.template = rectangleBanner;
    },
    defineTag: function defineTag(totalPadding, modifier) {
      var additionalPixels = 14;
      var totalPixels = totalPadding + additionalPixels;
      var width = totalPixels + modifier;
      var textMiddle = this.calculateTextMiddle(totalPadding, modifier, additionalPixels);
      var textHeight = this.currentView === 'plp' ? 16.75 : 21.75;
      this.model.set('svg',
        {
          shape: 'M' + (totalPadding + modifier) + ',0 L' + (totalPixels + modifier) + ','+(7.5+(totalPadding/2))+' L' + (totalPadding + modifier) + ','+(15+totalPadding)+' L0,'+(15+totalPadding)+' L0,0 L' + (totalPadding + modifier) + ',0 Z',
          width: width,
          textMiddle: textMiddle,
          textHeight: textHeight,
          height: totalPadding + 15
        });
      this.template = tag;
    },
    defineTaperedBanner: function defineTaperedBanner(totalPadding, modifier) {
      var additionalPixels = 13;
      var totalPixels = totalPadding + additionalPixels;
      var width = totalPixels + modifier;
      var textMiddle = this.calculateTextMiddle(totalPadding, modifier, additionalPixels);
      var textHeight = this.currentView === 'plp' ? 16.75 : 21.75;
      this.model.set('svg',
        {
          shape: 'M0,0 L' + (totalPixels + modifier) + ',0 L' + (totalPadding + modifier) + ','+(15+totalPadding)+' L0,'+(15+totalPadding)+' Z',
          width: width,
          textMiddle: textMiddle,
          textHeight: textHeight,
          height: totalPadding + 15
        });
      this.template = taperedBanner;
    },
    calculateTextMiddle: function calculateTextMiddle(totalPadding, modifier, additionalPixels) {
      if (this.position.match('right') && additionalPixels) {
        return additionalPixels + ((totalPadding + modifier) / 2);
      }
      return (totalPadding + modifier) / 2;
    },
    flipVertical: function flipVertical() {
      return !!this.position.match('right');
    },
    getContext: function getContext() {
      var showText = !!this.model.get('text');
      var showImage = !!this.model.get('shape').image;
      this.selectTemplate();
      this.calculateWeight();
      return {
        model: this.model,
        name: this.model.get('name'),
        alt: this.model.get('alt'),
        showText: showText,
        text: this.model.get('text'),
        textColor: this.model.get('color') || '#FFFFFF',
        textBgColor: this.model.get('background'),
        textWeight: this.model.get('textWeight'),
        showImage: showImage,
        shapeId: this.model.get('shape').id,
        shapeName: this.model.get('shape').name,
        shapeImage: this.model.get('shape').image,
        areBothElementsVisibile: showText && showImage,
        svg: this.model.get('svg'),
        position: this.position,
        flipVertical: this.flipVertical(),
        isPlp: this.currentView === 'plp'
      };
    }
  });
});
define('SuiteCommerce.ItemBadges.Collection', [
  'Backbone',
  'Backbone.CachedCollection',
  'SuiteCommerce.ItemBadges.Model',
  'underscore'
], function ItemBadgesCollection(
  Backbone,
  BackboneCachedCollection,
  Model,
  _
) {
  'use strict';
  return BackboneCachedCollection.extend({
    model: Model,
    url: '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_sl_itembadges&deploy=customdeploy_ns_sc_sl_itembadges',
    filterBadges: function filterBadges(badges) {
      var self = this;
      var itemBadges;
      var data;
      if (badges) {
        itemBadges = badges.split(',');
        _.each(itemBadges, function each(value, key) {
          itemBadges[key] = value.trim();
        });
        data = _.filter(self.models, function filter(badge) {
          return _.contains(itemBadges, badge.get('name').trim());
        });
      }
      return new Backbone.Collection(data);
    }
  });
});
define('SuiteCommerce.ItemBadges.GlobalViews', [
  'SuiteCommerce.ItemBadges.View'
], function ItemBadgesGlobalViews(
  ItemBadgesView
) {
  'use strict';
  return {
    loadGlobalViewsItemBadges: function loadGlobalViewsItemBadges(application, collection) {
      var layout = application.getComponent('Layout');
      this.addGlobalViewsChildViews(layout, collection);
    },
    addGlobalViewsChildViews: function addGlobalViewsChildViews(layout, collection) {
      layout.addChildView(
        'Item.Price',
        function childViewConstructor() {
          return new ItemBadgesView({
            view: 'global',
            collection: collection
          });
        }
      );
    }
  };
});
define('SuiteCommerce.ItemBadges.Model', [
  'Backbone.CachedModel'
], function ItemBadgesModel(
  CachedModel
) {
  'use strict';
  return CachedModel.extend({
  });
});
define('SuiteCommerce.ItemBadges.ProductDetail', [
  'SuiteCommerce.ItemBadges.View'
], function ItemBadgesProductDetail(
  ItemBadgesView
) {
  'use strict';
  return {
    loadProductDetailItemBadges: function loadProductDetailItemBadges(application, collection) {
      var pdp = application.getComponent('PDP');
      this.addProductDetailChildViews(pdp, collection);
    },
    addProductDetailChildViews: function addProductDetailChildViews(pdp, collection) {
      pdp.addChildViews(
        pdp.PDP_FULL_VIEW, {
          'Product.ImageGallery': {
            'Itembadges.View': {
              childViewIndex: 5,
              childViewConstructor: function childViewConstructor() {
                return new ItemBadgesView({
                  view: 'pdp',
                  items: pdp.getItemInfo(),
                  collection: collection
                });
              }
            }
          }
        }
      );
      pdp.addChildViews(
        pdp.PDP_QUICK_VIEW, {
          'Product.ImageGallery': {
            'Itembadges.View': {
              childViewIndex: 5,
              childViewConstructor: function childViewConstructor() {
                return new ItemBadgesView({
                  view: 'pdp',
                  items: pdp.getItemInfo(),
                  collection: collection
                });
              }
            }
          }
        }
      );
    }
  };
});
define('SuiteCommerce.ItemBadges.ProductList', [
  'SuiteCommerce.ItemBadges.View'
], function ItemBadgesProductList(
  ItemBadgesView
) {
  'use strict';
  return {
    loadProductListItemBadges: function loadPDPItemBadges(application, collection) {
      var plp = application.getComponent('PLP');
      this.addProductListChildViews(plp, collection);
    },
    addProductListChildViews: function addProductListChildViews(plp, collection) {
      plp.addChildViews(
        plp.PLP_VIEW, {
          'ItemDetails.Options': {
            'Itembadges.View': {
              childViewIndex: 5,
              childViewConstructor: function childViewConstructor() {
                return new ItemBadgesView({
                  view: 'plp',
                  collection: collection
                });
              }
            }
          }
        }
      );
    }
  };
});
define('SuiteCommerce.ItemBadges.View', [
  'Backbone',
  'Backbone.CollectionView',
  'SuiteCommerce.ItemBadges.BadgesList.View',
  'SuiteCommerce.ItemBadges.Configuration',
  'underscore',
  'itembadges_view.tpl',
  'SuiteCommerce.ItemBadges.Instrumentation.InstrumentationHelper'
], function ItemBadgesView(
  Backbone,
  BackboneCollectionView,
  ItemBadgesbadgesListView,
  Configuration,
  _,
  itembadgesViewTpl,
  InstrumentationHelper
) {
  'use strict';
  return Backbone.View.extend({
    template: itembadgesViewTpl,
    contextDataRequest: ['item'],
    initialize: function initialize(options) {
      var self = this;
      this.items = options.items;
      this.collection = options.collection;
      this.currentView = options.view;
      this.position = Configuration.get('itemBadges').position.toLowerCase().replace(/\s/, '-');
      _.defer(function deferedRender() {
        self.registerInstrumentationLog();
        self.render();
      });
    },
    registerInstrumentationLog: function registerInstrumentationLog() {
      var instrumentationLog;
      var activity;
      if (this.badgeCollection.length) {
        switch (this.currentView) {
          case 'pdp':
            activity = 'Item badges loaded on PDP';
            break;
          case 'plp':
            activity = 'Item badges loaded on PLP';
            break;
          default:
        }
        instrumentationLog = InstrumentationHelper.getLog('instrumentationLog');
        instrumentationLog.setParametersToSubmit({
          componentArea: 'SC Item Badges',
          activity: activity,
          quantity: this.badgeCollection.length
        });
        instrumentationLog.submit();
      }
    },
    getContext: function getContext() {
      var itemBadges;
      var item;
      var showBadges;
      var hasThumbnailListAside;
      switch (this.currentView) {
        case 'pdp':
          showBadges = this.items.item.custitem_ns_ib_show_badges;
          itemBadges = this.items.item.custitem_ns_ib_badges;
          hasThumbnailListAside = Configuration.get('manor');
          break;
        default:
          item = this.contextData.item();
          showBadges = item.custitem_ns_ib_show_badges;
          itemBadges = item.custitem_ns_ib_badges;
      }
      if (itemBadges && itemBadges.split(',').length >= 3) {
        itemBadges = itemBadges.split(',').slice(0, 3) + '';
      }
      this.badgeCollection = this.collection.filterBadges(itemBadges || false);
      return {
        hasBadges: showBadges && !!this.badgeCollection,
        position: this.position,
        hasThumbnailListAside: !!hasThumbnailListAside
      };
    },
    childViews: {
      'Itembadges.List.View': function ItembadgesListView() {
        return new BackboneCollectionView({
          collection: this.badgeCollection,
          childView: ItemBadgesbadgesListView,
          childViewOptions: {
            currentView: this.currentView,
            position: this.position
          }
        });
      }
    }
  });
});
define('SuiteCommerce.ItemBadges.EntryPoint', [
  'SuiteCommerce.ItemBadges.Collection',
  'SuiteCommerce.ItemBadges.ProductDetail',
  'SuiteCommerce.ItemBadges.ProductList',
  'SuiteCommerce.ItemBadges.GlobalViews',
  'SuiteCommerce.ItemBadges.Instrumentation.InstrumentationHelper',
  'SuiteCommerce.ItemBadges.Configuration'
], function ItemBadgesEntryPoint(
  ItemBadgesCollection,
  ItemBadgesProductDetail,
  ItemBadgesProductList,
  ItemBadgesGlobalViews,
  InstrumentationHelper,
  Configuration
) {
  'use strict';
  return {
    mountToApp: function mountToApp(application) {
      var log = InstrumentationHelper.initialize(application);
      Configuration.initialize(application);
      var collection = new ItemBadgesCollection();
      var collectionPromise;
      ItemBadgesProductDetail.loadProductDetailItemBadges(application, collection);
      ItemBadgesProductList.loadProductListItemBadges(application, collection);
      ItemBadgesGlobalViews.loadGlobalViewsItemBadges(application, collection);
      collectionPromise = collection.fetch();
      this.registerFetchTimer(collectionPromise);
    },
    registerFetchTimer: function registerFetchTimer(collectionPromise) {
      var fetchTimer = InstrumentationHelper.getLog('fetchTimer');
      fetchTimer.startTimer();
      collectionPromise.done(function promiseDone() {
        fetchTimer.endTimer();
        fetchTimer.setParametersToSubmit({
          componentArea: 'SC Item Badges',
          activity: 'Fetch Timer',
          totalTime: fetchTimer.getElapsedTimeForTimer()
        });
        fetchTimer.submit();
      });
    }
  };
});
};
extensions['NetSuite.LogoList.1.1.0'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/NetSuite/LogoList/1.1.0/' + asset;
};
define('jQuery.bxSlider@4.2.14', ['jQuery'], function () {
  ;(function($) {
    var defaults = {
      // GENERAL
      mode: 'horizontal',
      slideSelector: '',
      infiniteLoop: true,
      hideControlOnEnd: false,
      speed: 500,
      easing: null,
      slideMargin: 0,
      startSlide: 0,
      randomStart: false,
      captions: false,
      ticker: false,
      tickerHover: false,
      adaptiveHeight: false,
      adaptiveHeightSpeed: 500,
      video: false,
      useCSS: true,
      preloadImages: 'visible',
      responsive: true,
      slideZIndex: 50,
      wrapperClass: 'bx-wrapper',
      // TOUCH
      touchEnabled: true,
      swipeThreshold: 50,
      oneToOneTouch: true,
      preventDefaultSwipeX: true,
      preventDefaultSwipeY: false,
      // ACCESSIBILITY
      ariaLive: true,
      ariaHidden: true,
      // KEYBOARD
      keyboardEnabled: false,
      // PAGER
      pager: true,
      pagerType: 'full',
      pagerShortSeparator: ' / ',
      pagerSelector: null,
      buildPager: null,
      pagerCustom: null,
      // CONTROLS
      controls: true,
      nextText: 'Next',
      prevText: 'Prev',
      nextSelector: null,
      prevSelector: null,
      autoControls: false,
      startText: 'Start',
      stopText: 'Stop',
      autoControlsCombine: false,
      autoControlsSelector: null,
      // AUTO
      auto: false,
      pause: 4000,
      autoStart: true,
      autoDirection: 'next',
      stopAutoOnClick: false,
      autoHover: false,
      autoDelay: 0,
      autoSlideForOnePage: false,
      // CAROUSEL
      minSlides: 1,
      maxSlides: 1,
      moveSlides: 0,
      slideWidth: 0,
      shrinkItems: false,
      // CALLBACKS
      onSliderLoad: function() { return true; },
      onSlideBefore: function() { return true; },
      onSlideAfter: function() { return true; },
      onSlideNext: function() { return true; },
      onSlidePrev: function() { return true; },
      onSliderResize: function() { return true; },
      onAutoChange: function() { return true; } //calls when auto slides starts and stops
    };
    $.fn.bxSliderNew = function(options) {
      if (this.length === 0) {
        return this;
      }
      // support multiple elements
      if (this.length > 1) {
        this.each(function() {
          $(this).bxSliderNew(options);
        });
        return this;
      }
      // create a namespace to be used throughout the plugin
      var slider = {},
        // set a reference to our slider element
        el = this,
        // get the original window dimens (thanks a lot IE)
        windowWidth = $(window).width(),
        windowHeight = $(window).height();
      // Return if slider is already initialized
      if ($(el).data('bxSlider')) { return; }
      /**
       * ===================================================================================
       * = PRIVATE FUNCTIONS
       * ===================================================================================
       */
      /**
       * Initializes namespace settings to be used throughout plugin
       */
      var init = function() {
        // Return if slider is already initialized
        if ($(el).data('bxSlider')) { return; }
        // merge user-supplied options with the defaults
        slider.settings = $.extend({}, defaults, options);
        // parse slideWidth setting
        slider.settings.slideWidth = parseInt(slider.settings.slideWidth);
        // store the original children
        slider.children = el.children(slider.settings.slideSelector);
        // check if actual number of slides is less than minSlides / maxSlides
        if (slider.children.length < slider.settings.minSlides) { slider.settings.minSlides = slider.children.length; }
        if (slider.children.length < slider.settings.maxSlides) { slider.settings.maxSlides = slider.children.length; }
        // if random start, set the startSlide setting to random number
        if (slider.settings.randomStart) { slider.settings.startSlide = Math.floor(Math.random() * slider.children.length); }
        // store active slide information
        slider.active = { index: slider.settings.startSlide };
        // store if the slider is in carousel mode (displaying / moving multiple slides)
        slider.carousel = slider.settings.minSlides > 1 || slider.settings.maxSlides > 1;
        // if carousel, force preloadImages = 'all'
        if (slider.carousel) { slider.settings.preloadImages = 'all'; }
        // calculate the min / max width thresholds based on min / max number of slides
        // used to setup and update carousel slides dimensions
        slider.minThreshold = (slider.settings.minSlides * slider.settings.slideWidth) + ((slider.settings.minSlides - 1) * slider.settings.slideMargin);
        slider.maxThreshold = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
        // store the current state of the slider (if currently animating, working is true)
        slider.working = false;
        // initialize the controls object
        slider.controls = {};
        // initialize an auto interval
        slider.interval = null;
        // determine which property to use for transitions
        slider.animProp = slider.settings.mode === 'vertical' ? 'top' : 'left';
        // determine if hardware acceleration can be used
        slider.usingCSS = slider.settings.useCSS && slider.settings.mode !== 'fade' && (function() {
          // create our test div element
          var div = document.createElement('div'),
            // css transition properties
            props = ['WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
          // test for each property
          for (var i = 0; i < props.length; i++) {
            if (div.style[props[i]] !== undefined) {
              slider.cssPrefix = props[i].replace('Perspective', '').toLowerCase();
              slider.animProp = '-' + slider.cssPrefix + '-transform';
              return true;
            }
          }
          return false;
        }());
        // if vertical mode always make maxSlides and minSlides equal
        if (slider.settings.mode === 'vertical') { slider.settings.maxSlides = slider.settings.minSlides; }
        // save original style data
        el.data('origStyle', el.attr('style'));
        el.children(slider.settings.slideSelector).each(function() {
          $(this).data('origStyle', $(this).attr('style'));
        });
        // perform all DOM / CSS modifications
        setup();
      };
      /**
       * Performs all DOM and CSS modifications
       */
      var setup = function() {
        var preloadSelector = slider.children.eq(slider.settings.startSlide); // set the default preload selector (visible)
        // wrap el in a wrapper
        el.wrap('<div class="' + slider.settings.wrapperClass + '"><div class="bx-viewport"></div></div>');
        // store a namespace reference to .bx-viewport
        slider.viewport = el.parent();
        // add aria-live if the setting is enabled and ticker mode is disabled
        if (slider.settings.ariaLive && !slider.settings.ticker) {
          slider.viewport.attr('aria-live', 'polite');
        }
        // add a loading div to display while images are loading
        slider.loader = $('<div class="bx-loading" />');
        slider.viewport.prepend(slider.loader);
        // set el to a massive width, to hold any needed slides
        // also strip any margin and padding from el
        el.css({
          width: slider.settings.mode === 'horizontal' ? (slider.children.length * 1000 + 215) + '%' : 'auto',
          position: 'relative'
        });
        // if using CSS, add the easing property
        if (slider.usingCSS && slider.settings.easing) {
          el.css('-' + slider.cssPrefix + '-transition-timing-function', slider.settings.easing);
          // if not using CSS and no easing value was supplied, use the default JS animation easing (swing)
        } else if (!slider.settings.easing) {
          slider.settings.easing = 'swing';
        }
        // make modifications to the viewport (.bx-viewport)
        slider.viewport.css({
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        });
        slider.viewport.parent().css({
          maxWidth: getViewportMaxWidth()
        });
        // apply css to all slider children
        slider.children.css({
          // the float attribute is a reserved word in compressors like YUI compressor and need to be quoted #48
          'float': slider.settings.mode === 'horizontal' ? 'left' : 'none',
          listStyle: 'none',
          position: 'relative'
        });
        // apply the calculated width after the float is applied to prevent scrollbar interference
        slider.children.css('width', getSlideWidth());
        // if slideMargin is supplied, add the css
        if (slider.settings.mode === 'horizontal' && slider.settings.slideMargin > 0) { slider.children.css('marginRight', slider.settings.slideMargin); }
        if (slider.settings.mode === 'vertical' && slider.settings.slideMargin > 0) { slider.children.css('marginBottom', slider.settings.slideMargin); }
        // if "fade" mode, add positioning and z-index CSS
        if (slider.settings.mode === 'fade') {
          slider.children.css({
            position: 'absolute',
            zIndex: 0,
            display: 'none'
          });
          // prepare the z-index on the showing element
          slider.children.eq(slider.settings.startSlide).css({zIndex: slider.settings.slideZIndex, display: 'block'});
        }
        // create an element to contain all slider controls (pager, start / stop, etc)
        slider.controls.el = $('<div class="bx-controls" />');
        // if captions are requested, add them
        if (slider.settings.captions) { appendCaptions(); }
        // check if startSlide is last slide
        slider.active.last = slider.settings.startSlide === getPagerQty() - 1;
        // if video is true, set up the fitVids plugin
        if (slider.settings.video) { el.fitVids(); }
        //preloadImages
        if (slider.settings.preloadImages === 'none') {
          preloadSelector = null;
        }
        else if (slider.settings.preloadImages === 'all' || slider.settings.ticker) {
          preloadSelector = slider.children;
        }
        // only check for control addition if not in "ticker" mode
        if (!slider.settings.ticker) {
          // if controls are requested, add them
          if (slider.settings.controls) { appendControls(); }
          // if auto is true, and auto controls are requested, add them
          if (slider.settings.auto && slider.settings.autoControls) { appendControlsAuto(); }
          // if pager is requested, add it
          if (slider.settings.pager) { appendPager(); }
          // if any control option is requested, add the controls wrapper
          if (slider.settings.controls || slider.settings.autoControls || slider.settings.pager) { slider.viewport.after(slider.controls.el); }
          // if ticker mode, do not allow a pager
        } else {
          slider.settings.pager = false;
        }
        if (preloadSelector === null) {
          start();
        } else {
          loadElements(preloadSelector, start);
        }
      };
      var loadElements = function(selector, callback) {
        var total = selector.find('img:not([src=""]), iframe').length,
          count = 0;
        if (total === 0) {
          callback();
          return;
        }
        selector.find('img:not([src=""]), iframe').each(function() {
          $(this).one('load error', function() {
            if (++count === total) { callback(); }
          }).each(function() {
            if (this.complete || this.src == '') { $(this).trigger('load'); }
          });
        });
      };
      /**
       * Start the slider
       */
      var start = function() {
        // if infinite loop, prepare additional slides
        if (slider.settings.infiniteLoop && slider.settings.mode !== 'fade' && !slider.settings.ticker) {
          var slice    = slider.settings.mode === 'vertical' ? slider.settings.minSlides : slider.settings.maxSlides,
            sliceAppend  = slider.children.slice(0, slice).clone(true).addClass('bx-clone'),
            slicePrepend = slider.children.slice(-slice).clone(true).addClass('bx-clone');
          if (slider.settings.ariaHidden) {
            sliceAppend.attr('aria-hidden', true);
            slicePrepend.attr('aria-hidden', true);
          }
          el.append(sliceAppend).prepend(slicePrepend);
        }
        // remove the loading DOM element
        slider.loader.remove();
        // set the left / top position of "el"
        setSlidePosition();
        // if "vertical" mode, always use adaptiveHeight to prevent odd behavior
        if (slider.settings.mode === 'vertical') { slider.settings.adaptiveHeight = true; }
        // set the viewport height
        slider.viewport.height(getViewportHeight());
        // make sure everything is positioned just right (same as a window resize)
        el.redrawSlider();
        // onSliderLoad callback
        slider.settings.onSliderLoad.call(el, slider.active.index);
        // slider has been fully initialized
        slider.initialized = true;
        // add the resize call to the window
        if (slider.settings.responsive) { $(window).on('resize', resizeWindow); }
        // if auto is true and has more than 1 page, start the show
        if (slider.settings.auto && slider.settings.autoStart && (getPagerQty() > 1 || slider.settings.autoSlideForOnePage)) { initAuto(); }
        // if ticker is true, start the ticker
        if (slider.settings.ticker) { initTicker(); }
        // if pager is requested, make the appropriate pager link active
        if (slider.settings.pager) { updatePagerActive(slider.settings.startSlide); }
        // check for any updates to the controls (like hideControlOnEnd updates)
        if (slider.settings.controls) { updateDirectionControls(); }
        // if touchEnabled is true, setup the touch events
        if (slider.settings.touchEnabled && !slider.settings.ticker) { initTouch(); }
        // if keyboardEnabled is true, setup the keyboard events
        if (slider.settings.keyboardEnabled && !slider.settings.ticker) {
          $(document).keydown(keyPress);
        }
      };
      /**
       * Returns the calculated height of the viewport, used to determine either adaptiveHeight or the maxHeight value
       */
      var getViewportHeight = function() {
        var height = 0;
        // first determine which children (slides) should be used in our height calculation
        var children = $();
        // if mode is not "vertical" and adaptiveHeight is false, include all children
        if (slider.settings.mode !== 'vertical' && !slider.settings.adaptiveHeight) {
          children = slider.children;
        } else {
          // if not carousel, return the single active child
          if (!slider.carousel) {
            children = slider.children.eq(slider.active.index);
            // if carousel, return a slice of children
          } else {
            // get the individual slide index
            var currentIndex = slider.settings.moveSlides === 1 ? slider.active.index : slider.active.index * getMoveBy();
            // add the current slide to the children
            children = slider.children.eq(currentIndex);
            // cycle through the remaining "showing" slides
            for (i = 1; i <= slider.settings.maxSlides - 1; i++) {
              // if looped back to the start
              if (currentIndex + i >= slider.children.length) {
                children = children.add(slider.children.eq(i - 1));
              } else {
                children = children.add(slider.children.eq(currentIndex + i));
              }
            }
          }
        }
        // if "vertical" mode, calculate the sum of the heights of the children
        if (slider.settings.mode === 'vertical') {
          children.each(function(index) {
            height += $(this).outerHeight();
          });
          // add user-supplied margins
          if (slider.settings.slideMargin > 0) {
            height += slider.settings.slideMargin * (slider.settings.minSlides - 1);
          }
          // if not "vertical" mode, calculate the max height of the children
        } else {
          height = Math.max.apply(Math, children.map(function() {
            return $(this).outerHeight(false);
          }).get());
        }
        if (slider.viewport.css('box-sizing') === 'border-box') {
          height += parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom')) +
            parseFloat(slider.viewport.css('border-top-width')) + parseFloat(slider.viewport.css('border-bottom-width'));
        } else if (slider.viewport.css('box-sizing') === 'padding-box') {
          height += parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom'));
        }
        return height;
      };
      /**
       * Returns the calculated width to be used for the outer wrapper / viewport
       */
      var getViewportMaxWidth = function() {
        var width = '100%';
        if (slider.settings.slideWidth > 0) {
          if (slider.settings.mode === 'horizontal') {
            width = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
          } else {
            width = slider.settings.slideWidth;
          }
        }
        return width;
      };
      /**
       * Returns the calculated width to be applied to each slide
       */
      var getSlideWidth = function() {
        var newElWidth = slider.settings.slideWidth, // start with any user-supplied slide width
          wrapWidth      = slider.viewport.width();    // get the current viewport width
        // if slide width was not supplied, or is larger than the viewport use the viewport width
        if (slider.settings.slideWidth === 0 ||
          (slider.settings.slideWidth > wrapWidth && !slider.carousel) ||
          slider.settings.mode === 'vertical') {
          newElWidth = wrapWidth;
          // if carousel, use the thresholds to determine the width
        } else if (slider.settings.maxSlides > 1 && slider.settings.mode === 'horizontal') {
          if (wrapWidth > slider.maxThreshold) {
            return newElWidth;
          } else if (wrapWidth < slider.minThreshold) {
            newElWidth = (wrapWidth - (slider.settings.slideMargin * (slider.settings.minSlides - 1))) / slider.settings.minSlides;
          } else if (slider.settings.shrinkItems) {
            newElWidth = Math.floor((wrapWidth + slider.settings.slideMargin) / (Math.ceil((wrapWidth + slider.settings.slideMargin) / (newElWidth + slider.settings.slideMargin))) - slider.settings.slideMargin);
          }
        }
        return newElWidth;
      };
      /**
       * Returns the number of slides currently visible in the viewport (includes partially visible slides)
       */
      var getNumberSlidesShowing = function() {
        var slidesShowing = 1,
          childWidth = null;
        if (slider.settings.mode === 'horizontal' && slider.settings.slideWidth > 0) {
          // if viewport is smaller than minThreshold, return minSlides
          if (slider.viewport.width() < slider.minThreshold) {
            slidesShowing = slider.settings.minSlides;
            // if viewport is larger than maxThreshold, return maxSlides
          } else if (slider.viewport.width() > slider.maxThreshold) {
            slidesShowing = slider.settings.maxSlides;
            // if viewport is between min / max thresholds, divide viewport width by first child width
          } else {
            childWidth = slider.children.first().width() + slider.settings.slideMargin;
            slidesShowing = Math.floor((slider.viewport.width() +
              slider.settings.slideMargin) / childWidth) || 1;
          }
          // if "vertical" mode, slides showing will always be minSlides
        } else if (slider.settings.mode === 'vertical') {
          slidesShowing = slider.settings.minSlides;
        }
        return slidesShowing;
      };
      /**
       * Returns the number of pages (one full viewport of slides is one "page")
       */
      var getPagerQty = function() {
        var pagerQty = 0,
          breakPoint = 0,
          counter = 0;
        // if moveSlides is specified by the user
        if (slider.settings.moveSlides > 0) {
          if (slider.settings.infiniteLoop) {
            pagerQty = Math.ceil(slider.children.length / getMoveBy());
          } else {
            // when breakpoint goes above children length, counter is the number of pages
            while (breakPoint < slider.children.length) {
              ++pagerQty;
              breakPoint = counter + getNumberSlidesShowing();
              counter += slider.settings.moveSlides <= getNumberSlidesShowing() ? slider.settings.moveSlides : getNumberSlidesShowing();
            }
            return counter;
          }
          // if moveSlides is 0 (auto) divide children length by sides showing, then round up
        } else {
          pagerQty = Math.ceil(slider.children.length / getNumberSlidesShowing());
        }
        return pagerQty;
      };
      /**
       * Returns the number of individual slides by which to shift the slider
       */
      var getMoveBy = function() {
        // if moveSlides was set by the user and moveSlides is less than number of slides showing
        if (slider.settings.moveSlides > 0 && slider.settings.moveSlides <= getNumberSlidesShowing()) {
          return slider.settings.moveSlides;
        }
        // if moveSlides is 0 (auto)
        return getNumberSlidesShowing();
      };
      /**
       * Sets the slider's (el) left or top position
       */
      var setSlidePosition = function() {
        var position, lastChild, lastShowingIndex;
        // if last slide, not infinite loop, and number of children is larger than specified maxSlides
        if (slider.children.length > slider.settings.maxSlides && slider.active.last && !slider.settings.infiniteLoop) {
          if (slider.settings.mode === 'horizontal') {
            // get the last child's position
            lastChild = slider.children.last();
            position = lastChild.position();
            // set the left position
            setPositionProperty(-(position.left - (slider.viewport.width() - lastChild.outerWidth())), 'reset', 0);
          } else if (slider.settings.mode === 'vertical') {
            // get the last showing index's position
            lastShowingIndex = slider.children.length - slider.settings.minSlides;
            position = slider.children.eq(lastShowingIndex).position();
            // set the top position
            setPositionProperty(-position.top, 'reset', 0);
          }
          // if not last slide
        } else {
          // get the position of the first showing slide
          position = slider.children.eq(slider.active.index * getMoveBy()).position();
          // check for last slide
          if (slider.active.index === getPagerQty() - 1) { slider.active.last = true; }
          // set the respective position
          if (position !== undefined) {
            if (slider.settings.mode === 'horizontal') { setPositionProperty(-position.left, 'reset', 0); }
            else if (slider.settings.mode === 'vertical') { setPositionProperty(-position.top, 'reset', 0); }
          }
        }
      };
      /**
       * Sets the el's animating property position (which in turn will sometimes animate el).
       * If using CSS, sets the transform property. If not using CSS, sets the top / left property.
       *
       * @param value (int)
       *  - the animating property's value
       *
       * @param type (string) 'slide', 'reset', 'ticker'
       *  - the type of instance for which the function is being
       *
       * @param duration (int)
       *  - the amount of time (in ms) the transition should occupy
       *
       * @param params (array) optional
       *  - an optional parameter containing any variables that need to be passed in
       */
      var setPositionProperty = function(value, type, duration, params) {
        var animateObj, propValue;
        // use CSS transform
        if (slider.usingCSS) {
          // determine the translate3d value
          propValue = slider.settings.mode === 'vertical' ? 'translate3d(0, ' + value + 'px, 0)' : 'translate3d(' + value + 'px, 0, 0)';
          // add the CSS transition-duration
          el.css('-' + slider.cssPrefix + '-transition-duration', duration / 1000 + 's');
          if (type === 'slide') {
            // set the property value
            el.css(slider.animProp, propValue);
            if (duration !== 0) {
              // add a callback method - executes when CSS transition completes
              el.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(e) {
                //make sure it's the correct one
                if (!$(e.target).is(el)) { return; }
                // remove the callback
                el.off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
                updateAfterSlideTransition();
              });
            } else { //duration = 0
              updateAfterSlideTransition();
            }
          } else if (type === 'reset') {
            el.css(slider.animProp, propValue);
          } else if (type === 'ticker') {
            // make the transition use 'linear'
            el.css('-' + slider.cssPrefix + '-transition-timing-function', 'linear');
            el.css(slider.animProp, propValue);
            if (duration !== 0) {
              el.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(e) {
                //make sure it's the correct one
                if (!$(e.target).is(el)) { return; }
                // remove the callback
                el.off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
                // reset the position
                setPositionProperty(params.resetValue, 'reset', 0);
                // start the loop again
                tickerLoop();
              });
            } else { //duration = 0
              setPositionProperty(params.resetValue, 'reset', 0);
              tickerLoop();
            }
          }
          // use JS animate
        } else {
          animateObj = {};
          animateObj[slider.animProp] = value;
          if (type === 'slide') {
            el.animate(animateObj, duration, slider.settings.easing, function() {
              updateAfterSlideTransition();
            });
          } else if (type === 'reset') {
            el.css(slider.animProp, value);
          } else if (type === 'ticker') {
            el.animate(animateObj, duration, 'linear', function() {
              setPositionProperty(params.resetValue, 'reset', 0);
              // run the recursive loop after animation
              tickerLoop();
            });
          }
        }
      };
      /**
       * Populates the pager with proper amount of pages
       */
      var populatePager = function() {
        var pagerHtml = '',
          linkContent = '',
          pagerQty = getPagerQty();
        // loop through each pager item
        for (var i = 0; i < pagerQty; i++) {
          linkContent = '';
          // if a buildPager function is supplied, use it to get pager link value, else use index + 1
          if (slider.settings.buildPager && $.isFunction(slider.settings.buildPager) || slider.settings.pagerCustom) {
            linkContent = slider.settings.buildPager(i);
            slider.pagerEl.addClass('bx-custom-pager');
          } else {
            linkContent = i + 1;
            slider.pagerEl.addClass('bx-default-pager');
          }
          // var linkContent = slider.settings.buildPager && $.isFunction(slider.settings.buildPager) ? slider.settings.buildPager(i) : i + 1;
          // add the markup to the string
          pagerHtml += '<div class="bx-pager-item"><a href="" data-slide-index="' + i + '" class="bx-pager-link">' + linkContent + '</a></div>';
        }
        // populate the pager element with pager links
        slider.pagerEl.html(pagerHtml);
      };
      /**
       * Appends the pager to the controls element
       */
      var appendPager = function() {
        if (!slider.settings.pagerCustom) {
          // create the pager DOM element
          slider.pagerEl = $('<div class="bx-pager" />');
          // if a pager selector was supplied, populate it with the pager
          if (slider.settings.pagerSelector) {
            $(slider.settings.pagerSelector).html(slider.pagerEl);
            // if no pager selector was supplied, add it after the wrapper
          } else {
            slider.controls.el.addClass('bx-has-pager').append(slider.pagerEl);
          }
          // populate the pager
          populatePager();
        } else {
          slider.pagerEl = $(slider.settings.pagerCustom);
        }
        // assign the pager click binding
        slider.pagerEl.on('click touchend', 'a', clickPagerBind);
      };
      /**
       * Appends prev / next controls to the controls element
       */
      var appendControls = function() {
        slider.controls.next = $('<a class="bx-next" href="">' + slider.settings.nextText + '</a>');
        slider.controls.prev = $('<a class="bx-prev" href="">' + slider.settings.prevText + '</a>');
        // add click actions to the controls
        slider.controls.next.on('click touchend', clickNextBind);
        slider.controls.prev.on('click touchend', clickPrevBind);
        // if nextSelector was supplied, populate it
        if (slider.settings.nextSelector) {
          $(slider.settings.nextSelector).append(slider.controls.next);
        }
        // if prevSelector was supplied, populate it
        if (slider.settings.prevSelector) {
          $(slider.settings.prevSelector).append(slider.controls.prev);
        }
        // if no custom selectors were supplied
        if (!slider.settings.nextSelector && !slider.settings.prevSelector) {
          // add the controls to the DOM
          slider.controls.directionEl = $('<div class="bx-controls-direction" />');
          // add the control elements to the directionEl
          slider.controls.directionEl.append(slider.controls.prev).append(slider.controls.next);
          // slider.viewport.append(slider.controls.directionEl);
          slider.controls.el.addClass('bx-has-controls-direction').append(slider.controls.directionEl);
        }
      };
      /**
       * Appends start / stop auto controls to the controls element
       */
      var appendControlsAuto = function() {
        slider.controls.start = $('<div class="bx-controls-auto-item"><a class="bx-start" href="">' + slider.settings.startText + '</a></div>');
        slider.controls.stop = $('<div class="bx-controls-auto-item"><a class="bx-stop" href="">' + slider.settings.stopText + '</a></div>');
        // add the controls to the DOM
        slider.controls.autoEl = $('<div class="bx-controls-auto" />');
        // on click actions to the controls
        slider.controls.autoEl.on('click', '.bx-start', clickStartBind);
        slider.controls.autoEl.on('click', '.bx-stop', clickStopBind);
        // if autoControlsCombine, insert only the "start" control
        if (slider.settings.autoControlsCombine) {
          slider.controls.autoEl.append(slider.controls.start);
          // if autoControlsCombine is false, insert both controls
        } else {
          slider.controls.autoEl.append(slider.controls.start).append(slider.controls.stop);
        }
        // if auto controls selector was supplied, populate it with the controls
        if (slider.settings.autoControlsSelector) {
          $(slider.settings.autoControlsSelector).html(slider.controls.autoEl);
          // if auto controls selector was not supplied, add it after the wrapper
        } else {
          slider.controls.el.addClass('bx-has-controls-auto').append(slider.controls.autoEl);
        }
        // update the auto controls
        updateAutoControls(slider.settings.autoStart ? 'stop' : 'start');
      };
      /**
       * Appends image captions to the DOM
       */
      var appendCaptions = function() {
        // cycle through each child
        slider.children.each(function(index) {
          // get the image title attribute
          var title = $(this).find('img:first').attr('title');
          // append the caption
          if (title !== undefined && ('' + title).length) {
            $(this).append('<div class="bx-caption"><span>' + title + '</span></div>');
          }
        });
      };
      /**
       * Click next binding
       *
       * @param e (event)
       *  - DOM event object
       */
      var clickNextBind = function(e) {
        e.preventDefault();
        if (slider.controls.el.hasClass('disabled')) { return; }
        // if auto show is running, stop it
        if (slider.settings.auto && slider.settings.stopAutoOnClick) { el.stopAuto(); }
        el.goToNextSlide();
      };
      /**
       * Click prev binding
       *
       * @param e (event)
       *  - DOM event object
       */
      var clickPrevBind = function(e) {
        e.preventDefault();
        if (slider.controls.el.hasClass('disabled')) { return; }
        // if auto show is running, stop it
        if (slider.settings.auto && slider.settings.stopAutoOnClick) { el.stopAuto(); }
        el.goToPrevSlide();
      };
      /**
       * Click start binding
       *
       * @param e (event)
       *  - DOM event object
       */
      var clickStartBind = function(e) {
        el.startAuto();
        e.preventDefault();
      };
      /**
       * Click stop binding
       *
       * @param e (event)
       *  - DOM event object
       */
      var clickStopBind = function(e) {
        el.stopAuto();
        e.preventDefault();
      };
      /**
       * Click pager binding
       *
       * @param e (event)
       *  - DOM event object
       */
      var clickPagerBind = function(e) {
        var pagerLink, pagerIndex;
        e.preventDefault();
        if (slider.controls.el.hasClass('disabled')) {
          return;
        }
        // if auto show is running, stop it
        if (slider.settings.auto  && slider.settings.stopAutoOnClick) { el.stopAuto(); }
        pagerLink = $(e.currentTarget);
        if (pagerLink.attr('data-slide-index') !== undefined) {
          pagerIndex = parseInt(pagerLink.attr('data-slide-index'));
          // if clicked pager link is not active, continue with the goToSlide call
          if (pagerIndex !== slider.active.index) { el.goToSlide(pagerIndex); }
        }
      };
      /**
       * Updates the pager links with an active class
       *
       * @param slideIndex (int)
       *  - index of slide to make active
       */
      var updatePagerActive = function(slideIndex) {
        // if "short" pager type
        var len = slider.children.length; // nb of children
        if (slider.settings.pagerType === 'short') {
          if (slider.settings.maxSlides > 1) {
            len = Math.ceil(slider.children.length / slider.settings.maxSlides);
          }
          slider.pagerEl.html((slideIndex + 1) + slider.settings.pagerShortSeparator + len);
          return;
        }
        // remove all pager active classes
        slider.pagerEl.find('a').removeClass('active');
        // apply the active class for all pagers
        slider.pagerEl.each(function(i, el) { $(el).find('a').eq(slideIndex).addClass('active'); });
      };
      /**
       * Performs needed actions after a slide transition
       */
      var updateAfterSlideTransition = function() {
        // if infinite loop is true
        if (slider.settings.infiniteLoop) {
          var position = '';
          // first slide
          if (slider.active.index === 0) {
            // set the new position
            position = slider.children.eq(0).position();
            // carousel, last slide
          } else if (slider.active.index === getPagerQty() - 1 && slider.carousel) {
            position = slider.children.eq((getPagerQty() - 1) * getMoveBy()).position();
            // last slide
          } else if (slider.active.index === slider.children.length - 1) {
            position = slider.children.eq(slider.children.length - 1).position();
          }
          if (position) {
            if (slider.settings.mode === 'horizontal') { setPositionProperty(-position.left, 'reset', 0); }
            else if (slider.settings.mode === 'vertical') { setPositionProperty(-position.top, 'reset', 0); }
          }
        }
        // declare that the transition is complete
        slider.working = false;
        // onSlideAfter callback
        slider.settings.onSlideAfter.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
      };
      /**
       * Updates the auto controls state (either active, or combined switch)
       *
       * @param state (string) "start", "stop"
       *  - the new state of the auto show
       */
      var updateAutoControls = function(state) {
        // if autoControlsCombine is true, replace the current control with the new state
        if (slider.settings.autoControlsCombine) {
          slider.controls.autoEl.html(slider.controls[state]);
          // if autoControlsCombine is false, apply the "active" class to the appropriate control
        } else {
          slider.controls.autoEl.find('a').removeClass('active');
          slider.controls.autoEl.find('a:not(.bx-' + state + ')').addClass('active');
        }
      };
      /**
       * Updates the direction controls (checks if either should be hidden)
       */
      var updateDirectionControls = function() {
        if (getPagerQty() === 1) {
          slider.controls.prev.addClass('disabled');
          slider.controls.next.addClass('disabled');
        } else if (!slider.settings.infiniteLoop && slider.settings.hideControlOnEnd) {
          // if first slide
          if (slider.active.index === 0) {
            slider.controls.prev.addClass('disabled');
            slider.controls.next.removeClass('disabled');
            // if last slide
          } else if (slider.active.index === getPagerQty() - 1) {
            slider.controls.next.addClass('disabled');
            slider.controls.prev.removeClass('disabled');
            // if any slide in the middle
          } else {
            slider.controls.prev.removeClass('disabled');
            slider.controls.next.removeClass('disabled');
          }
        }
      };
      /* auto start and stop functions */
      var windowFocusHandler = function() { el.startAuto(); };
      var windowBlurHandler = function() { el.stopAuto(); };
      /**
       * Initializes the auto process
       */
      var initAuto = function() {
        // if autoDelay was supplied, launch the auto show using a setTimeout() call
        if (slider.settings.autoDelay > 0) {
          setTimeout(el.startAuto, slider.settings.autoDelay);
          // if autoDelay was not supplied, start the auto show normally
        } else {
          el.startAuto();
          //add focus and blur events to ensure its running if timeout gets paused
          $(window).focus(windowFocusHandler).blur(windowBlurHandler);
        }
        // if autoHover is requested
        if (slider.settings.autoHover) {
          // on el hover
          el.hover(function() {
            // if the auto show is currently playing (has an active interval)
            if (slider.interval) {
              // stop the auto show and pass true argument which will prevent control update
              el.stopAuto(true);
              // create a new autoPaused value which will be used by the relative "mouseout" event
              slider.autoPaused = true;
            }
          }, function() {
            // if the autoPaused value was created be the prior "mouseover" event
            if (slider.autoPaused) {
              // start the auto show and pass true argument which will prevent control update
              el.startAuto(true);
              // reset the autoPaused value
              slider.autoPaused = null;
            }
          });
        }
      };
      /**
       * Initializes the ticker process
       */
      var initTicker = function() {
        var startPosition = 0,
          position, transform, value, idx, ratio, property, newSpeed, totalDimens;
        // if autoDirection is "next", append a clone of the entire slider
        if (slider.settings.autoDirection === 'next') {
          el.append(slider.children.clone().addClass('bx-clone'));
          // if autoDirection is "prev", prepend a clone of the entire slider, and set the left position
        } else {
          el.prepend(slider.children.clone().addClass('bx-clone'));
          position = slider.children.first().position();
          startPosition = slider.settings.mode === 'horizontal' ? -position.left : -position.top;
        }
        setPositionProperty(startPosition, 'reset', 0);
        // do not allow controls in ticker mode
        slider.settings.pager = false;
        slider.settings.controls = false;
        slider.settings.autoControls = false;
        // if autoHover is requested
        if (slider.settings.tickerHover) {
          if (slider.usingCSS) {
            idx = slider.settings.mode === 'horizontal' ? 4 : 5;
            slider.viewport.hover(function() {
              transform = el.css('-' + slider.cssPrefix + '-transform');
              value = parseFloat(transform.split(',')[idx]);
              setPositionProperty(value, 'reset', 0);
            }, function() {
              totalDimens = 0;
              slider.children.each(function(index) {
                totalDimens += slider.settings.mode === 'horizontal' ? $(this).outerWidth(true) : $(this).outerHeight(true);
              });
              // calculate the speed ratio (used to determine the new speed to finish the paused animation)
              ratio = slider.settings.speed / totalDimens;
              // determine which property to use
              property = slider.settings.mode === 'horizontal' ? 'left' : 'top';
              // calculate the new speed
              newSpeed = ratio * (totalDimens - (Math.abs(parseInt(value))));
              tickerLoop(newSpeed);
            });
          } else {
            // on el hover
            slider.viewport.hover(function() {
              el.stop();
            }, function() {
              // calculate the total width of children (used to calculate the speed ratio)
              totalDimens = 0;
              slider.children.each(function(index) {
                totalDimens += slider.settings.mode === 'horizontal' ? $(this).outerWidth(true) : $(this).outerHeight(true);
              });
              // calculate the speed ratio (used to determine the new speed to finish the paused animation)
              ratio = slider.settings.speed / totalDimens;
              // determine which property to use
              property = slider.settings.mode === 'horizontal' ? 'left' : 'top';
              // calculate the new speed
              newSpeed = ratio * (totalDimens - (Math.abs(parseInt(el.css(property)))));
              tickerLoop(newSpeed);
            });
          }
        }
        // start the ticker loop
        tickerLoop();
      };
      /**
       * Runs a continuous loop, news ticker-style
       */
      var tickerLoop = function(resumeSpeed) {
        var speed = resumeSpeed ? resumeSpeed : slider.settings.speed,
          position = {left: 0, top: 0},
          reset = {left: 0, top: 0},
          animateProperty, resetValue, params;
        // if "next" animate left position to last child, then reset left to 0
        if (slider.settings.autoDirection === 'next') {
          position = el.find('.bx-clone').first().position();
          // if "prev" animate left position to 0, then reset left to first non-clone child
        } else {
          reset = slider.children.first().position();
        }
        animateProperty = slider.settings.mode === 'horizontal' ? -position.left : -position.top;
        resetValue = slider.settings.mode === 'horizontal' ? -reset.left : -reset.top;
        params = {resetValue: resetValue};
        setPositionProperty(animateProperty, 'ticker', speed, params);
      };
      /**
       * Check if el is on screen
       */
      var isOnScreen = function(el) {
        var win = $(window),
          viewport = {
            top: win.scrollTop(),
            left: win.scrollLeft()
          },
          bounds = el.offset();
        viewport.right = viewport.left + win.width();
        viewport.bottom = viewport.top + win.height();
        bounds.right = bounds.left + el.outerWidth();
        bounds.bottom = bounds.top + el.outerHeight();
        return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
      };
      /**
       * Initializes keyboard events
       */
      var keyPress = function(e) {
        var activeElementTag = document.activeElement.tagName.toLowerCase(),
          tagFilters = 'input|textarea',
          p = new RegExp(activeElementTag,['i']),
          result = p.exec(tagFilters);
        if (result == null && isOnScreen(el)) {
          if (e.keyCode === 39) {
            clickNextBind(e);
            return false;
          } else if (e.keyCode === 37) {
            clickPrevBind(e);
            return false;
          }
        }
      };
      /**
       * Initializes touch events
       */
      var initTouch = function() {
        // initialize object to contain all touch values
        slider.touch = {
          start: {x: 0, y: 0},
          end: {x: 0, y: 0}
        };
        slider.viewport.on('touchstart MSPointerDown pointerdown', onTouchStart);
        //for browsers that have implemented pointer events and fire a click after
        //every pointerup regardless of whether pointerup is on same screen location as pointerdown or not
        slider.viewport.on('click', '.bxslider a', function(e) {
          if (slider.viewport.hasClass('click-disabled')) {
            e.preventDefault();
            slider.viewport.removeClass('click-disabled');
          }
        });
      };
      /**
       * Event handler for "touchstart"
       *
       * @param e (event)
       *  - DOM event object
       */
      var onTouchStart = function(e) {
        // watch only for left mouse, touch contact and pen contact
        // touchstart event object doesn`t have button property
        if (e.type !== 'touchstart' && e.button !== 0) {
          return;
        }
        // !!! We don't want to prevent default handler to be able to scroll vertically in mobile devices and to select text !!!
        //e.preventDefault();
        //disable slider controls while user is interacting with slides to avoid slider freeze that happens on touch devices when a slide swipe happens immediately after interacting with slider controls
        slider.controls.el.addClass('disabled');
        if (slider.working) {
          slider.controls.el.removeClass('disabled');
        } else {
          // record the original position when touch starts
          slider.touch.originalPos = el.position();
          var orig = e.originalEvent,
            touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig];
          var chromePointerEvents = typeof PointerEvent === 'function';
          if (chromePointerEvents) {
            if (orig.pointerId === undefined) {
              return;
            }
          }
          // record the starting touch x, y coordinates
          slider.touch.start.x = touchPoints[0].pageX;
          slider.touch.start.y = touchPoints[0].pageY;
          if (slider.viewport.get(0).setPointerCapture) {
            slider.pointerId = orig.pointerId;
            slider.viewport.get(0).setPointerCapture(slider.pointerId);
          }
          // store original event data for click fixation
          slider.originalClickTarget = orig.originalTarget || orig.target;
          slider.originalClickButton = orig.button;
          slider.originalClickButtons = orig.buttons;
          slider.originalEventType = orig.type;
          // at this moment we don`t know what it is click or swipe
          slider.hasMove = false;
          // on a "touchmove" event to the viewport
          slider.viewport.on('touchmove MSPointerMove pointermove', onTouchMove);
          // on a "touchend" event to the viewport
          slider.viewport.on('touchend MSPointerUp pointerup', onTouchEnd);
          slider.viewport.on('MSPointerCancel pointercancel', onPointerCancel);
        }
      };
      /**
       * Cancel Pointer for Windows Phone
       *
       * @param e (event)
       *  - DOM event object
       */
      var onPointerCancel = function(e) {
        e.preventDefault();
        /* onPointerCancel handler is needed to deal with situations when a touchend
        doesn't fire after a touchstart (this happens on windows phones only) */
        setPositionProperty(slider.touch.originalPos.left, 'reset', 0);
        //remove handlers
        slider.controls.el.removeClass('disabled');
        slider.viewport.off('MSPointerCancel pointercancel', onPointerCancel);
        slider.viewport.off('touchmove MSPointerMove pointermove', onTouchMove);
        slider.viewport.off('touchend MSPointerUp pointerup', onTouchEnd);
        if (slider.viewport.get(0).releasePointerCapture) {
          slider.viewport.get(0).releasePointerCapture(slider.pointerId);
        }
      };
      /**
       * Event handler for "touchmove"
       *
       * @param e (event)
       *  - DOM event object
       */
      var onTouchMove = function(e) {
        var orig = e.originalEvent,
          touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig],
          // if scrolling on y axis, do not prevent default
          xMovement = Math.abs(touchPoints[0].pageX - slider.touch.start.x),
          yMovement = Math.abs(touchPoints[0].pageY - slider.touch.start.y),
          value = 0,
          change = 0;
        // this is swipe
        slider.hasMove = true;
        // x axis swipe
        if ((xMovement * 3) > yMovement && slider.settings.preventDefaultSwipeX) {
          e.preventDefault();
          // y axis swipe
        } else if ((yMovement * 3) > xMovement && slider.settings.preventDefaultSwipeY) {
          e.preventDefault();
        }
        if (e.type !== 'touchmove') {
          e.preventDefault();
        }
        if (slider.settings.mode !== 'fade' && slider.settings.oneToOneTouch) {
          // if horizontal, drag along x axis
          if (slider.settings.mode === 'horizontal') {
            change = touchPoints[0].pageX - slider.touch.start.x;
            value = slider.touch.originalPos.left + change;
            // if vertical, drag along y axis
          } else {
            change = touchPoints[0].pageY - slider.touch.start.y;
            value = slider.touch.originalPos.top + change;
          }
          setPositionProperty(value, 'reset', 0);
        }
      };
      /**
       * Event handler for "touchend"
       *
       * @param e (event)
       *  - DOM event object
       */
      var onTouchEnd = function(e) {
        e.preventDefault();
        slider.viewport.off('touchmove MSPointerMove pointermove', onTouchMove);
        //enable slider controls as soon as user stops interacing with slides
        slider.controls.el.removeClass('disabled');
        var orig    = e.originalEvent,
          touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig],
          value       = 0,
          distance    = 0;
        // record end x, y positions
        slider.touch.end.x = touchPoints[0].pageX;
        slider.touch.end.y = touchPoints[0].pageY;
        // if fade mode, check if absolute x distance clears the threshold
        if (slider.settings.mode === 'fade') {
          distance = Math.abs(slider.touch.start.x - slider.touch.end.x);
          if (distance >= slider.settings.swipeThreshold) {
            if (slider.touch.start.x > slider.touch.end.x) {
              el.goToNextSlide();
            } else {
              el.goToPrevSlide();
            }
            el.stopAuto();
          }
          // not fade mode
        } else {
          // calculate distance and el's animate property
          if (slider.settings.mode === 'horizontal') {
            distance = slider.touch.end.x - slider.touch.start.x;
            value = slider.touch.originalPos.left;
          } else {
            distance = slider.touch.end.y - slider.touch.start.y;
            value = slider.touch.originalPos.top;
          }
          // if not infinite loop and first / last slide, do not attempt a slide transition
          if (!slider.settings.infiniteLoop && ((slider.active.index === 0 && distance > 0) || (slider.active.last && distance < 0))) {
            setPositionProperty(value, 'reset', 200);
          } else {
            // check if distance clears threshold
            if (Math.abs(distance) >= slider.settings.swipeThreshold) {
              if (distance < 0) {
                el.goToNextSlide();
              } else {
                el.goToPrevSlide();
              }
              el.stopAuto();
            } else {
              // el.animate(property, 200);
              setPositionProperty(value, 'reset', 200);
            }
          }
        }
        slider.viewport.off('touchend MSPointerUp pointerup', onTouchEnd);
        if (slider.viewport.get(0).releasePointerCapture) {
          slider.viewport.get(0).releasePointerCapture(slider.pointerId);
        }
        // if slider had swipe with left mouse, touch contact and pen contact
        if (slider.hasMove === false && (slider.originalClickButton === 0 || slider.originalEventType === 'touchstart')) {
          // trigger click event (fix for Firefox59 and PointerEvent standard compatibility)
          $(slider.originalClickTarget).trigger({
            type: 'click',
            button: slider.originalClickButton,
            buttons: slider.originalClickButtons
          });
        }
      };
      /**
       * Window resize event callback
       */
      var resizeWindow = function(e) {
        // don't do anything if slider isn't initialized.
        if (!slider.initialized) { return; }
        // Delay if slider working.
        if (slider.working) {
          window.setTimeout(resizeWindow, 10);
        } else {
          // get the new window dimens (again, thank you IE)
          var windowWidthNew = $(window).width(),
            windowHeightNew = $(window).height();
          // make sure that it is a true window resize
          // *we must check this because our dinosaur friend IE fires a window resize event when certain DOM elements
          // are resized. Can you just die already?*
          if (windowWidth !== windowWidthNew || windowHeight !== windowHeightNew) {
            // set the new window dimens
            windowWidth = windowWidthNew;
            windowHeight = windowHeightNew;
            // update all dynamic elements
            el.redrawSlider();
            // Call user resize handler
            slider.settings.onSliderResize.call(el, slider.active.index);
          }
        }
      };
      /**
       * Adds an aria-hidden=true attribute to each element
       *
       * @param startVisibleIndex (int)
       *  - the first visible element's index
       */
      var applyAriaHiddenAttributes = function(startVisibleIndex) {
        var numberOfSlidesShowing = getNumberSlidesShowing();
        // only apply attributes if the setting is enabled and not in ticker mode
        if (slider.settings.ariaHidden && !slider.settings.ticker) {
          // add aria-hidden=true to all elements
          slider.children.attr('aria-hidden', 'true');
          // get the visible elements and change to aria-hidden=false
          slider.children.slice(startVisibleIndex, startVisibleIndex + numberOfSlidesShowing).attr('aria-hidden', 'false');
        }
      };
      /**
       * Returns index according to present page range
       *
       * @param slideOndex (int)
       *  - the desired slide index
       */
      var setSlideIndex = function(slideIndex) {
        if (slideIndex < 0) {
          if (slider.settings.infiniteLoop) {
            return getPagerQty() - 1;
          }else {
            //we don't go to undefined slides
            return slider.active.index;
          }
          // if slideIndex is greater than children length, set active index to 0 (this happens during infinite loop)
        } else if (slideIndex >= getPagerQty()) {
          if (slider.settings.infiniteLoop) {
            return 0;
          } else {
            //we don't move to undefined pages
            return slider.active.index;
          }
          // set active index to requested slide
        } else {
          return slideIndex;
        }
      };
      /**
       * ===================================================================================
       * = PUBLIC FUNCTIONS
       * ===================================================================================
       */
      /**
       * Performs slide transition to the specified slide
       *
       * @param slideIndex (int)
       *  - the destination slide's index (zero-based)
       *
       * @param direction (string)
       *  - INTERNAL USE ONLY - the direction of travel ("prev" / "next")
       */
      el.goToSlide = function(slideIndex, direction) {
        // onSlideBefore, onSlideNext, onSlidePrev callbacks
        // Allow transition canceling based on returned value
        var performTransition = true,
          moveBy = 0,
          position = {left: 0, top: 0},
          lastChild = null,
          lastShowingIndex, eq, value, requestEl;
        // store the old index
        slider.oldIndex = slider.active.index;
        //set new index
        slider.active.index = setSlideIndex(slideIndex);
        // if plugin is currently in motion, ignore request
        if (slider.working || slider.active.index === slider.oldIndex) { return; }
        // declare that plugin is in motion
        slider.working = true;
        performTransition = slider.settings.onSlideBefore.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
        // If transitions canceled, reset and return
        if (typeof (performTransition) !== 'undefined' && !performTransition) {
          slider.active.index = slider.oldIndex; // restore old index
          slider.working = false; // is not in motion
          return;
        }
        if (direction === 'next') {
          // Prevent canceling in future functions or lack there-of from negating previous commands to cancel
          if (!slider.settings.onSlideNext.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index)) {
            performTransition = false;
          }
        } else if (direction === 'prev') {
          // Prevent canceling in future functions or lack there-of from negating previous commands to cancel
          if (!slider.settings.onSlidePrev.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index)) {
            performTransition = false;
          }
        }
        // check if last slide
        slider.active.last = slider.active.index >= getPagerQty() - 1;
        // update the pager with active class
        if (slider.settings.pager || slider.settings.pagerCustom) { updatePagerActive(slider.active.index); }
        // // check for direction control update
        if (slider.settings.controls) { updateDirectionControls(); }
        // if slider is set to mode: "fade"
        if (slider.settings.mode === 'fade') {
          // if adaptiveHeight is true and next height is different from current height, animate to the new height
          if (slider.settings.adaptiveHeight && slider.viewport.height() !== getViewportHeight()) {
            slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
          }
          // fade out the visible child and reset its z-index value
          slider.children.filter(':visible').fadeOut(slider.settings.speed).css({zIndex: 0});
          // fade in the newly requested slide
          slider.children.eq(slider.active.index).css('zIndex', slider.settings.slideZIndex + 1).fadeIn(slider.settings.speed, function() {
            $(this).css('zIndex', slider.settings.slideZIndex);
            updateAfterSlideTransition();
          });
          // slider mode is not "fade"
        } else {
          // if adaptiveHeight is true and next height is different from current height, animate to the new height
          if (slider.settings.adaptiveHeight && slider.viewport.height() !== getViewportHeight()) {
            slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
          }
          // if carousel and not infinite loop
          if (!slider.settings.infiniteLoop && slider.carousel && slider.active.last) {
            if (slider.settings.mode === 'horizontal') {
              // get the last child position
              lastChild = slider.children.eq(slider.children.length - 1);
              position = lastChild.position();
              // calculate the position of the last slide
              moveBy = slider.viewport.width() - lastChild.outerWidth();
            } else {
              // get last showing index position
              lastShowingIndex = slider.children.length - slider.settings.minSlides;
              position = slider.children.eq(lastShowingIndex).position();
            }
            // horizontal carousel, going previous while on first slide (infiniteLoop mode)
          } else if (slider.carousel && slider.active.last && direction === 'prev') {
            // get the last child position
            eq = slider.settings.moveSlides === 1 ? slider.settings.maxSlides - getMoveBy() : ((getPagerQty() - 1) * getMoveBy()) - (slider.children.length - slider.settings.maxSlides);
            lastChild = el.children('.bx-clone').eq(eq);
            position = lastChild.position();
            // if infinite loop and "Next" is clicked on the last slide
          } else if (direction === 'next' && slider.active.index === 0) {
            // get the last clone position
            position = el.find('> .bx-clone').eq(slider.settings.maxSlides).position();
            slider.active.last = false;
            // normal non-zero requests
          } else if (slideIndex >= 0) {
            //parseInt is applied to allow floats for slides/page
            requestEl = slideIndex * parseInt(getMoveBy());
            position = slider.children.eq(requestEl).position();
          }
          /* If the position doesn't exist
           * (e.g. if you destroy the slider on a next click),
           * it doesn't throw an error.
           */
          if (typeof (position) !== 'undefined') {
            value = slider.settings.mode === 'horizontal' ? -(position.left - moveBy) : -position.top;
            // plugin values to be animated
            setPositionProperty(value, 'slide', slider.settings.speed);
          }
          slider.working = false;
        }
        if (slider.settings.ariaHidden) { applyAriaHiddenAttributes(slider.active.index * getMoveBy()); }
      };
      /**
       * Transitions to the next slide in the show
       */
      el.goToNextSlide = function() {
        // if infiniteLoop is false and last page is showing, disregard call
        if (!slider.settings.infiniteLoop && slider.active.last) { return; }
        if (slider.working === true){ return ;}
        var pagerIndex = parseInt(slider.active.index) + 1;
        el.goToSlide(pagerIndex, 'next');
      };
      /**
       * Transitions to the prev slide in the show
       */
      el.goToPrevSlide = function() {
        // if infiniteLoop is false and last page is showing, disregard call
        if (!slider.settings.infiniteLoop && slider.active.index === 0) { return; }
        if (slider.working === true){ return ;}
        var pagerIndex = parseInt(slider.active.index) - 1;
        el.goToSlide(pagerIndex, 'prev');
      };
      /**
       * Starts the auto show
       *
       * @param preventControlUpdate (boolean)
       *  - if true, auto controls state will not be updated
       */
      el.startAuto = function(preventControlUpdate) {
        // if an interval already exists, disregard call
        if (slider.interval) { return; }
        // create an interval
        slider.interval = setInterval(function() {
          if (slider.settings.autoDirection === 'next') {
            el.goToNextSlide();
          } else {
            el.goToPrevSlide();
          }
        }, slider.settings.pause);
        //allback for when the auto rotate status changes
        slider.settings.onAutoChange.call(el, true);
        // if auto controls are displayed and preventControlUpdate is not true
        if (slider.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('stop'); }
      };
      /**
       * Stops the auto show
       *
       * @param preventControlUpdate (boolean)
       *  - if true, auto controls state will not be updated
       */
      el.stopAuto = function(preventControlUpdate) {
        // if slider is auto paused, just clear that state
        if (slider.autoPaused) slider.autoPaused = false;
        // if no interval exists, disregard call
        if (!slider.interval) { return; }
        // clear the interval
        clearInterval(slider.interval);
        slider.interval = null;
        //allback for when the auto rotate status changes
        slider.settings.onAutoChange.call(el, false);
        // if auto controls are displayed and preventControlUpdate is not true
        if (slider.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('start'); }
      };
      /**
       * Returns current slide index (zero-based)
       */
      el.getCurrentSlide = function() {
        return slider.active.index;
      };
      /**
       * Returns current slide element
       */
      el.getCurrentSlideElement = function() {
        return slider.children.eq(slider.active.index);
      };
      /**
       * Returns a slide element
       * @param index (int)
       *  - The index (zero-based) of the element you want returned.
       */
      el.getSlideElement = function(index) {
        return slider.children.eq(index);
      };
      /**
       * Returns number of slides in show
       */
      el.getSlideCount = function() {
        return slider.children.length;
      };
      /**
       * Return slider.working variable
       */
      el.isWorking = function() {
        return slider.working;
      };
      /**
       * Update all dynamic slider elements
       */
      el.redrawSlider = function() {
        // resize all children in ratio to new screen size
        slider.children.add(el.find('.bx-clone')).outerWidth(getSlideWidth());
        // adjust the height
        slider.viewport.css('height', getViewportHeight());
        // update the slide position
        if (!slider.settings.ticker) { setSlidePosition(); }
        // if active.last was true before the screen resize, we want
        // to keep it last no matter what screen size we end on
        if (slider.active.last) { slider.active.index = getPagerQty() - 1; }
        // if the active index (page) no longer exists due to the resize, simply set the index as last
        if (slider.active.index >= getPagerQty()) { slider.active.last = true; }
        // if a pager is being displayed and a custom pager is not being used, update it
        if (slider.settings.pager && !slider.settings.pagerCustom) {
          populatePager();
          updatePagerActive(slider.active.index);
        }
        if (slider.settings.ariaHidden) { applyAriaHiddenAttributes(slider.active.index * getMoveBy()); }
      };
      /**
       * Destroy the current instance of the slider (revert everything back to original state)
       */
      el.destroySlider = function() {
        // don't do anything if slider has already been destroyed
        if (!slider.initialized) { return; }
        slider.initialized = false;
        $('.bx-clone', this).remove();
        slider.children.each(function() {
          if ($(this).data('origStyle') !== undefined) {
            $(this).attr('style', $(this).data('origStyle'));
          } else {
            $(this).removeAttr('style');
          }
        });
        if ($(this).data('origStyle') !== undefined) {
          this.attr('style', $(this).data('origStyle'));
        } else {
          $(this).removeAttr('style');
        }
        $(this).unwrap().unwrap();
        if (slider.controls.el) { slider.controls.el.remove(); }
        if (slider.controls.next) { slider.controls.next.remove(); }
        if (slider.controls.prev) { slider.controls.prev.remove(); }
        if (slider.pagerEl && slider.settings.controls && !slider.settings.pagerCustom) { slider.pagerEl.remove(); }
        $('.bx-caption', this).remove();
        if (slider.controls.autoEl) { slider.controls.autoEl.remove(); }
        clearInterval(slider.interval);
        if (slider.settings.responsive) { $(window).off('resize', resizeWindow); }
        if (slider.settings.keyboardEnabled) { $(document).off('keydown', keyPress); }
        //remove self reference in data
        $(this).removeData('bxSlider');
        // remove global window handlers
        $(window).off('blur', windowBlurHandler).off('focus', windowFocusHandler);
      };
      /**
       * Reload the slider (revert all DOM changes, and re-initialize)
       */
      el.reloadSlider = function(settings) {
        if (settings !== undefined) { options = settings; }
        el.destroySlider();
        init();
        //store reference to self in order to access public functions later
        $(el).data('bxSlider', this);
      };
      init();
      $(el).data('bxSlider', this);
      // returns the current jQuery object
      return this;
    };
  })(jQuery);
  return;
});
/// <amd-module name="NetSuite.LogoList.Common.Instrumentation.Helper"/>
define("NetSuite.LogoList.Common.Instrumentation.Helper", ["require", "exports", "NetSuite.LogoList.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ComponentArea = 'SC Logo List';
    var ExtensionVersion = '1.1.0';
    var QueueNameSuffix = '-LogoList';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (container) {
            Instrumentation_1.default.initialize({
                environment: container.getComponent('Environment'),
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                },
            });
        };
        InstrumentationHelper.log = function (activity, subType) {
            var label = activity.replace(' ', '');
            var log = Instrumentation_1.default.getLog(label);
            log.setParameter('activity', activity);
            if (subType) {
                log.setParameter('subType', subType);
            }
            log.submit();
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="NetSuite.LogoList.Common.Utils"/>
define("NetSuite.LogoList.Common.Utils", ["require", "exports", "jQuery"], function (require, exports, jQuery) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Device;
    (function (Device) {
        Device[Device["phone"] = 0] = "phone";
        Device[Device["tablet"] = 1] = "tablet";
        Device[Device["desktop"] = 2] = "desktop";
    })(Device = exports.Device || (exports.Device = {}));
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.isPhoneDevice = function () {
            return this.getDeviceType() === Device.phone;
        };
        Utils.isTabletDevice = function () {
            return this.getDeviceType() === Device.tablet;
        };
        Utils.isDesktopDevice = function () {
            return this.getDeviceType() === Device.desktop;
        };
        Utils.getDeviceType = function (widthToCheck) {
            var width = widthToCheck || this.getViewportWidth();
            if (width < 768) {
                return Device.phone;
            }
            if (width < 992) {
                return Device.tablet;
            }
            return Device.desktop;
        };
        Utils.getViewportWidth = function () {
            return jQuery(window).width();
        };
        Utils.trim = function (text) {
            return jQuery.trim(text);
        };
        Utils.oldIE = function (version) {
            var ie_version = version || 7;
            // IE7 detection courtesy of Backbone
            // More info: http://www.glennjones.net/2006/02/getattribute-href-bug/
            var isExplorer = /msie [\w.]+/;
            var docMode = document.documentMode;
            return (isExplorer.exec(navigator.userAgent.toLowerCase()) &&
                (!docMode || docMode <= ie_version));
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
/// <amd-module name="NetSuite.LogoList.Instrumentation.Fallback.Logger"/>
define("NetSuite.LogoList.Instrumentation.Fallback.Logger", ["require", "exports", "jQuery", "Url"], function (require, exports, jQuery, Url) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var queueErrorTemp = [];
    var queueInfoTemp = [];
    var FallbackLogger = /** @class */ (function () {
        function FallbackLogger(options) {
            var _this = this;
            this.options = options;
            if (!this.isEnabled()) {
                return;
            }
            this.isWaiting = false;
            setInterval(function () {
                _this.processQueues(true);
            }, 60000);
            window.addEventListener('beforeunload', function () {
                _this.processQueues(false);
            });
        }
        Object.defineProperty(FallbackLogger.prototype, "environment", {
            get: function () {
                if (this.options.environment) {
                    return this.options.environment;
                }
                console.error('Please initialize instrumentation with the Environment Component.');
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FallbackLogger.prototype, "queueErrorName", {
            get: function () {
                return "queueError" + this.options.queueNameSuffix;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FallbackLogger.prototype, "queueInfoName", {
            get: function () {
                return "queueInfo" + this.options.queueNameSuffix;
            },
            enumerable: true,
            configurable: true
        });
        FallbackLogger.prototype.info = function (obj) {
            if (!this.isEnabled()) {
                return;
            }
            var objWrapper = obj;
            objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
            objWrapper.message = "clientSideLogDateTime: " + new Date().toISOString();
            if (this.isWaiting) {
                queueInfoTemp.push(objWrapper);
            }
            else {
                var queueInfo = JSON.parse(localStorage.getItem(this.queueInfoName)) || [];
                queueInfo.push(objWrapper);
                localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfo));
            }
        };
        FallbackLogger.prototype.error = function (obj) {
            if (!this.isEnabled()) {
                return;
            }
            var objWrapper = obj;
            objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
            objWrapper.message = "clientSideLogDateTime: " + new Date().toISOString();
            if (this.isWaiting) {
                queueErrorTemp.push(objWrapper);
            }
            else {
                var queueError = JSON.parse(localStorage.getItem(this.queueErrorName)) || [];
                queueError.push(objWrapper);
                localStorage.setItem(this.queueErrorName, JSON.stringify(queueError));
            }
        };
        FallbackLogger.prototype.processQueues = function (isAsync) {
            if (!this.isEnabled()) {
                return;
            }
            var parsedURL = new Url().parse(SC.ENVIRONMENT.baseUrl);
            var product = SC.ENVIRONMENT.BuildTimeInf.product;
            var url = parsedURL.schema + "://" + parsedURL.netLoc + "/app/site/hosting/scriptlet.nl" +
                ("?script=customscript_" + product.toLowerCase() + "_loggerendpoint") +
                ("&deploy=customdeploy_" + product.toLowerCase() + "_loggerendpoint");
            var queueError = JSON.parse(localStorage.getItem(this.queueErrorName));
            var queueInfo = JSON.parse(localStorage.getItem(this.queueInfoName));
            if ((queueInfo && queueInfo.length > 0) ||
                (queueError && queueError.length > 0)) {
                this.isWaiting = true;
                var data = {
                    type: product,
                    info: queueInfo,
                    error: queueError,
                };
                if (navigator.sendBeacon) {
                    this.sendDataThroughUserAgent(url, data);
                }
                else {
                    this.sendDataThroughAjaxRequest(url, data, isAsync);
                }
            }
        };
        FallbackLogger.prototype.isEnabled = function () {
            return !this.environment.isPageGenerator();
        };
        FallbackLogger.prototype.sendDataThroughUserAgent = function (url, data) {
            var successfullyTransfer = navigator.sendBeacon(url, JSON.stringify(data));
            if (successfullyTransfer) {
                this.clearQueues();
            }
            else {
                this.appendTemp();
            }
        };
        FallbackLogger.prototype.sendDataThroughAjaxRequest = function (url, data, isAsync) {
            var _this = this;
            jQuery
                .ajax({
                url: url,
                data: JSON.stringify(data),
                type: 'POST',
                async: isAsync,
            })
                .done(function () { return _this.clearQueues(); })
                .fail(function () { return _this.appendTemp(); });
        };
        FallbackLogger.prototype.clearQueues = function () {
            localStorage.setItem(this.queueErrorName, JSON.stringify(queueErrorTemp));
            localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfoTemp));
            queueErrorTemp.length = 0;
            queueInfoTemp.length = 0;
            this.isWaiting = false;
        };
        FallbackLogger.prototype.appendTemp = function () {
            var queueErrorStr = localStorage.getItem(this.queueErrorName);
            var queueInfoStr = localStorage.getItem(this.queueInfoName);
            if (queueErrorTemp.length > 0) {
                var queueError = queueErrorStr == null ? [] : JSON.parse(queueErrorStr);
                localStorage.setItem(this.queueErrorName, JSON.stringify(queueError.concat(queueErrorTemp)));
            }
            if (queueInfoTemp.length > 0) {
                var queueInfo = queueInfoStr == null ? [] : JSON.parse(queueInfoStr);
                localStorage.setItem(this.queueInfoName, JSON.stringify(queueInfo.concat(queueInfoTemp)));
            }
            this.isWaiting = false;
        };
        return FallbackLogger;
    }());
    exports.FallbackLogger = FallbackLogger;
});
/// <amd-module name="NetSuite.LogoList.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("NetSuite.LogoList.Instrumentation.Log", ["require", "exports", "NetSuite.LogoList.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign({}, defaultAttributes, attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return (!!navigator.userAgent.match(/Trident/g) ||
                !!navigator.userAgent.match(/MSIE/g));
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="NetSuite.LogoList.Instrumentation.Logger"/>
define("NetSuite.LogoList.Instrumentation.Logger", ["require", "exports", "NetSuite.LogoList.Instrumentation.Fallback.Logger", "NetSuite.LogoList.Instrumentation.MockAppender"], function (require, exports, Instrumentation_FallbackLogger_1, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger').LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] },
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return new Instrumentation_FallbackLogger_1.FallbackLogger(this.options);
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="NetSuite.LogoList.Instrumentation.MockAppender"/>
define("NetSuite.LogoList.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="NetSuite.LogoList.Instrumentation"/>
define("NetSuite.LogoList.Instrumentation", ["require", "exports", "underscore", "NetSuite.LogoList.Instrumentation.Logger", "NetSuite.LogoList.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="NetSuite.LogoList.LogoListCCT.Logo.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("NetSuite.LogoList.LogoListCCT.Logo.View", ["require", "exports", "Backbone", "netsuite_logolist_logo.tpl"], function (require, exports, Backbone_1, netsuite_logolist_logo_tpl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogoView = /** @class */ (function (_super) {
        __extends(LogoView, _super);
        function LogoView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = netsuite_logolist_logo_tpl;
            _this.target = options.target;
            return _this;
        }
        LogoView.prototype.getContext = function () {
            return {
                image: this.model.get('image'),
                link: this.model.get('link'),
                hasLink: this.model.get('hasLink'),
                alt: this.model.get('alt'),
                title: this.model.get('alt'),
                target: this.target,
                label: this.model.get('label'),
                hasLabel: !!this.model.get('label'),
            };
        };
        return LogoView;
    }(Backbone_1.View));
    exports.LogoView = LogoView;
});
/// <amd-module name="NetSuite.LogoListCCT.Utils"/>
define("NetSuite.LogoListCCT.Utils", ["require", "exports", "NetSuite.LogoList.Common.Utils"], function (require, exports, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fieldNamePrefix = 'custrecord_cct_ns_llcct_';
    function getSetting(settings, fieldName, defaultValue) {
        if (!settings) {
            return null;
        }
        var value = defaultValue ? defaultValue : '';
        var setValue = Utils_1.Utils.trim(settings[this.fieldNamePrefix + fieldName]);
        return setValue || value;
    }
    exports.getSetting = getSetting;
    function getSettings(settings, params, prefix) {
        var settingsObject = {};
        var okPrefix = prefix || '';
        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            var simpleParam = typeof param === 'string';
            var name_1 = simpleParam ? param : param.name;
            var fieldName = okPrefix +
                (simpleParam
                    ? param
                    : param.fieldName
                        ? param.fieldName
                        : param.name);
            var defaultValue = simpleParam || !param.default
                ? ''
                : param.default;
            settingsObject[name_1] = this.getSetting(settings, fieldName, defaultValue);
        }
        return settingsObject;
    }
    exports.getSettings = getSettings;
});
/// <amd-module name="NetSuite.LogoList.LogoListCCT.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("NetSuite.LogoList.LogoListCCT.View", ["require", "exports", "CustomContentType.Base.View", "Backbone.CollectionView", "Backbone", "jQuery", "NetSuite.LogoList.Common.Utils", "NetSuite.LogoList.LogoListCCT.Logo.View", "NetSuite.LogoList.Common.Instrumentation.Helper", "NetSuite.LogoListCCT.Utils", "netsuite_logolist_logolistcct.tpl", "jQuery.bxSlider@4.2.14"], function (require, exports, CustomContentTypeBaseView, BackboneCollectionView, Backbone, jQuery, Utils_1, LogoListCCT_Logo_View_1, Instrumentation_Helper_1, LogoListUtils, netsuite_logolist_logolistcct_tpl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogoListCCTView = /** @class */ (function (_super) {
        __extends(LogoListCCTView, _super);
        function LogoListCCTView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = netsuite_logolist_logolistcct_tpl;
            _this.events = {
                'click [data-action="sc-logolist-linkclick"]': 'logLinkClick',
            };
            _this.MAX_LOGO_COUNT = 12;
            _this.WRAPPER_CLASS = 'logolistcct-wrapper';
            _this.GRID_MARGIN_WRAPPER_CLASS = 'logolistcct-grid-margin-wrapper';
            _this.CAROUSEL_CONTROLS_WRAPPER_CLASS = 'logolistcct-carousel-controls-wrapper';
            _this.CAROUSEL_CONTAINER_CLASS = 'logolistcct-carousel-container';
            _this.BXSLIDER_WRAPPER_CLASS = 'logolistcct-bx-wrapper';
            _this.RESIZE_RERENDER_THRESHOLD = 100;
            _this.TEXT_COLOR_CLASS = {
                1: '',
                2: 'logolistcct-text-color-dark',
                3: 'logolistcct-text-color-light',
            };
            _this.preventLinkClickLog = false;
            if (options) {
                _this.container = options.container;
            }
            return _this;
        }
        LogoListCCTView.prototype.install = function (settings, contextData) {
            var _this = this;
            _super.prototype.install.call(this, settings, contextData);
            this.parseSettings();
            this.windowWidth = $(window).width();
            this.on('afterViewRender', function () {
                _this.initSlider();
            });
            this.logInformation();
            return jQuery.Deferred().resolve();
        };
        LogoListCCTView.prototype.update = function (settings) {
            _super.prototype.update.call(this, settings);
            this.parseSettings();
            return jQuery.Deferred().resolve();
        };
        LogoListCCTView.prototype.validateContextDataRequest = function () {
            return true;
        };
        LogoListCCTView.prototype.parseSettings = function () {
            this.logoList = {
                header: LogoListUtils.getSetting(this.settings, 'header', ''),
                cntDesktop: +LogoListUtils.getSetting(this.settings, 'cnt_desktop', '6'),
                cntTablet: +LogoListUtils.getSetting(this.settings, 'cnt_tablet', '3'),
                cntPhone: +LogoListUtils.getSetting(this.settings, 'cnt_phone', '2'),
                style: +LogoListUtils.getSetting(this.settings, 'style', '1'),
                newTab: LogoListUtils.getSetting(this.settings, 'newtab', 'F'),
                textColor: LogoListUtils.getSetting(this.settings, 'textcolor', '1'),
                logos: [],
                isEmpty: null,
                isCarousel: null,
                isGrid: null,
            };
            for (var i = 1; i <= this.MAX_LOGO_COUNT; i++) {
                var logo = LogoListUtils.getSettings(this.settings, [{ name: 'image', fieldName: 'image_url' }, 'link', 'alt', 'label'], i + "_");
                if (logo.image) {
                    logo.hasLink = !!logo.link;
                    this.logoList.logos.push(logo);
                }
            }
            this.logoList.isEmpty =
                !this.logoList.header && this.logoList.logos.length == 0;
            this.logoList.isCarousel =
                this.logoList.style == 2 &&
                    !Utils_1.Utils.oldIE() &&
                    this.logoList.logos.length > 0;
            this.logoList.isGrid = !this.logoList.isCarousel;
        };
        LogoListCCTView.prototype.getLogoCountPerLine = function () {
            var cnt = this.logoList.cntDesktop;
            if (Utils_1.Utils.isTabletDevice()) {
                cnt = this.logoList.cntTablet;
            }
            else if (Utils_1.Utils.isPhoneDevice()) {
                cnt = this.logoList.cntPhone;
            }
            return cnt;
        };
        LogoListCCTView.prototype.initSlider = function () {
            var _this = this;
            if (this.logoList.isCarousel) {
                setTimeout(function () {
                    _this._createSlider();
                }, 10);
            }
        };
        LogoListCCTView.prototype._createSlider = function () {
            var _this = this;
            var logoCount = this.getLogoCountPerLine();
            var renderSlider = logoCount < this.logoList.logos.length;
            var showControls = !!(renderSlider && Utils_1.Utils.isDesktopDevice());
            var wrapper = this.$('.' + this.WRAPPER_CLASS);
            if (showControls) {
                wrapper.removeClass(this.GRID_MARGIN_WRAPPER_CLASS);
                if (!wrapper.hasClass(this.CAROUSEL_CONTROLS_WRAPPER_CLASS)) {
                    wrapper.addClass(this.CAROUSEL_CONTROLS_WRAPPER_CLASS);
                }
            }
            else {
                wrapper.removeClass(this.CAROUSEL_CONTROLS_WRAPPER_CLASS);
                if (logoCount <= this.logoList.logos.length &&
                    !wrapper.hasClass(this.GRID_MARGIN_WRAPPER_CLASS)) {
                    wrapper.addClass(this.GRID_MARGIN_WRAPPER_CLASS);
                }
            }
            if (renderSlider) {
                if (!this.currentSlide) {
                    this.currentSlide = 0;
                }
                var sliderSettings = {
                    moveSlides: 1,
                    maxSlides: logoCount,
                    minSlides: 1,
                    slideWidth: this.$('.' + this.CAROUSEL_CONTAINER_CLASS).width() / logoCount,
                    infiniteLoop: true,
                    slideMargin: 0,
                    hideControlOnEnd: true,
                    responsive: true,
                    pager: true,
                    nextText: '<a class="logolistcct-next-icon"></a>',
                    prevText: '<a class="logolistcct-prev-icon"></a>',
                    controls: showControls,
                    wrapperClass: this.BXSLIDER_WRAPPER_CLASS,
                    startSlide: this.currentSlide,
                    onSlideAfter: function () {
                        _this.currentSlide = _this.sliderContainer
                            ? _this.sliderContainer.getCurrentSlide()
                            : 0;
                    },
                    onSliderResize: function () {
                        _this.resizeSlider();
                    },
                };
                if (!this.$('.' + this.BXSLIDER_WRAPPER_CLASS).length) {
                    this.sliderContainer = this.$('.' + this.CAROUSEL_CONTAINER_CLASS).bxSliderNew(sliderSettings);
                }
            }
        };
        LogoListCCTView.prototype.resizeSlider = function () {
            var newWidth = $(window).width();
            if (Math.abs(newWidth - this.windowWidth) > this.RESIZE_RERENDER_THRESHOLD) {
                this.windowWidth = newWidth;
                var newType = Utils_1.Utils.getDeviceType(newWidth);
                var oldType = Utils_1.Utils.getDeviceType(this.windowWidth);
                if (this.logoList.isCarousel && newType == oldType) {
                    if (this.sliderContainer) {
                        this.sliderContainer.destroySlider();
                        this.sliderContainer = null;
                        this._createSlider();
                    }
                }
            }
        };
        Object.defineProperty(LogoListCCTView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    'NetSuite.LogoList.LogoListCCT.Logo.View': function () {
                        return new BackboneCollectionView({
                            childView: LogoListCCT_Logo_View_1.LogoView,
                            collection: new Backbone.Collection(_this.logoList.logos),
                            childViewOptions: {
                                target: _this.logoList.newTab == 'T' ? '_blank' : '_self',
                            },
                        });
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        LogoListCCTView.prototype.getContext = function () {
            return {
                hasHeader: !!this.logoList.header,
                header: this.logoList.header,
                cntDesktop: this.logoList.cntDesktop,
                cntTablet: this.logoList.cntTablet,
                cntPhone: this.logoList.cntPhone,
                isEmpty: this.logoList.isEmpty,
                type: this.logoList.isGrid ? 'grid' : 'carousel',
                wrapperClass: this.logoList.isGrid ? this.GRID_MARGIN_WRAPPER_CLASS : '',
                textColorClass: this.TEXT_COLOR_CLASS[+this.logoList.textColor],
            };
        };
        LogoListCCTView.prototype.logLinkClick = function (event) {
            var _this = this;
            // Prevents double logs apparently caused by bxSlider
            if (this.preventLinkClickLog) {
                return;
            }
            this.preventLinkClickLog = true;
            setTimeout(function () {
                _this.preventLinkClickLog = false;
            }, 100);
            Instrumentation_Helper_1.InstrumentationHelper.log('Link clicked');
        };
        LogoListCCTView.prototype.logInformation = function () {
            this.logLayout();
            this.logQuantityOfLogos();
        };
        LogoListCCTView.prototype.logLayout = function () {
            var layout;
            if (this.logoList.isCarousel) {
                layout = 'Carousel';
            }
            else {
                layout = 'Grid';
            }
            Instrumentation_Helper_1.InstrumentationHelper.log('Layout', layout);
        };
        LogoListCCTView.prototype.logQuantityOfLogos = function () {
            Instrumentation_Helper_1.InstrumentationHelper.log('Quantity of logos', "" + this.logoList.logos.length);
        };
        return LogoListCCTView;
    }(CustomContentTypeBaseView));
    exports.LogoListCCTView = LogoListCCTView;
});
/// <amd-module name="NetSuite.LogoList.LogoListCCT"/>
define("NetSuite.LogoList.LogoListCCT", ["require", "exports", "NetSuite.LogoList.LogoListCCT.View"], function (require, exports, LogoListCCT_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            this.registerCCT(container);
        },
        registerCCT: function (container) {
            container.getComponent('CMS').registerCustomContentType({
                id: 'cct_netsuite_logolist',
                view: LogoListCCT_View_1.LogoListCCTView,
                options: {
                    container: container,
                },
            });
        },
    };
});
/// <amd-module name="NetSuite.LogoList.LogoListModule"/>
define("NetSuite.LogoList.LogoListModule", ["require", "exports", "NetSuite.LogoList.LogoListCCT", "NetSuite.LogoList.Common.Instrumentation.Helper"], function (require, exports, LogoListCCT, Instrumentation_Helper_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            Instrumentation_Helper_1.InstrumentationHelper.initializeInstrumentation(container);
            LogoListCCT.mountToApp(container);
        },
    };
});
};
extensions['SC.ManorThemeExtension.3.4.0'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SC/ManorThemeExtension/3.4.0/' + asset;
};
define("SC.ManorThemeExtension.ApplicationSkeleton.Layout", [
  "SC.ManorThemeExtension.Common.Configuration",
  "SC.ManorThemeExtension.Common.UtilitiesHelper",
], function QSApplicationSkeletonLayout(Configuration, Utils) {
  "use strict";
  return {
    loadModule: function loadModule() {
      jQuery(window).scroll(function () {        
        var y = jQuery(this).scrollTop();
        //Mobile fixed header is not optional, so we'll run it from outside the fixedHeader conditional.
        if ($(window).width() < 768) {//checking the screen-size
          if (jQuery('header').hasClass('checkout-layout-header')) {
            //do nothing
          } else {
            if (y >= 100 && y < 200) {//the header is a lot smaller, so we'll set a 100points scroll instead of 300
              jQuery('body').addClass('fixed-header-mobile');
              jQuery('#main-container').css('padding-top',  jQuery('#site-header').outerHeight(true));
            }
            if (y < 99) {
              jQuery('#main-container').css('padding-top', 0);
              jQuery('body').removeClass('fixed-header-mobile');
            }
          }
        }
      });
    }
  };
});
define('SC.ManorThemeExtension.Categories.Thumbnail', [
  'Categories',
  'underscore'
], function ThemeExtensionCategoriesThumbnail(Categories, _) {
  'use strict';
  _.extend(Categories, {
    /* eslint-disable */
    makeNavigationTab: _.wrap(
      Categories.makeNavigationTab,
      function navigationData(fn, categories) {
        fn.apply(this, _.toArray(arguments).slice(1));
        var result = [];
        var self = this;
        _.each(categories, function (category) {
          var href = category.fullurl;
          var tab = {
            href: href,
            text: category.name,
            data: {
              hashtag: '#' + href,
              touchpoint: 'home'
            },
            class: 'header-menu-level' + category.level + '-anchor',
            'data-type': 'commercecategory',
            thumbnailurl: category.thumbnailurl
          };
          if (category.categories) {
            tab.categories = self.makeNavigationTab(category.categories);
          }
          result.push(tab);
        });
        return result;
      }
    )
    /* eslint-enable */
  });
});
define('SC.ManorThemeExtension.Common.Configuration', [], function () {
  'use strict';
  var environment = null;
  return {
    setEnvironment: function (environmentComponent) {
      environment = environmentComponent;
    },
    get: function (key) {
      if (environment) {
        return environment.getConfig(key);
      }
      console.error('Please set the Env.Component in the Layout Helper.');
      return null;
    },
    getOverallConfiguration: function () {
      return environment.application.getConfig();
    }
  };
});
define('SC.ManorThemeExtension.Common.LayoutHelper', [], function () {
  'use strict';
  var layoutComponent = null;
  return {
    setLayoutComponent: function (environmentComponent) {
      layoutComponent = environmentComponent;
    },
    addToViewContextDefinition: function (
      viewId,
      propertyName,
      type,
      callback
    ) {
      if (layoutComponent) {
        return layoutComponent.addToViewContextDefinition(
          viewId,
          propertyName,
          type,
          callback
        );
      }
      console.error('Please set the Layout Component in the Layout Helper.');
      return null;
    }
  };
});
define('SC.ManorThemeExtension.Common.UtilitiesHelper', [], function () {
    'use strict';
    return {
      toggleViewportToMobileSupport: function toggleViewportToMobileSupport() {
        var viewport = document.head.querySelector("meta[name='viewport']");
        var mobileSupport = "width=device-width, initial-scale=1.0";
        viewport.content = mobileSupport;
      },
      // This was added because isPhoneDevice property is not exposed yet, 
      // This helper was added because the following enhacement: https://jira.corp.netsuite.com/browse/SCTHEMES-415
      // Snippet extracted from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
      isMobile: function isMobile() {
        var hasTouchScreen = false;
        if ("maxTouchPoints" in navigator) {
          hasTouchScreen = navigator.maxTouchPoints > 0;
        } else if ("msMaxTouchPoints" in navigator) {
          hasTouchScreen = navigator.msMaxTouchPoints > 0;
        } else {
          var mQ = window.matchMedia && matchMedia("(pointer:coarse)");
          if (mQ && mQ.media === "(pointer:coarse)") {
            hasTouchScreen = !!mQ.matches;
          } else if ('orientation' in window) {
            hasTouchScreen = true; // deprecated, but good fallback
          } else {
            // Only as a last resort, fall back to user agent sniffing
            var UA = navigator.userAgent;
            hasTouchScreen = (
              /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
              /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
            );
          }
        }
        return hasTouchScreen;
      }
    };
  });
define('SC.ManorThemeExtension.ErrorManagement.PageNotFound.View', [
  'underscore',
  'SC.ManorThemeExtension.Common.Configuration',
  'SC.ManorThemeExtension.Common.LayoutHelper'
], function ThemeExtensionErrorManagementPageNotFoundView(
  _,
  Configuration,
  LayoutHelper
) {
  'use strict';
  return {
    loadModule: function loadModule() {
      LayoutHelper.addToViewContextDefinition(
        'ErrorManagement.PageNotFound.View',
        'extraErrorMgtPageNotFoundView',
        'object',
        function () {
          return {
            backgroundImage: Configuration.get(
              'errorManagementPageNotFound.pageNotFoundBgrImg'
            ),
            backgroundColor: Configuration.get(
              'errorManagementPageNotFound.bkgdColor'
            ),
            title: Configuration.get('errorManagementPageNotFound.title'),
            text: Configuration.get('errorManagementPageNotFound.text'),
            btnText: Configuration.get('errorManagementPageNotFound.btnText'),
            btnHref: Configuration.get('errorManagementPageNotFound.btnHref')
          };
        }
      );
    }
  };
});
define('SC.ManorThemeExtension.Footer', [
  'underscore',
  'SC.ManorThemeExtension.Common.Configuration',
  'SC.ManorThemeExtension.Common.LayoutHelper',
  'jQuery'
], function ThemeExtensionFooter(_, Configuration, LayoutHelper, jQuery) {
  'use strict';
  var getColLinks = function getColLinks(whichColumn) {
    // for large format footer with up to four columns of links
    var multiColLinks = Configuration.get('footer.multiColLinks', []);
    var targetColLinks = jQuery.grep(multiColLinks, function targetColLinks(e) {
      return e.column === whichColumn;
    });
    return targetColLinks;
  };
  return {
    loadModule: function loadModule() {
      // for Social Media Links
      var socialMediaLinks = Configuration.get('footer.socialMediaLinks', []);
      // for Copyright message
      var initialConfigYear = Configuration.get('footer.copyright.initialYear');
      var initialYear = initialConfigYear
        ? parseInt(initialConfigYear, 10)
        : new Date().getFullYear();
      var currentYear = new Date().getFullYear();
      LayoutHelper.addToViewContextDefinition(
        'Footer.View',
        'extraFooterView',
        'object',
        function () {
          return {
            col1Links: getColLinks('Column 1'),
            col2Links: getColLinks('Column 2'),
            col3Links: getColLinks('Column 3'),
            col4Links: getColLinks('Column 4'),
            socialMediaLinks: socialMediaLinks,
            copyright: {
              hide: !!Configuration.get('footer.copyright.hide'),
              companyName: Configuration.get('footer.copyright.companyName'),
              initialYear: initialYear,
              currentYear: currentYear,
              showRange: initialYear < currentYear
            },
            text: Configuration.get('footer.text'),
            newsletterText: Configuration.get('footer.newsletterText'),
            socialMediaTitle: Configuration.get('footer.socialMediaTitle'),
            showLegacyNewsletter: Configuration.get(
              'footer.showLegacyNewsletter'
            )
          };
        }
      );
    }
  };
});
define('SC.ManorThemeExtension.Header', [
  'underscore',
  'SC.ManorThemeExtension.Common.Configuration',
  'SC.ManorThemeExtension.Common.LayoutHelper'
], function ThemeExtensionHeader(_, Configuration, LayoutHelper) {
  'use strict';
  return {
    loadModule: function loadModule() {
      LayoutHelper.addToViewContextDefinition(
        'Header.View',
        'extraHeaderView',
        'object',
        function () {
          return {
            bannertext: Configuration.get('header.bannerText')
          };
        }
      );
    }
  };
});
define('SC.ManorThemeExtension.Home', [
  'underscore',
  'SC.ManorThemeExtension.Common.Configuration',
  'SC.ManorThemeExtension.Common.LayoutHelper'
], function ThemeExtensionHome(_, Configuration, LayoutHelper) {
  'use strict';
  return {
    loadModule: function loadModule() {
      // for Carousel
      var carousel = Configuration.get('home.themeCarouselImages', []);
      var infoBlocks = Configuration.get('home.infoblock', []);
      var infoBlocksMore = Configuration.get('home.infoblockmore', []);
      var showCarousel = false;
      var carouselObj;
      var isReady = false;
      var heros = Configuration.get('home.hero', []);
      var firstHero = heros[0];
      LayoutHelper.addToViewContextDefinition(
        'Home.View',
        'extraHomeView',
        'object',
        function (context) {
          carouselObj = context.carousel;
          isReady =
            _.has(context, 'isReady') && !_.isUndefined(context.isReady)
              ? context.isReady
              : true;
          if (!_.isEmpty(carouselObj)) {
            _.each(carouselObj, function (carousel) {
              if (!_.isEmpty(carousel.image)) {
                _.extend(carousel, {
                  isAbsoluteUrl: carousel.image.indexOf('core/media') !== -1
                });
              }
            });
          } else {
            carouselObj = carousel;
          }
          return {
            isReady: isReady,
            showCarousel: carouselObj && !!carouselObj.length,
            carousel: carouselObj,
            showInfoblocks: infoBlocks && !!infoBlocks.length,
            infoBlocks: infoBlocks,
            showInfoblocksMore: infoBlocksMore && !!infoBlocksMore.length,
            infoBlocksMore: infoBlocksMore,
            hero: firstHero
          };
        }
      );
    }
  };
});
define('SC.ManorThemeExtension.HomeCMS', [
    'home_layout_flex.tpl',
    'Utils',
    'underscore'
], function (
    home_layout_flex,
    Utils,
    _
) {
    'use strict';
    return  {
        mountToApp: function mountToApp (application) {
            var pageType = application.getComponent('PageType');
            pageType.registerTemplate({
                pageTypes: ['home-page'],
                template: {
                    name: 'home_layout_flex.tpl',
                    displayName: 'Home Flex',
                    thumbnail: Utils.getThemeAbsoluteUrlOfNonManagedResources('img/layout-home-flex.png')
                }
            });
        }
    };
});
define('SC.ManorThemeExtension.ItemRelations.SC.Configuration', [
  'SC.ManorThemeExtension.Common.Configuration'
], function ThemeExtensionItemRelations(Configuration) {
  'use strict';
  return {
    loadModule: function loadModule() {
      var overallConfiguration = Configuration.getOverallConfiguration();
      if (
        overallConfiguration.bxSliderDefaults &&
        overallConfiguration.bxSliderDefaults.slideWidth
      ) {
        overallConfiguration.bxSliderDefaults.slideWidth = 300;
        overallConfiguration.bxSliderDefaults.maxSlides = 4;
      }
    }
  };
});
define('SC.ManorThemeExtension.LoadWebFont', [
  'SC.ManorThemeExtension.Common.Configuration'
], function SCManorThemeExtensionLoadWebFont(Configuration) {
  'use strict';
  return {
    loadModule: function loadModule() {
      if (
        Configuration.get('manor.webFonts.isWebFontEnabled') &&
        Configuration.get('manor.webFonts.isWebFontAsync')
      ) {
        window.WebFontConfig = Configuration.get(
          'manor.webFonts.webFontConfig'
        );
        if (SC.ENVIRONMENT.jsEnvironment === 'browser') {
          (function (d) {
            var wf = d.createElement('script'),
              s = d.scripts[0];
            wf.src =
              ('https:' == document.location.protocol ? 'https' : 'http') +
              '://ajax.googleapis.com/ajax/libs/webfont/1.5.18/webfont.js';
            wf.type = 'text/javascript';
            wf.async = 'true';
            s.parentNode.insertBefore(wf, s);
          })(document);
        }
      }
    }
  };
});
define('SC.ManorThemeExtension.Shopping', [
  'SC.ManorThemeExtension.ApplicationSkeleton.Layout',
  'SC.ManorThemeExtension.Header',
  'SC.ManorThemeExtension.Footer',
  'SC.ManorThemeExtension.Home',
  'SC.ManorThemeExtension.HomeCMS',
  'SC.ManorThemeExtension.ErrorManagement.PageNotFound.View',
  'SC.ManorThemeExtension.Categories.Thumbnail',
  'SC.ManorThemeExtension.ItemRelations.SC.Configuration',
  'SC.ManorThemeExtension.LoadWebFont',
  'SC.ManorThemeExtension.Common.Configuration',
  'SC.ManorThemeExtension.Common.LayoutHelper',
  'SC.ManorThemeExtension.Common.UtilitiesHelper',
  'Utils',
  'underscore'
], function horizonThemeExtensionShoppingEntryPoint(
  ManorThemeApplicationLayout,
  ManorThemeExtHeader,
  ManorThemeExtFooter,
  ManorThemeExtHome,
  ManorThemeExtHomeCMS,
  ManorThemeExtErrorManagementPageNotFoundView,
  ManorThemeExtCategoriesThumbnail,
  ManorThemeExtItemRelations,
  ManorThemeExtLoadWebFont,
  Configuration,
  LayoutHelper,
  UtilitiesHelper,
  Utils,
  _
) {
  'use strict';
  return {
    mountToApp: function (container) {
      UtilitiesHelper.toggleViewportToMobileSupport();
      Configuration.setEnvironment(container.getComponent('Environment'));
      LayoutHelper.setLayoutComponent(container.getComponent('Layout'));
      ManorThemeApplicationLayout.loadModule();
      this.overwriteBxSliderInitialization();
      ManorThemeExtHeader.loadModule();
      ManorThemeExtFooter.loadModule();
      ManorThemeExtHome.loadModule();
      ManorThemeExtHomeCMS.mountToApp(container);
      ManorThemeExtErrorManagementPageNotFoundView.loadModule();
      ManorThemeExtItemRelations.loadModule();
      ManorThemeExtLoadWebFont.loadModule();
    },
    overwriteBxSliderInitialization: function () {
      Utils.initBxSlider = _.initBxSlider = _.wrap(
        _.initBxSlider,
        function initBxSlider(fn) {
          var autoPlayCarousel = Configuration.get('home.autoPlayCarousel');
          var carouselSpeed = Configuration.get('home.carouselSpeed');
          if (
            arguments.length !== 0 &&
            arguments[1] &&
            arguments[1][0] &&
            arguments[1][0].id === 'home-image-slider-list'
          ) {
            arguments[2] = _.extend(arguments[2], {
              auto: autoPlayCarousel,
              pause: carouselSpeed
            });
          }
          return fn.apply(this, _.toArray(arguments).slice(1));
        }
      );
    }
  };
});
};
extensions['SuiteCommerce.NewsletterSignUp.1.1.2'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/NewsletterSignUp/1.1.2/' + asset;
};
/// <amd-module name="SuiteCommerce.Newsletter.Instrumentation.Helper"/>
define("SuiteCommerce.Newsletter.Instrumentation.Helper", ["require", "exports", "SuiteCommerce.Newsletter.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ComponentArea = 'SC Newsletter Sign Up';
    var ExtensionVersion = '1.1.2';
    var QueueNameSuffix = '-Newsletter';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (container) {
            Instrumentation_1.default.initialize({
                environment: container.getComponent('Environment'),
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                }
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.Newsletter.ExtMessage.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Newsletter.ExtMessage.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ExtMessageModel = /** @class */ (function (_super) {
        __extends(ExtMessageModel, _super);
        function ExtMessageModel(options) {
            return _super.call(this, options) || this;
        }
        Object.defineProperty(ExtMessageModel.prototype, "message", {
            get: function () {
                return this.get('message');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ExtMessageModel.prototype, "type", {
            get: function () {
                return this.get('type');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ExtMessageModel.prototype, "closable", {
            get: function () {
                return this.get('closable');
            },
            enumerable: true,
            configurable: true
        });
        return ExtMessageModel;
    }(Backbone_1.Model));
    exports.ExtMessageModel = ExtMessageModel;
});
/// <amd-module name="SuiteCommerce.Newsletter.ExtMessage.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Newsletter.ExtMessage.View", ["require", "exports", "Backbone", "sc_ext_message.tpl"], function (require, exports, Backbone_1, MessageViewTemplate) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ExtMessageView = /** @class */ (function (_super) {
        __extends(ExtMessageView, _super);
        function ExtMessageView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = MessageViewTemplate;
            _this.events = {
                'click [data-action="ext-message-close-message"]': 'closeMessage',
            };
            return _this;
        }
        ;
        ExtMessageView.prototype.closeMessage = function () {
            this.remove();
        };
        ;
        ExtMessageView.prototype.getContext = function () {
            return {
                showMessage: this.model.message.length > 0,
                message: this.model.message,
                isClosable: this.model.closable,
                type: this.model.type ? this.model.type : '',
            };
        };
        return ExtMessageView;
    }(Backbone_1.View));
    exports.ExtMessageView = ExtMessageView;
});
/// <amd-module name="SuiteCommerce.Newsletter.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.Newsletter.Instrumentation.Log", ["require", "exports", "SuiteCommerce.Newsletter.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.Newsletter.Instrumentation.Logger"/>
define("SuiteCommerce.Newsletter.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.Newsletter.Instrumentation.MockAppender"], function (require, exports, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger')
                    .LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] }
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return {
                    info: function (obj) { },
                    error: function (obj) { }
                };
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.Newsletter.Instrumentation.MockAppender"/>
define("SuiteCommerce.Newsletter.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.Newsletter.Instrumentation"/>
define("SuiteCommerce.Newsletter.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.Newsletter.Instrumentation.Logger", "SuiteCommerce.Newsletter.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.Newsletter.NewsletterCCT.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.Newsletter.NewsletterCCT.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NewsletterCCTModel = /** @class */ (function (_super) {
        __extends(NewsletterCCTModel, _super);
        function NewsletterCCTModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.urlRoot = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_ext_sl_newsletter_sp&deploy=customdeploy_ns_sc_ext_sl_newsletter_sp';
            return _this;
        }
        return NewsletterCCTModel;
    }(Backbone_1.Model));
    exports.NewsletterCCTModel = NewsletterCCTModel;
});
/// <amd-module name="SuiteCommerce.Newsletter.NewsletterCCT.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.Newsletter.NewsletterCCT.View", ["require", "exports", "SuiteCommerce.Newsletter.NewsletterCCT.Model", "CustomContentType.Base.View", "Backbone.FormView", "SuiteCommerce.Newsletter.ExtMessage.View", "netsuite_newslettercct.tpl", "jQuery", "underscore", "SuiteCommerce.Newsletter.Instrumentation", "SuiteCommerce.Newsletter.ExtMessage.Model"], function (require, exports, SuiteCommerce_Newsletter_NewsletterCCT_Model_1, CustomContentTypeBaseView, BackboneFormView, ExtMessage_View_1, NetsuiteNewslettersCCTTpl, jQuery, _, Instrumentation_1, ExtMessage_Model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NewsletterCCTView = /** @class */ (function (_super) {
        __extends(NewsletterCCTView, _super);
        function NewsletterCCTView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = NetsuiteNewslettersCCTTpl;
            _this.model = new SuiteCommerce_Newsletter_NewsletterCCT_Model_1.NewsletterCCTModel();
            _this.fieldNamePrefix = 'custrecord_cct_ns_news_';
            _this.state = {
                code: '',
                message: '',
                messageType: '',
            };
            _this.events = {
                'submit form': 'doSubscribe',
            };
            _this.bindings = {
                '[name="email"]': 'email',
                '[name="firstName"]': 'firstName',
                '[name="lastName"]': 'lastName',
                '[name="company"]': 'company',
            };
            _this.LAYOUT = {
                '1': 'horizontal',
                '2': 'vertical',
                '3': 'left',
                '4': 'right',
            };
            _this.MIN_WIDTH_LAYOUT = 380;
            _this.container = options.container;
            BackboneFormView.add(_this);
            return _this;
        }
        NewsletterCCTView.prototype.parseSettings = function () {
            var resizeId;
            this.newsletterSettings = {
                imgresize: this.getSetting('imgresize'),
                bgimg_url: this.getSetting('bgimg_url'),
                header: this.getSetting('header'),
                subHeader: this.getSetting('subheader'),
                buttonText: this.getSetting('buttontext'),
                showFirstName: this.getSetting('showfirst', 'F') === 'T',
                showLastName: this.getSetting('showlast', 'F') === 'T',
                showCompany: this.getSetting('showcompany', 'F') === 'T',
                optionalFirstName: this.getSetting('optfirst', 'F') === 'T',
                optionalLastName: this.getSetting('optlast', 'F') === 'T',
                optionalCompany: this.getSetting('optcompany', 'F') === 'T',
                firstName: this.getSetting('placefirst'),
                lastName: this.getSetting('placelast'),
                company: this.getSetting('placecompany'),
                email: this.getSetting('placeemail', 'username@domain.com'),
                labelFirstName: this.getSetting('labelfirst'),
                labelLastName: this.getSetting('labellast'),
                labelCompany: this.getSetting('labelcompany'),
                labelEmail: this.getSetting('labelemail'),
                leadSubsidiary: this.container
                    .getComponent('Environment')
                    .getConfig('newsletterSignUp.leadSubsidiary'),
                termsLabel: this.getSetting('termslabel'),
                termsLink: this.getSetting('termslink'),
                hasLink: !!this.getSetting('termslink'),
                layout: this.LAYOUT[this.getSetting('layout', '1')],
            };
            if (this.newsletterSettings.bgimg_url &&
                this.newsletterSettings.imgresize) {
                resizeId = this.findResizeId();
                if (resizeId) {
                    this.newsletterSettings.bgimg_url += '&resizeid=' + resizeId;
                }
            }
            this.newsletterSettings.termsLabel =
                !this.newsletterSettings.termsLabel && !!this.newsletterSettings.termsLink
                    ? this.newsletterSettings.termsLink
                    : this.newsletterSettings.termsLabel;
            this.messages = {
                emailEmpty: this.getSetting('v_emailempty'),
                emailNotValid: this.getSetting('v_emailwrong'),
                firstNameEmpty: this.getSetting('v_fnameempty'),
                lastNameEmpty: this.getSetting('v_lnameempty'),
                companyEmpty: this.getSetting('v_companyempty'),
            };
            this.feedback = {
                OK: {
                    type: 'success',
                    message: this.getSetting('m_ok'),
                },
                ERR_USER_STATUS_ALREADY_SUBSCRIBED: {
                    type: 'warning',
                    message: this.getSetting('m_warn'),
                },
                ERR_USER_STATUS_DISABLED: {
                    type: 'error',
                    message: this.getSetting('m_emailerr'),
                },
                ERROR: {
                    type: 'error',
                    message: this.getSetting('m_err'),
                },
            };
        };
        NewsletterCCTView.prototype.getSetting = function (fieldName, defaultValue) {
            if (defaultValue === void 0) { defaultValue = ''; }
            if (!this.settings) {
                return null;
            }
            var setValue = jQuery.trim(this.settings[this.fieldNamePrefix + fieldName]);
            return setValue || defaultValue;
        };
        NewsletterCCTView.prototype.findResizeId = function () {
            var _this = this;
            var imagesizes = this.container
                .getComponent('Environment')
                .getSiteSetting('imagesizes');
            var found = _.find(imagesizes, function (imagesize) {
                return imagesize.name === _this.newsletterSettings.imgresize;
            });
            return found && found.internalid ? found.internalid : null;
        };
        NewsletterCCTView.prototype.install = function (settings, contextData) {
            var promise = jQuery.Deferred();
            _super.prototype.install.call(this, settings, contextData);
            this.parseSettings();
            this.updateModel();
            return promise.resolve();
        };
        NewsletterCCTView.prototype.update = function (settings) {
            _super.prototype.update.call(this, settings);
            this.parseSettings();
            this.updateModel();
            return jQuery.Deferred().resolve();
        };
        NewsletterCCTView.prototype.updateModel = function () {
            this.model.validation = {
                email: [
                    {
                        required: true,
                        msg: this.messages.emailEmpty,
                    },
                    {
                        pattern: 'email',
                        msg: this.messages.emailNotValid,
                    },
                ],
            };
            if (this.newsletterSettings.showLastName &&
                !this.newsletterSettings.optionalLastName) {
                this.model.validation.lastName = [
                    {
                        required: true,
                        msg: this.messages.lastNameEmpty,
                    },
                ];
            }
            if (this.newsletterSettings.showFirstName &&
                !this.newsletterSettings.optionalFirstName) {
                this.model.validation.firstName = [
                    {
                        required: true,
                        msg: this.messages.firstNameEmpty,
                    },
                ];
            }
            if (this.newsletterSettings.showCompany &&
                !this.newsletterSettings.optionalCompany) {
                this.model.validation.company = [
                    {
                        required: true,
                        msg: this.messages.companyEmpty,
                    },
                ];
            }
            this.model.set('subsidiary', this.getSubsidiary());
        };
        NewsletterCCTView.prototype.getSubsidiary = function () {
            var _this = this;
            var subsidiaries = this.container
                .getComponent('Environment')
                .getSiteSetting('subsidiaries');
            var subsidiary = _.find(subsidiaries, function (subsidiary) {
                return subsidiary.internalid === _this.newsletterSettings.leadSubsidiary;
            });
            if (!subsidiary) {
                subsidiary = _.find(subsidiaries, function (subsidiary) {
                    return subsidiary.isdefault === 'T';
                });
            }
            return subsidiary.internalid;
        };
        NewsletterCCTView.prototype.validateContextDataRequest = function () {
            return true;
        };
        NewsletterCCTView.prototype.getContext = function () {
            var context = __assign(__assign({}, _(this.newsletterSettings).clone()), { isFeedback: !!this.state.code, model: this.model });
            return context;
        };
        Object.defineProperty(NewsletterCCTView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    GlobalMessageFeedback: function () {
                        return new ExtMessage_View_1.ExtMessageView({ model: new ExtMessage_Model_1.ExtMessageModel({
                                message: _this.state.message,
                                type: _this.state.messageType,
                                closable: true,
                            }) });
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        NewsletterCCTView.prototype.doSubscribe = function (e) {
            var _this = this;
            var promise;
            var errorCode;
            var response;
            var leadRequestLog = Instrumentation_1.default.getLog('leadRequestLog');
            var errorCorrectionTrackingLog = Instrumentation_1.default.getLog('errorCorrectionTrackingLog');
            var leadProcessedLog = Instrumentation_1.default.getLog('leadProcessedLog');
            leadRequestLog.setParameters({
                activity: 'Time it takes for saving the entered values in newsletter form',
                clientContextURL: window.location.href,
            });
            errorCorrectionTrackingLog.setParameter('activity', 'Error correction tracking before submits newsletter form.');
            leadProcessedLog.setParameter('activity', 'Lead processed');
            e.preventDefault();
            promise = this.saveForm(e);
            if (promise) {
                leadRequestLog.startTimer();
                if (errorCorrectionTrackingLog.parametersToSubmit.submitAttemptsWithError) {
                    errorCorrectionTrackingLog.submit();
                    errorCorrectionTrackingLog.setParameter('submitAttemptsWithError', 0);
                }
                promise
                    .fail(function (jqXhr) {
                    response = jqXhr;
                    response.preventDefault = true;
                    var responseCauseName = jqXhr && jqXhr.responseJSON && jqXhr.responseJSON.cause && jqXhr.responseJSON.cause.name
                        ? jqXhr.responseJSON.cause.name
                        : '';
                    errorCode =
                        responseCauseName && _this.feedback[responseCauseName]
                            ? responseCauseName
                            : 'ERROR';
                    _this.state.code = errorCode;
                    _this.state.message = _this.feedback[errorCode].message;
                    _this.state.messageType = _this.feedback[errorCode].type;
                })
                    .done(function () {
                    leadRequestLog.endTimer();
                    var code = _this.model.get('code');
                    _this.state.code = code;
                    _this.state.message = _this.feedback[code].message;
                    _this.state.messageType = _this.feedback[code].type;
                    _this.model.set('email', '');
                    _this.model.set('firstName', '');
                    _this.model.set('lastName', '');
                    _this.model.set('company', '');
                    leadRequestLog.setParameters({
                        totalTime: leadRequestLog.getElapsedTimeForTimer(),
                    });
                    leadRequestLog.submit();
                    leadProcessedLog.setParameter('subType', _this.container
                        .getComponent('Environment')
                        .getConfig('newsletterSignUp.createCompanyLeads')
                        ? 'Company'
                        : 'Individual');
                    leadProcessedLog.submit();
                })
                    .always(_.bind(this.render, this));
            }
            else {
                this.trackErrorInFormBeforeSubmit();
            }
        };
        NewsletterCCTView.prototype.trackErrorInFormBeforeSubmit = function () {
            var errorCorrectionTrackingLog = Instrumentation_1.default.getLog('errorCorrectionTrackingLog');
            var submitAttemptsWithError = errorCorrectionTrackingLog.parametersToSubmit.submitAttemptsWithError;
            if (!submitAttemptsWithError) {
                errorCorrectionTrackingLog.setParameter('submitAttemptsWithError', 0);
                submitAttemptsWithError = 0;
            }
            errorCorrectionTrackingLog.setParameter('submitAttemptsWithError', submitAttemptsWithError + 1);
        };
        NewsletterCCTView.prototype.render = function () {
            var view = _super.prototype.render.call(this);
            if (this.isUsingHorizontalLayout()) {
                this.forceVerticalLayoutInSmallPlaceholders();
            }
            return view;
        };
        NewsletterCCTView.prototype.isUsingHorizontalLayout = function () {
            var horizontalLayout = this.LAYOUT['1'];
            return this.newsletterSettings.layout === horizontalLayout;
        };
        NewsletterCCTView.prototype.forceVerticalLayoutInSmallPlaceholders = function () {
            var _this = this;
            _.defer(_.bind(function () {
                if (_this.isRenderedInSmallPlaceholder()) {
                    _this.forceVerticalLayout();
                }
            }));
        };
        NewsletterCCTView.prototype.isRenderedInSmallPlaceholder = function () {
            var htmlElementWidth = this.$el.width();
            return htmlElementWidth < this.MIN_WIDTH_LAYOUT;
        };
        NewsletterCCTView.prototype.forceVerticalLayout = function () {
            this.newsletterSettings.layout = this.LAYOUT['2'];
            _super.prototype.render.call(this);
        };
        return NewsletterCCTView;
    }(CustomContentTypeBaseView));
    exports.NewsletterCCTView = NewsletterCCTView;
});
/// <amd-module name="SuiteCommerce.Newsletter.NewsletterCCT"/>
define("SuiteCommerce.Newsletter.NewsletterCCT", ["require", "exports", "SuiteCommerce.Newsletter.Instrumentation.Helper", "SuiteCommerce.Newsletter.NewsletterCCT.View"], function (require, exports, Instrumentation_Helper_1, SuiteCommerce_Newsletter_NewsletterCCT_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            Instrumentation_Helper_1.InstrumentationHelper.initializeInstrumentation(container);
            this.registerCCT(container);
        },
        registerCCT: function (container) {
            var cms = container.getComponent('CMS');
            cms.registerCustomContentType({
                id: 'cct_netsuite_newsletter',
                view: SuiteCommerce_Newsletter_NewsletterCCT_View_1.NewsletterCCTView,
                options: {
                    container: container,
                },
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.Newsletter.Main.Module"/>
define("SuiteCommerce.Newsletter.Main.Module", ["require", "exports", "SuiteCommerce.Newsletter.NewsletterCCT"], function (require, exports, NewsletterCCT) {
    "use strict";
    return {
        mountToApp: function (container) {
            NewsletterCCT.mountToApp(container);
        },
    };
});
};
extensions['SuiteCommerce.OrderStatus.1.0.3'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/OrderStatus/1.0.3/' + asset;
};
define('SuiteCommerce.OrderStatus.Configuration', [], function Configuration() {
  'use strict';
  return {
    environment: null,
    initialize: function initialize(container) {
      this.environment = container.getComponent('Environment');
    },
    get: function get(name) {
      if (this.environment) {
        return this.environment.getConfig(name);
      }
      return null;
    },
    getSiteSetting: function getSiteSetting(name){
      if (this.environment) {
        return this.environment.getSiteSetting(name);
      }
      return null;
    }
  };
});
define('SuiteCommerce.OrderStatus.Common.DependencyProvider', [
    'underscore',
    'GlobalViews.Message.View'
  ],
  function(
    _,
    MessageView) {
    'use strict';
    function isTranspiledModule(module) {
      var moduleKeys = Object.keys(module);
      return !_.isFunction(module) && moduleKeys.length === 1;
    }
    function getDependency(module) {
      if (isTranspiledModule(module)) {
        return module[Object.keys(module)[0]];
      }
      return module;
    }
    return {
      MessageView: getDependency(MessageView)
    };
  });
define('SuiteCommerce.OrderStatus.Instrumentation.FallbackLogger', [
  'Url',
  'jQuery'
], function define(
  Url,
  $
) {
  'use strict';
  var instance = null;
  var environment = null;
  function FallbackLogger() {
    var queueErrorTemp = [];
    var queueInfoTemp = [];
    var QUEUE_NAME_SUFFIX = '-OrderStatus';
    var QUEUE_ERROR_NAME = 'queueError' + QUEUE_NAME_SUFFIX;
    var QUEUE_INFO_NAME = 'queueInfo' + QUEUE_NAME_SUFFIX;
    var isWaiting = false;
    var self = this;
    if (this instanceof FallbackLogger) {
      throw new Error('Is not possible to create a new Logger. Please use getLogger method instead.');
    }
    this.isEnabled = function isEnabled() {
      return environment && !environment.isPageGenerator();
    };
    function clearQueues() {
      localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueErrorTemp));
      localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfoTemp));
      queueErrorTemp.length = 0;
      queueInfoTemp.length = 0;
      isWaiting = false;
    }
    function appendTemp() {
      var queueError = localStorage.getItem(QUEUE_ERROR_NAME);
      var queueInfo = localStorage.getItem(QUEUE_INFO_NAME);
      if (queueErrorTemp.length > 0) {
        queueError = queueError == null ? [] : JSON.parse(queueError);
        localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueError.concat(queueErrorTemp)));
      }
      if (queueInfoTemp.length > 0) {
        queueInfo = queueInfo == null ? [] : JSON.parse(queueInfo);
        localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfo.concat(queueInfoTemp)));
      }
      isWaiting = false;
    }
    function sendDataThroughUserAgent(url, data) {
      var successfullyTransfer = navigator.sendBeacon(url, JSON.stringify(data));
      if (successfullyTransfer) clearQueues();
      else appendTemp();
    }
    function sendDataThroughAjaxRequest(url, data, isAsync) {
      $.ajax({
        type: 'POST',
        url: url,
        data: JSON.stringify(data),
        async: isAsync
      }).success(clearQueues)
        .fail(appendTemp);
    }
    // eslint-disable-next-line complexity
    function processQueues(isAsync) {
      if (!self.isEnabled()) {
        return;
      }
      var data;
      var parsedURL = new Url().parse(SC.ENVIRONMENT.baseUrl);
      var product = SC.ENVIRONMENT.BuildTimeInf.product;
      var URL = parsedURL.schema + '://'
        + parsedURL.netLoc + '/app/site/hosting/scriptlet.nl?script=customscript_'
        + product.toLowerCase() + '_loggerendpoint&deploy=customdeploy_'
        + product.toLowerCase() + '_loggerendpoint';
      var queueError = JSON.parse(localStorage.getItem(QUEUE_ERROR_NAME));
      var queueInfo = JSON.parse(localStorage.getItem(QUEUE_INFO_NAME));
      if ((queueInfo && queueInfo.length > 0) || (queueError && queueError.length > 0)) {
        isWaiting = true;
        data = { type: product, info: queueInfo, error: queueError };
        if (navigator.sendBeacon) {
          sendDataThroughUserAgent(URL, data);
        } else {
          sendDataThroughAjaxRequest(URL, data, isAsync);
        }
      }
    }
    this.info = function info(obj) {
      var objWrapper = obj;
      var queueInfo;
      if (!this.isEnabled()) {
        return;
      }
      objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
      objWrapper.message = 'clientSideLogDateTime: ' + (new Date()).toISOString();
      if (isWaiting) {
        queueInfoTemp.push(objWrapper);
      } else {
        queueInfo = JSON.parse(localStorage.getItem(QUEUE_INFO_NAME)) || [];
        queueInfo.push(objWrapper);
        localStorage.setItem(QUEUE_INFO_NAME, JSON.stringify(queueInfo));
      }
    };
    this.error = function error(obj) {
      var queueError;
      var objWrapper = obj;
      if (!this.isEnabled()) {
        return;
      }
      objWrapper.suiteScriptAppVersion = SC.ENVIRONMENT.RELEASE_METADATA.version;
      objWrapper.message = 'clientSideLogDateTime: ' + (new Date()).toISOString();
      if (isWaiting) {
        queueErrorTemp.push(objWrapper);
      } else {
        queueError = JSON.parse(localStorage.getItem(QUEUE_ERROR_NAME)) || [];
        queueError.push(objWrapper);
        localStorage.setItem(QUEUE_ERROR_NAME, JSON.stringify(queueError));
      }
    };
    if (!this.isEnabled()) {
      return this;
    }
    setInterval(function setInterval() {
      processQueues(true);
    }, 60000);
    window.addEventListener('beforeunload', function addListener() {
      processQueues(false);
    });
    return this;
  }
  FallbackLogger.getLogger = function getLogger(localEnvironment) {
    environment=localEnvironment;
    instance = instance || FallbackLogger.apply({});
    return instance;
  };
  return FallbackLogger;
});
define(
  'SuiteCommerce.OrderStatus.Instrumentation.MockAppender', [],
  function define() {
    'use strict';
    return  {
     info : function info(data) {
        console.info('MockAppender - Info', data);
      },
      error : function error(data) {
        console.error('MockAppender - Error', data);
      },
      ready : function ready() {
        return true;
      },
      getInstance : function getInstance() {
        if (!this.instance) {
          this.instance = this;
        }
        return this.instance;
      },
      start : function start(action, options) {
        return options;
      },
      end : function end(startOptions, options) {}
    };
  });
define(
  'SuiteCommerce.OrderStatus.Instrumentation.Collection',
  [
    'SuiteCommerce.OrderStatus.Instrumentation.Model',
    'underscore',
    'Backbone'
  ],
  function define(
    model,
    _,
    Backbone
  ) {
    'use strict';
    return Backbone.Collection.extend({
      model: model
    });
  }
);
define(
  'SuiteCommerce.OrderStatus.Instrumentation.Model',
  [
    'SuiteCommerce.OrderStatus.Instrumentation.Logger',
    'Backbone',
    'underscore'
  ],
  function define(
    Logger,
    Backbone,
    _
  ) {
    'use strict';
    var DEFAULT_SEVERITY = 'info';
    return Backbone.Model.extend({
      defaults: function defaults() {
        return {
          parametersToSubmit: {},
          timer: {},
          severity: DEFAULT_SEVERITY
        };
      },
      startTimer: function startTimer() {
        var startTime = this.getTimestamp();
        var timer = this.get('timer');
        timer.startTime = startTime;
        this.set('timer', timer);
      },
      endTimer: function endTimer() {
        var endTime = this.getTimestamp();
        var timer = this.get('timer');
        timer.endTime = endTime;
        this.set('timer', timer);
      },
      getTimestamp: function getTimestamp() {
        if (!this.isOldInternetExplorer()) {
          return performance.now() || Date.now();
        }
        return Date.now();
      },
      getElapsedTimeForTimer: function getElapsedTimeForTimer() {
        var timer = this.get('timer');
        if (timer.startTime && timer.endTime) {
          if (timer.startTime > timer.endTime) {
            console.warn('Start time should be minor that end time in timer');
            return null;
          }
          return timer.endTime - timer.startTime;
        }
        if (!timer.startTime) console.warn('The Start time is not defined');
        if (!timer.endTime) console.warn('The End time is not defined');
        return null;
      },
      setParametersToSubmit: function setParametersToSubmit(data) {
        var self = this;
        _.each(data, function setLogParameter(value, parameter) {
          self.setParameterToSubmit(parameter, data[parameter]);
        });
      },
      setParameterToSubmit: function setParameterToSubmit(parameter, value) {
        var logData = this.get('parametersToSubmit');
        logData[parameter] = value;
        this.set('parametersToSubmit', logData);
      },
      setSeverity: function setSeverity(severity) {
        this.set('severity', severity);
      },
      submit: function submit() {
        if (!this.isOldInternetExplorer()) {
          switch (this.get('severity')) {
            case 'error':
              this.submitAsError();
              break;
            default:
              this.submitAsInfo();
          }
        }
      },
      isOldInternetExplorer: function isOldInternetExplorer() {
        return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
      },
      submitAsError: function submitAsError() {
        Logger.getLogger().error(this.get('parametersToSubmit'));
      },
      submitAsInfo: function submitAsInfo() {
        Logger.getLogger().info(this.get('parametersToSubmit'));
      }
    });
  }
);
define(
  'SuiteCommerce.OrderStatus.Instrumentation.InstrumentationHelper',
  [
    'SuiteCommerce.OrderStatus.Instrumentation.Model',
    'SuiteCommerce.OrderStatus.Instrumentation.Collection',
    'SuiteCommerce.OrderStatus.Instrumentation.Logger'
  ],
  function define(
    Log,
    LogCollection,
    Logger
  ) {
    'use strict';
    var logs = new LogCollection();
    return {
      logs: logs,
      initialize: function initialize(container) {
        Logger.initialize(container.getComponent('Environment'));
      },
      getLog: function getLog(logLabel) {
        return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
      },
      getLogModelByLabel: function getLogModelByLabel(label) {
        return this.logs.findWhere({
          label: label
        });
      },
      registerNewLog: function registerNewLog(label) {
        var log = new Log();
        log.set('label', label);
        this.logs.add(log);
        return log;
      },
      setParameterToSubmitForAllLogs: function setParameterToSubmitForAllLogs(parameter, value) {
        this.logs.each(function updateLog(log) {
          log.setParameterToSubmit(parameter, value);
        });
      },
      setParametersToSubmitForAllLogs: function setParametersToSubmitForAllLogs(data) {
        this.logs.each(function updateLog(log) {
          log.setParametersToSubmit(data);
        });
      },
      submitAllLogs: function submitAllLogs() {
        this.logs.each(function submitLog(log) {
          log.submit();
        });
      }
    };
  }
);
define(
  'SuiteCommerce.OrderStatus.Instrumentation.Logger',
  [
    'SuiteCommerce.OrderStatus.Instrumentation.FallbackLogger',
    'SuiteCommerce.OrderStatus.Instrumentation.MockAppender'
  ], function define(
    InstrumentationFallbackLogger,
    InstrumentationMockAppender
  ) {
    'use strict';
    var environment = null;
    var instance = null;
    var QUEUE_NAME_SUFFIX = '-OrderStatus';
    return {
      initialize: function initialize(localEnvironment) {
        environment = localEnvironment;
      },
      getLogger: function getLogger() {
        instance = instance || this.buildLoggerInstance();
        return instance;
      },
      buildLoggerInstance: function buildLoggerInstance() {
        var logConfig = {};
        try {
          var LoggersModule = require('Loggers').Loggers;
          var elasticAppender = require('Loggers.Appender.ElasticLogger')
            .LoggersAppenderElasticLogger.getInstance();
          var mockAppender = InstrumentationMockAppender.getInstance();
          var configurationModule = require('Loggers.Configuration');
          var loggerName = 'CommerceExtensions' + QUEUE_NAME_SUFFIX;
          logConfig[loggerName] = {
            log: [
              { profile: configurationModule.prod, appenders: [elasticAppender] },
              { profile: configurationModule.dev, appenders: [mockAppender] },
            ],
            actions: {},
            loggers: {},
          };
          LoggersModule.setConfiguration(logConfig);
          return LoggersModule.getLogger(loggerName);
        } catch (e) {
          return InstrumentationFallbackLogger.getLogger(environment);
        }
      },
    };
  });
define('SuiteCommerce.OrderStatus.Utils',
  [
    'SuiteCommerce.OrderStatus.Configuration',
    'Handlebars',
    'underscore'
  ],
  function define(
    Configuration,
    Handlebars,
    _
  ) {
    'use strict';
    var CONFIGURATION_SUBTAB_ID = 'orderstatus';
    function getConfigurationParameter(parameter) {
      return Configuration.get(CONFIGURATION_SUBTAB_ID + '.' + parameter);
    }
    function registerHandlevarsHelpers() {
      Handlebars.registerHelper('equals', function registerHelper(value1, value2, conf) {
        if (value1 === value2) {
          return conf.fn(this);
        }
        return conf.inverse(this);
      });
      Handlebars.registerHelper('isgreaterthan', function registerHelper(value1, value2, conf) {
        if (value1 > value2) {
          return conf.fn(this);
        }
        return conf.inverse(this);
      });
      Handlebars.registerHelper('islessthan', function registerHelper(value1, value2, conf) {
        if (value1 < value2) {
          return conf.fn(this);
        }
        return conf.inverse(this);
      });
    }
    // eslint-disable-next-line complexity
    function formatCurrency(value, symbol, noDecimalPosition) {
      var valueFloat = parseFloat(value);
      var negative = valueFloat < 0;
      var groupSeparator = ',';
      var decimalSeparator = '.';
      var negativePrefix = '(';
      var negativeSuffix = ')';
      var thousandString = '';
      var beforeValue = true;
      var valueString;
      var decimalPosition;
      var i;
      var symbolWrapper = symbol;
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(valueFloat)) {
        return value;
      }
      valueFloat = parseInt('' + (Math.abs(valueFloat) + 0.005) * 100, 10) / 100;
      valueString = valueFloat.toString();
      groupSeparator = Configuration.getSiteSetting('groupseparator');
      decimalSeparator = Configuration.getSiteSetting('decimalseparator');
      negativePrefix =  Configuration.getSiteSetting('negativeprefix');
      negativeSuffix =  Configuration.getSiteSetting('negativesuffix');
      valueString = valueString.replace('.', decimalSeparator);
      decimalPosition = valueString.indexOf(decimalSeparator);
      // if the string doesn't contains a .
      if (decimalPosition === -1) {
        if (!noDecimalPosition) {
          valueString += decimalSeparator + '00';
        }
        decimalPosition = valueString.indexOf(decimalSeparator);
      } else if (valueString.indexOf(decimalSeparator) === (valueString.length - 2)) {
        // if it only contains one number after the .
        valueString += '0';
      }
      for (i = valueString.length - 1; i >= 0; i -= 1) {
        // If the distance to the left of the decimal separator is a multiple
        // of 3 you need to add the group separator
        thousandString = (i > 0 && i < decimalPosition && (((decimalPosition - i) % 3) === 0) ? groupSeparator : '')
          + valueString[i] + thousandString;
      }
      if (!symbolWrapper) {
        symbolWrapper = '$';
      }
      valueString = beforeValue || _.isUndefined(beforeValue) ? symbolWrapper + thousandString
        : thousandString + symbolWrapper;
      return negative ? (negativePrefix + valueString + negativeSuffix) : valueString;
    }
    return {
      getConfigurationParameter: getConfigurationParameter,
      formatCurrency: formatCurrency,
      registerHandlevarsHelpers: registerHandlevarsHelpers
    };
  });
define('SuiteCommerce.OrderStatus.OrderFinder.Help.View',
  [
    'suitecommerce_orderstatus_search_form_help.tpl',
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone'
  ],
  function define(
    Template,
    Utils,
    Backbone
  ) {
    'use strict';
    return Backbone.View.extend({
      template: Template,
      initialize : function initialize(){
        this.title = Utils.getConfigurationParameter('helpLink');
      },
      getContext: function getContext() {
        return {
          body: Utils.getConfigurationParameter('helpText')
        };
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.ItemDetails.View',
  [
    'suitecommerce_orderstatus_itemdetails.tpl',
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone',
    'underscore'
  ],
  function define(
    Template,
    Utils,
    Backbone,
    _
  ) {
    'use strict';
    return Backbone.View.extend({
      template: Template,
      initialize: function initialize(options) {
        this.item = options.item;
        this.title = this.item.status;
      },
      getContext: function getContext() {
        return {
          sections: this.getSections()
        };
      },
      getSections: function getSections() {
        if (this.item.isForShipping) {
          return this.getItemForShippingSections();
        }
        return this.getItemForPickupSections();
      },
      getItemForShippingSections: function getItemForShippingSections() {
        var trackingLines = {
          lines: []
        };
        var addressLines = {
          lines: []
        };
        var addressLinesWithoutProcess;
        var addressName;
        _.each(this.item.trackingNumbers, function includeTrackingNumberLines(tracking) {
          trackingLines.lines.push({
            value: Utils.getConfigurationParameter('orderDetailsTrackPackageLabel') + ' ' + tracking,
            link: true,
            url: 'https://www.google.com/search?q=' + tracking
          });
        });
        trackingLines.lines.push({
          value: this.item.shippingMethod,
          small: true
        });
        addressLinesWithoutProcess = this.item.shippingAddress.split('\n');
        addressName = addressLinesWithoutProcess.shift();
        addressLines.lines.push({
          value: addressName,
          strong: true
        });
        _.each(addressLinesWithoutProcess, function processAddressLine(addressLine) {
          addressLines.lines.push({
            value: addressLine
          });
        });
        return [trackingLines, addressLines];
      },
      getItemForPickupSections: function getItemForPickupSections() {
        var location = this.item.location;
        var addressWithoutProcess = location.addressLines.split('\n');
        var addressLines = {
          lines: []
        };
        var officeDataLines = {
          lines: []
        };
        addressLines.lines.push({
          value: location.name,
          strong: true
        });
        addressWithoutProcess.shift();
        _.each(addressWithoutProcess, function addAddressLine(line) {
          addressLines.lines.push({
            value: line
          });
        });
        if (location.serviceHours.length > 1) {
          for (var i = 0; i < location.serviceHours.length; i++) {
            officeDataLines.lines.push({
              value: location.openingDaysPerServiceHour[i]
            });
            officeDataLines.lines.push({
              value: location.openingHoursPerServiceHour[i]
            });
          }
        } else {
          officeDataLines.lines.push({
            value: location.openingDays
          });
          officeDataLines.lines.push({
            value: location.openingHours
          });
        }
        officeDataLines.lines.push({
          value: location.phone
        });
        return [addressLines, officeDataLines];
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.Order.Model',
  [
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone'
  ],
  function define(
    Utils,
    Backbone
  ) {
    'use strict';
    return Backbone.Model.extend({
      urlRoot: '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_ext_sl_orderstatus_of&deploy=customdeploy_ns_sc_ext_sl_orderstatus_of',
      initialize: function initialize() {
        this.validation = {};
      },
      defaults: function defineDefaultsValues() {
        return {
          ordernumber: '',
          verificationfield: '',
          details: {}
        };
      },
      addValidationRuleForProperty: function addValidationRuleForProperty(field, rule) {
        if (!Object.prototype.hasOwnProperty.call(this.validation, field)) {
          this.validation[field] = [];
        }
        this.validation[field].push(rule);
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.OrderPaymentInfo.View',
  [
    'suitecommerce_orderstatus_payment_info.tpl',
    'Backbone',
    'SuiteCommerce.OrderStatus.Configuration',
    'SuiteCommerce.OrderStatus.Utils',
    'underscore'
  ],
  function define(
    Template,
    Backbone,
    Configuration,
    Utils,
    _
  ) {
    'use strict';
    return Backbone.View.extend({
      template: Template,
      initialize: function initialize(options) {
        this.paymentData = options.paymentData;
      },
      getContext: function getContext() {
        return {
          viewElements: {
            panelTitle: {
              label: Utils.getConfigurationParameter('orderDetailsPaymentSectionLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryLabel')
            },
            paymentMethodPanelTitle: {
              label: Utils.getConfigurationParameter('orderDetailsPaymentMethodLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsPaymentMethodLabel')
            },
            creditCardEndingLabel: {
              label: Utils.getConfigurationParameter('orderDetailsPaymentSectionEndingInLabel'),
              show: !!this.paymentData.creditCardEndingNumbers
            },
            billToPanelTitle: {
              label: Utils.getConfigurationParameter('orderDetailsPaymentSectionBillingLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsPaymentSectionBillingLabel')
            }
          },
          paymentData: this.getProcessedPaymentData()
        };
      },
      getProcessedPaymentData: function getProcessedPaymentData() {
        var paymentData = this.paymentData;
        var paymentMethodsInConfiguration = Configuration.get('siteSettings.paymentmethods');
        var addressLines;
        if (paymentData.billAddress) {
          addressLines = paymentData.billAddress.split('\n');
          paymentData.billAddressName = addressLines.shift();
          paymentData.addressLines = addressLines;
        }
        if (paymentData.method && paymentData.method.id) {
          _.each(paymentMethodsInConfiguration, function findImageUrlForPaymentMethod(method) {
            if (
              paymentData.method.id === method.internalid
              && method.imagesrc.length > 0
            ) {
              paymentData.thumbnailUrl = method.imagesrc[0];
            }
          });
        }
        return paymentData;
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.OrderSummary.View',
  [
    'suitecommerce_orderstatus_summary.tpl',
    'Backbone',
    'Handlebars',
    'SuiteCommerce.OrderStatus.Utils',
    'underscore'
  ],
  function define(
    Template,
    Backbone,
    Handlebars,
    Utils,
    _
  ) {
    'use strict';
    return Backbone.View.extend({
      template: Template,
      initialize: function initialize(options) {
        this.summaryData = options.summaryData;
        this.currency = options.currency;
      },
      getContext: function getContext() {
        return {
          viewElements: {
            panelTitle: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryLabel')
            },
            subtotal: {
              label: Utils.getConfigurationParameter('orderDetailsSummarySubtotal'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummarySubtotal')
            },
            discountTotal: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryDiscountTotal'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryDiscountTotal')
            },
            shippingCost: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryShippingTotal'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryShippingTotal')
            },
            taxtTotal: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryTaxTotal'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryTaxTotal')
            },
            giftCertApplied: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryGiftCertificate'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryGiftCertificate')
            },
            total: {
              label: Utils.getConfigurationParameter('orderDetailsSummaryTotal'),
              show: !!Utils.getConfigurationParameter('orderDetailsSummaryTotal')
            }
          },
          summaryData: this.formatSummaryData()
        };
      },
      formatSummaryData: function formatSummaryData() {
        var self = this;
        var summaryData = this.summaryData;
        _.each(_.keys(summaryData), function formatCurrency(key) {
          summaryData[key + '_formatted'] = Utils.formatCurrency(
            summaryData[key],
            self.currency.displaysymbol
          );
        });
        return summaryData;
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.Router',
  [
    'SuiteCommerce.OrderStatus.OrderFinder.SearchForm.View',
    'SuiteCommerce.OrderStatus.OrderFinder.SearchResults.View',
    'SuiteCommerce.OrderStatus.OrderFinder.Order.Model',
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone',
    'underscore'
  ],
  function define(
    SearchForm,
    SearchResults,
    OrderModel,
    Utils,
    Backbone,
    _
  ) {
    'use strict';
    return Backbone.Router.extend({
      initialize: function initialize(application) {
        this.application = application;
        this.model = new OrderModel();
        this.setupOrderDetailsListener();
      },
      routes: function routes() {
        var dynamicRoutes = {};
        dynamicRoutes[this.getOrderFinderRoute() + '(/)'] = 'openOrderFinderPage';
        dynamicRoutes[this.getOrderDetailsRoute() + '(/)'] = 'openOrderDetailsPage';
        return dynamicRoutes;
      },
      getOrderFinderRoute: function getOrderFinderRoute() {
        return Utils.getConfigurationParameter('route');
      },
      openOrderFinderPage: function openOrderFinderPage() {
        var view = new SearchForm({
          application: this.application,
          model: this.model
        });
        view.showContent();
      },
      getOrderDetailsRoute: function getOrderDetailsRoute() {
        return Utils.getConfigurationParameter('route') + '/details';
      },
      openOrderDetailsPage: function openOrderDetailsPage() {
        var searchResults;
        if (!_.keys(this.model.get('details')).length > 0) {
          Backbone.history.navigate(this.getOrderFinderRoute(), { trigger: true });
          return;
        }
        searchResults = new SearchResults({
          application: this.application,
          model: this.model
        });
        searchResults.showContent();
      },
      setupOrderDetailsListener: function setupOrderDetailsListener() {
        var self = this;
        this.model.on('sync', function navigateToOrderDetailsPage() {
          Backbone.history.navigate(self.getOrderDetailsRoute(), { trigger: true });
        });
        this.model.on('destroy', function navigateToOrderFinderPage() {
          self.model.clear();
          Backbone.history.navigate(self.getOrderFinderRoute(), { trigger: true });
        });
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.SearchForm.View',
  [
    'SuiteCommerce.OrderStatus.OrderFinder.Help.View',
    'SuiteCommerce.OrderStatus.Common.DependencyProvider',
    'suitecommerce_orderstatus_search_form.tpl',
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone',
    'Backbone.FormView',
    'Backbone.CompositeView',
    'underscore',
    'SuiteCommerce.OrderStatus.Instrumentation.InstrumentationHelper'
  ],
  function define(
    HelpView,
    DependencyProvider,
    Template,
    Utils,
    Backbone,
    BackboneFormView,
    BackboneCompositeView,
    _,
    InstrumentationHelper
  ) {
    'use strict';
    return Backbone.View.extend({
      template: Template,
      events: {},
      bindings: {},
      childViews: {
        'GlobalMessage.Feedback': function registerGlobalMessageFeedbackDataView() {
          return new DependencyProvider.MessageView({
            message: this.state.message,
            type: this.state.messageType,
            closable: true
          });
        }
      },
      initialize: function initialize(options) {
        var landingPageLoadedLog;
        this.title = Utils.getConfigurationParameter('pageTitle');
        this.ERRORS = {
          ORDER_NOT_FOUND: Utils.getConfigurationParameter('orderNotFoundMessage')
        };
        this.model = options.model;
        this.setupOrderFinderForm();
        this.state = {
          code: '',
          message: '',
          messageType: ''
        };
        BackboneFormView.add(this);
        landingPageLoadedLog = InstrumentationHelper.getLog('landingPageLoadedLog');
        landingPageLoadedLog.setParametersToSubmit({
          componentArea: 'SC Order Status',
          activity: 'Order status landing page was opened'
        });
        landingPageLoadedLog.submit();
      },
      getBreadcrumbPages: function getBreadcrumbPages() {
        return [{
          text: this.title,
          href: '/' + Utils.getConfigurationParameter('route')
        }];
      },
      setupOrderFinderForm: function setupOrderFinderForm() {
        this.setupBindingsForOrderFinderForm();
        this.setupValidationRulesForOrderFinderForm();
        this.registerEventsRelatedToOrderFinderForm();
      },
      setupBindingsForOrderFinderForm: function setupBindingsForOrderFinderForm() {
        var self = this;
        var formControls = this.getFormControls();
        _.each(formControls.fields, function bindField(field) {
          self.addBindingForProperty('name', field.name, field.bindingProperty);
        });
      },
      addBindingForProperty: function addBindingForProperty(attribute, value, property) {
        this.bindings['[' + attribute + '="' + value + '"]'] = property;
      },
      setupValidationRulesForOrderFinderForm: function setupValidationRulesForOrderFinderForm() {
        var self = this;
        var formControls = this.getFormControls();
        _.each(formControls.fields, function addValidationRuleForField(field) {
          self.model.addValidationRuleForProperty(
            field.name, {
              required: true,
              msg: Utils.getConfigurationParameter('requiredFieldMessage').replace(
                '{{field}}',
                field.label
              )
            }
          );
        });
      },
      registerEventsRelatedToOrderFinderForm: function registerEventsRelatedToOrderFinderForm() {
        this.events['submit form'] = 'submitOrderFinderForm';
        this.events['click [data-action="showHelp"]'] = 'openHelpView';
      },
      submitOrderFinderForm: function submitOrderFinderForm(submitEvent) {
        var promise;
        var self = this;
        var errorCode;
        var searchSalesOrderRequestLog = InstrumentationHelper.getLog('searchSalesOrderRequestLog');
        submitEvent.preventDefault();
        promise = this.saveForm(submitEvent);
        if (promise) {
          searchSalesOrderRequestLog.startTimer();
          this.setSubmitedValues();
          promise.then(
            function successActions() {
              self.state.code = '';
              self.state.message = '';
              self.state.messageType = '';
              searchSalesOrderRequestLog.endTimer();
              searchSalesOrderRequestLog.setParametersToSubmit({
                componentArea: 'SC Order Status',
                activity: 'Time it takes to search a sales order',
                totalTime: searchSalesOrderRequestLog.getElapsedTimeForTimer()
              });
              searchSalesOrderRequestLog.submit();
            },
            function failActions(response) {
              response.preventDefault = true;
              errorCode = response.responseJSON.name;
              if (self.ERRORS[errorCode]) {
                self.state.code = errorCode;
                self.state.message = self.ERRORS[errorCode];
              } else {
                if (response.responseJSON.message) {
                  self.state.message = response.responseJSON.message;
                } else {
                  self.state.message = response.responseJSON.name + ': ' + response.responseJSON.stack[0];
                }
                self.state.code = response.responseJSON.name;
              }
              self.state.messageType = 'error';
            }
          ).always(_.bind(self.render, self));
        }
      },
      setSubmitedValues: function setSubmitedValues() {
        var submittedOrderNumber = this.validationModel.get('ordernumber');
        var submittedVerificationfield = this.validationModel.get('verificationfield');
        this.model.set('ordernumber', submittedOrderNumber);
        this.model.set('verificationfield', submittedVerificationfield);
      },
      getFormControls: function getFormControls() {
        var formControls = {};
        formControls.fields = [];
        formControls.fields.push({
          name: 'ordernumber',
          bindingProperty: 'ordernumber',
          label: Utils.getConfigurationParameter('orderNumberLabel'),
          value: this.model.get('ordernumber'),
          placeholder: Utils.getConfigurationParameter('orderNumberHelp'),
          tabindex: 1
        });
        formControls.fields.push({
          name: 'verificationfield',
          bindingProperty: 'verificationfield',
          label: Utils.getConfigurationParameter('verificationFieldLabel'),
          value: this.model.get('verificationfield'),
          placeholder: Utils.getConfigurationParameter('verificationFieldHelp'),
          tabindex: 2
        });
        formControls.buttons = {};
        formControls.buttons.submit = {
          label: Utils.getConfigurationParameter('submitButtonLabel'),
          tabindex: 3,
          alt: Utils.getConfigurationParameter('submitButtonHelp')
        };
        return formControls;
      },
      openHelpView: function openHelpView() {
        var helpView = new HelpView();
        this.options.application.getLayout().showInModal(helpView);
      },
      getContext: function getContext() {
        return {
          title: this.title,
          viewElements: {
            description: {
              label: Utils.getConfigurationParameter('pageDescription'),
              show: !!(Utils.getConfigurationParameter('pageDescription'))
            },
            helpLink: {
              label: Utils.getConfigurationParameter('helpLink'),
              show: !!(Utils.getConfigurationParameter('helpLink'))
            },
            loginSectionText: {
              label: Utils.getConfigurationParameter('orderLoginSectionText'),
              show: !!(Utils.getConfigurationParameter('orderLoginSectionText'))
            },
            loginSectionLink: {
              label: Utils.getConfigurationParameter('loginSectionLink'),
              show: !!(Utils.getConfigurationParameter('loginSectionLink'))
            }
          },
          formControls: this.getFormControls(),
          order: this.model,
          isFeedback: !!this.state.code
        };
      }
    });
  });
define('SuiteCommerce.OrderStatus.OrderFinder.SearchResults.View',
  [
    'suitecommerce_orderstatus_search_results.tpl',
    'SuiteCommerce.OrderStatus.OrderFinder.OrderSummary.View',
    'SuiteCommerce.OrderStatus.OrderFinder.OrderPaymentInfo.View',
    'SuiteCommerce.OrderStatus.OrderFinder.ItemDetails.View',
    'SuiteCommerce.OrderStatus.Utils',
    'Backbone',
    'Backbone.CompositeView',
    'underscore'
  ],
  function define(
    Template,
    OrderSummaryView,
    OrderPaymentInfoView,
    ItemDetailsView,
    Utils,
    Backbone,
    BackboneFormView,
    _
  ) {
    'use strict';
    return Backbone.View.extend({
      ORDER_STATUSES_TO_HIGHLIGHT: {
        error: ['Cancelled']
      },
      ITEM_FULFILLMENT_CHOICE_MAPPING: {
        ship: 'SHIP',
        pickupInStore: 'PICKUP_IN_STORE'
      },
      template: Template,
      events: {
        'click [data-action="resetSearch"]': 'resetSearch',
        'click [data-action="openItemDetails"]': 'openItemDetails'
      },
      childViews: {
        'OrderFinder.Summary': function registerOrderSummaryDataView() {
          return new OrderSummaryView({
            summaryData: this.model.get('details').transactionData,
            currency: this.model.get('details').currency
          });
        },
        'OrderFinder.PaymentInfo': function registerOrderPaymentInfoView() {
          return new OrderPaymentInfoView({
            paymentData: this.model.get('details').paymentData
          });
        }
      },
      initialize: function initialize(options) {
        this.model = options.model;
        this.title = Utils.getConfigurationParameter('pageTitle');
        this.initializeOrderConstant();
        BackboneFormView.add(this);
      },
      initializeOrderConstant: function initializeOrderConstant() {
        this.ORDER_STATUS_MAPPING = {
          'Pending Approval': Utils.getConfigurationParameter('orderDetailsOrderStatusPendingApproval'),
          'Pending Fulfillment': Utils.getConfigurationParameter('orderDetailsOrderStatusPendingFulfillment'),
          'Partially Fulfilled': Utils.getConfigurationParameter('orderDetailsOrderStatusPartiallyShipped'),
          // eslint-disable-next-line quote-props
          'Fulfilled': Utils.getConfigurationParameter('orderDetailsOrderStatusFulfilled'),
          'Pending Billing': Utils.getConfigurationParameter('orderDetailsOrderStatusPendingBilling'),
          // eslint-disable-next-line quote-props
          'Billed': Utils.getConfigurationParameter('orderDetailsOrderStatusBilled'),
          // eslint-disable-next-line quote-props
          'Closed': Utils.getConfigurationParameter('orderDetailsOrderStatusClosed'),
          // eslint-disable-next-line quote-props
          'Cancelled': Utils.getConfigurationParameter('orderDetailsOrderStatusCanceled'),
          // eslint-disable-next-line quote-props
          'Canceled': Utils.getConfigurationParameter('orderDetailsOrderStatusCanceled')
        };
        this.ITEMS_STATUS_MAPPING = {
          SHIPPING_ITEMS_PENDING_FULFILLMENT_LABEL: Utils.getConfigurationParameter('orderDetailsShippingItemsWithoutFulfillmentLabel'),
          SHIPPING_ITEMS_PICKED_LABEL: Utils.getConfigurationParameter('orderDetailsShippingItemsPickedLabel'),
          SHIPPING_ITEMS_PACKED_LABEL: Utils.getConfigurationParameter('orderDetailsShippingItemsPackedLabel'),
          SHIPPING_ITEMS_SHIPPED_LABEL: Utils.getConfigurationParameter('orderDetailsShippingItemsShippedLabel'),
          PICKUP_ITEMS_PENDING_FULFILLMENT_LABEL: Utils.getConfigurationParameter('orderDetailsPickupItemsWithoutFulfillmentLabel'),
          PICKUP_ITEMS_PICKED_LABEL: Utils.getConfigurationParameter('orderDetailsPickupItemsPickedLabel'),
          PICKUP_ITEMS_PICKED_UP_LABEL: Utils.getConfigurationParameter('orderDetailsPickupItemsPickedUpLabel'),
          ITEMS_PENDING_APPROVAL_LABEL: Utils.getConfigurationParameter('orderDetailsOrderStatusPendingApproval'),
          ITEMS_CANCELLED_LABEL: Utils.getConfigurationParameter('orderDetailsOrderStatusCanceled')
        };
      },
      getBreadcrumbPages: function getBreadcrumbPages() {
        return [{
          text: this.title,
          href: '/' + Utils.getConfigurationParameter('route')
        }];
      },
      resetSearch: function resetSearch() {
        this.model.destroy();
      },
      getContext: function getContext() {
        var processedOrderDetails = this.getProcessedOrderDetails();
        this.model.set('details', processedOrderDetails);
        return {
          title: this.title,
          orderDetails: processedOrderDetails,
          viewElements: {
            searchButtonLabel: Utils.getConfigurationParameter('orderDetailsNewSearchButtonLabel'),
            orderNumberLabel: Utils.getConfigurationParameter('orderDetailsOrderNumber').replace(
              '{{ordernumber}}',
              this.model.get('details').orderNumber
            ),
            orderStatus: {
              label: this.model.get('details').status,
              show: true
            },
            orderDate: {
              label: Utils.getConfigurationParameter('orderDetailsDateOrderedLabel').replace(
                '{{orderdate}}',
                this.model.get('details').orderDate
              ),
              show: true
            },
            itemColumn: {
              label: Utils.getConfigurationParameter('orderDetailsItemColumnLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsItemColumnLabel')
            },
            quantityColumn: {
              label: Utils.getConfigurationParameter('orderDetailsQuantityColumnLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsQuantityColumnLabel')
            },
            statusColumn: {
              label: Utils.getConfigurationParameter('orderDetailsStatusColumnLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsStatusColumnLabel')
            },
            trackPackage: {
              label: Utils.getConfigurationParameter('orderDetailsTrackPackageLabel'),
              show: !!Utils.getConfigurationParameter('orderDetailsTrackPackageLabel')
            },
            shipDifferentAddressLabel: Utils.getConfigurationParameter(
              'orderDetailsShipToDifferentAddressLabel'
            ),
            viewDetailsLabel: Utils.getConfigurationParameter('orderDetailsViewDetailsLabel')
          }
        };
      },
      getProcessedOrderDetails: function getProcessedOrderDetails() {
        var self = this;
        var orderDetails = this.model.get('details');
        var orderStatuses = orderDetails.status.split('/');
        _.each(orderStatuses, function highlightByStatus(status) {
          _.each(_.keys(self.ORDER_STATUSES_TO_HIGHLIGHT), function forEachKey(key) {
            if (_.indexOf(self.ORDER_STATUSES_TO_HIGHLIGHT[key], status) !== -1) {
              orderDetails.highlightColor = key;
            }
          });
        });
        orderDetails.statusRequiresHighlight = !!orderDetails.highlightColor;
        orderDetails.itemDetails = this.processItemData(orderDetails);
        orderDetails.status = this.processOrderStatus(orderDetails.status);
        return orderDetails;
      },
      processItemData: function processItemData(orderData) {
        var order = orderData;
        var itemDetails = orderData.itemDetails;
        var self = this;
        _.each(itemDetails, function processItems(item, index) {
          itemDetails[index].totalFormated = Utils.formatCurrency(
            item.total,
            order.currency.displaysymbol
          );
          itemDetails[index].itemLine = index;
          itemDetails[index].isForShipping = item.fulfillmentChoice
            === self.ITEM_FULFILLMENT_CHOICE_MAPPING.ship;
          itemDetails[index].isForPickUpInStore = item.fulfillmentChoice
            === self.ITEM_FULFILLMENT_CHOICE_MAPPING.pickupInStore;
          itemDetails[index].showDetailsButton = !!(
            (item.location && item.isForPickUpInStore)
            || (item.shippingAddress && item.isForShipping));
          itemDetails[index].showDifferentAddressLabel = !!(
            item.shippingAddress && item.shippingAddress
            !== order.shippingAddress);
          itemDetails[index].status = self.ITEMS_STATUS_MAPPING[item.status]
            ? self.ITEMS_STATUS_MAPPING[item.status] : '';
        });
        return itemDetails;
      },
      processOrderStatus: function processOrderStatus(status) {
        var orderStatus = status.split('/');
        var self = this;
        _.each(orderStatus, function replaceStatus(statusToProcess, index) {
          orderStatus[index] = self.ORDER_STATUS_MAPPING[statusToProcess] || '';
        });
        return orderStatus.join(' / ');
      },
      openItemDetails: function openItemDetails(event) {
        var selectedItemLine = event.target.getAttribute('data-row-index');
        var items = this.model.get('details').itemDetails;
        var selectedItem = items[selectedItemLine];
        var itemDetailsView = new ItemDetailsView({ item: selectedItem });
        event.preventDefault();
        this.options.application.getLayout().showInModal(itemDetailsView);
      }
    });
  });
define('SuiteCommerce.OrderStatus.Shopping',
  [
    'SuiteCommerce.OrderStatus.OrderFinder.Router',
    'SuiteCommerce.OrderStatus.Utils',
    'SuiteCommerce.OrderStatus.Instrumentation.InstrumentationHelper',
    'SuiteCommerce.OrderStatus.Configuration'
  ],
  function define(
    Router,
    Utils,
    InstrumentationHelper,
    Configuration
  ) {
    'use strict';
    return {
      mountToApp: function mountToApp(container) {
        var log = InstrumentationHelper.initialize(container);
        Configuration.initialize(container);
        // eslint-disable-next-line no-new
        new Router(container);
        Utils.registerHandlevarsHelpers();
      }
    };
  });
};
extensions['NSeComm.Punchout2Go.1.0.2'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/NSeComm/Punchout2Go/1.0.2/' + asset;
};
define('NSeComm.Punchout2Go.NotShopping', [
    'Punchout2Go.TransferCart.Model'
], function NSeCommPunchout2GoNotShopping(
    Punchout2GoTransferCartModel
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var environment = container.getComponent('Environment');
            var model;
            if (environment) {
                model = new Punchout2GoTransferCartModel();
                model.fetch().always(function afterFetch() {
                    if (model.get('isActive')) {
                        window.location.href = environment.getSiteSetting('touchpoints.home');
                    }
                });
            }
        }
    };
});
define('Punchout2Go.DynamicCSS', [
    'Punchout2Go.TransferCart.Model',
    'jQuery'
], function Punchout2GoDynamicCSS(
    Punchout2GoTransferCartModel,
    jQuery
) {
    'use strict';
    return {
        addStylesToPage: function addStylesToPage(cssContent) {
            var $style = jQuery('head').find('#custom-additional-styles');
            if (!$style.length) {
                $style = jQuery('head').append('<style type="text/css" id="custom-additional-styles"></style>')
                    .find('#custom-additional-styles');
            }
            $style.html(cssContent);
        },
        hideNonShoppingThings: function hideNonShoppingThings() {
            var self = this;
            var model = new Punchout2GoTransferCartModel();
            var styles = [
                '.header-menu-myaccount-overview { margin-bottom: 0; }'
            ];
            var selectorsToHide = [
                '.requestquote-accesspoints-headerlink-link',
                '.header-mini-cart-button-checkout',
                '.product-list-control-button-wishlist',
                '.product-detail-to-quote-add-to-quote-button',
                '.cart-summary-button-container',
                '.cart-item-actions-item-list-actionable-edit-content-saveforlater',
                '.product-list-details-later',
                '.header-menu-myaccount-item-level2',
                '[data-touchpoint="checkout"]',
                '[data-touchpoint="customercenter"]'
            ];
            var stylesContent = styles.concat([
                selectorsToHide.join(',\n') + ' { display: none !important; }'
            ]).join('\n');
            model.fetch().always(function afterFetch() {
                if (model.get('isActive')) {
                    self.addStylesToPage(stylesContent);
                }
            });
        }
    };
});
define('Punchout2Go.OrderMinimumAmount', [
    'jQuery',
    'underscore'
], function Punchout2GoOrderMinimumAmount(
    jQuery,
    _
) {
    'use strict';
    return {
        apply: function apply(container) {
            var layout = container.getComponent('Layout');
            if (layout) {
                layout.on('displayPunchout2GoOrderMinimumAmount', function onDisplayPunchout2GoOrderMinimumAmount(errorMessage) {
                    _(function showErrorMessage() {
                        var $placeholder = jQuery('[data-view="Punchout2Go.OrderMinimumAmount"]').empty();
                        if ($placeholder.length) {
                            layout.showMessage({
                                type: 'warning',
                                message: errorMessage,
                                selector: 'Punchout2Go.OrderMinimumAmount'
                            });
                        }
                    }).defer();
                });
            }
        }
    };
});
define('Punchout2Go.TransferCart.Button.View', [
    'Punchout2Go.TransferCart.Model',
    'punchout2go_transfer_cart_button_view.tpl',
    'SCView',
    'jQuery',
    'underscore'
], function Punchout2GoTransferCartButtonViewModule(
    Punchout2GoTransferCartModel,
    template,
    SCViewComponent,
    jQuery,
    _
) {
    'use strict';
    var SCView = SCViewComponent.SCView;
    function Punchout2GoTransferCartButtonView(options) {
        SCView.call(this);
        this.options = options || {};
        this.template = template;
        this.punchout2GoTransferCartModel = new Punchout2GoTransferCartModel();
        this.attributes = {
            id: 'Punchout2GoTransferCartButtonView',
            'class': 'Punchout2Go-TransferCart-Button-View'
        };
    }
    // Inherit parent instance methods.
    Punchout2GoTransferCartButtonView.prototype = Object.create(SCView.prototype);
    // Restore the constuctor.
    Punchout2GoTransferCartButtonView.prototype.constructor = Punchout2GoTransferCartButtonView;
    Punchout2GoTransferCartButtonView.prototype.getEvents = function getEvents() {
        return {
            'click [data-action="transfer-cart"]': 'transferCart'
        };
    };
    // In case you need conditional rendering
    Punchout2GoTransferCartButtonView.prototype.render = function render() {
        var self = this;
        var args = arguments;
        var model = this.punchout2GoTransferCartModel;
        jQuery.when(
            model.fetch(),
            this.options.cart.getSummary()
        ).always(function afterFetchPunchout2GoTransferCartGet(_model, cartSummary) {
            if (model.get('isActive')) {
                self.orderSubtotal = cartSummary.subtotal;
                SCView.prototype.render.apply(self, args);
            }
        });
    };
    Punchout2GoTransferCartButtonView.prototype.getCartData = function getCartData() {
        return jQuery.when(
            this.options.cart.getLines(),
            this.options.cart.getSummary(),
            this.options.userProfile.getUserProfile()
        );
    };
    Punchout2GoTransferCartButtonView.prototype.transferCart = function transferCart() {
        var model = this.punchout2GoTransferCartModel;
        var currencies = this.options.environment.getSiteSetting('currencies');
        var currency = _(currencies).findWhere({ isdefault: 'T' }) || { code: 'USD' };
        var defaultItemClassification = this.options.environment.getConfig('punchout2go.defaultItemClassification') || null;
        var itemClassificationFieldId = this.options.environment.getConfig('punchout2go.itemClassificationFieldId');
        this.getCartData().then(function afterGetCartData(lines, summary, profile) {
            var transferCartData = {
                total: summary.subtotal,
                currency: currency.code,
                items: _(lines).map(function mapLineToCartDataItem(line) {
                    var matrixOptions = _(line.options).where({ isMatrixDimension: true });
                    var itemOptions = _(line.options).where({ isMatrixDimension: false });
                    var cartDataItem = {
                        supplierid: line.item.itemid,
                        supplierauxid: line.item.internalid + '/' + profile.internalid,
                        description: line.item.displayname,
                        classification: (itemClassificationFieldId && line.item[itemClassificationFieldId]) ?
                            line.item[itemClassificationFieldId] :
                            defaultItemClassification,
                        uom: line.item.extras.saleunit || 'EA',
                        unitprice: line.rate,
                        currency: currency.code,
                        quantity: line.quantity,
                        data: _(itemOptions).reduce(function reduceOptionsToSimpleOption(simpleOption, option) {
                            simpleOption[option.cartOptionId] = option.value.internalid;
                            return simpleOption;
                        }, {})
                    };
                    var simpleMatrixOptions = _(matrixOptions).reduce(function reduceMAtrixOptionsToSimpleMatrixOption(simpleOption, option) {
                        simpleOption[option.label.toLowerCase()] = option.value.label;
                        return simpleOption;
                    }, {});
                    return _(cartDataItem).extend(simpleMatrixOptions);
                })
            };
            model.set(transferCartData);
            model.save().then(function afterTransferCart(response) {
                if (response && response.url) {
                    window.location.href = response.url;
                }
            });
        });
    };
    Punchout2GoTransferCartButtonView.prototype.getContext = function getContext() {
        var orderMinimumAmount = this.options.environment.getConfig('punchout2go.orderMinimumAmount');
        var orderMinimumMessage = this.options.environment.getConfig('punchout2go.orderMinimumMessage');
        var showOrderMinimumMessage = orderMinimumAmount && orderMinimumAmount > this.orderSubtotal;
        if (showOrderMinimumMessage) {
            this.options.layout.cancelableTrigger('displayPunchout2GoOrderMinimumAmount', orderMinimumMessage);
        }
        return {
            showOrderMinimumMessage: showOrderMinimumMessage
        };
    };
    // Return the AMD constructor.
    return Punchout2GoTransferCartButtonView;
});
/* globals getExtensionAssetsPath */
define('Punchout2Go.TransferCart.Model', [
    'SCModel',
    'Utils'
], function Punchout2GoTransferCartModelModule(
    SCModelComponent,
    Utils
) {
    'use strict';
    var SCModel = SCModelComponent.SCModel;
    function Punchout2GoTransferCartModel() {
        SCModel.call(this);
        // Define properties of the model.
        this.urlRoot = function urlRoot() {
            return Utils.getAbsoluteUrl(
                getExtensionAssetsPath('services/Punchout2Go.TransferCart.Service.ss')
            );
        };
    }
    // Inherit parent instance methods.
    Punchout2GoTransferCartModel.prototype = Object.create(SCModel.prototype);
    // Restore the constuctor.
    Punchout2GoTransferCartModel.prototype.constructor = Punchout2GoTransferCartModel;
    // Return the AMD constructor.
    return Punchout2GoTransferCartModel;
});
define('NSeComm.Punchout2Go.Main', [
    'Punchout2Go.TransferCart.Button.View',
    'Punchout2Go.DynamicCSS',
    'Punchout2Go.OrderMinimumAmount'
], function NSeCommPunchout2GoMain(
    Punchout2GoTransferCartButtonView,
    Punchout2GoDynamicCSS,
    Punchout2GoOrderMinimumAmount
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var layout = container.getComponent('Layout');
            var cart = container.getComponent('Cart');
            var userProfile = container.getComponent('UserProfile');
            var environment = container.getComponent('Environment');
            if (cart && userProfile && environment) {
                cart.addChildView('Cart.Summary', function addTransferCartButtonView() {
                    return new Punchout2GoTransferCartButtonView({
                        cart: cart,
                        userProfile: userProfile,
                        environment: environment,
                        layout: layout
                    });
                });
            }
            Punchout2GoDynamicCSS.hideNonShoppingThings();
            Punchout2GoOrderMinimumAmount.apply(container);
        }
    };
});
};
extensions['CampusStores.RentalsExtension.1.2.3'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/RentalsExtension/1.2.3/' + asset;
};
define('AcademicTerm.Collection', [
    'Backbone',
    'AcademicTerm.Model',
    'underscore',
], function AcademicTermCollection(
    Backbone,
    AcademicTermModel,
    _
) {
    'use strict';
    return Backbone.Collection.extend({
        model: AcademicTermModel,
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/AcademicTerm.Service.ss'))
    });
});
define('AcademicTerm.Model', [
    'Backbone',
    'underscore',
], function AcademicTermCollection(
    Backbone,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/AcademicTerm.Service.ss'))
    });
});
define('Cart.AddToCart.Button.View.Rentals', [
    'Cart.AddToCart.Button.View',
    'Profile.Model',
    'underscore'
], function CartAddToCartButtonViewRentals(
    CartAddToCartButtonView,
    ProfileModel,
    _
) {
    'use strict';
    _.extend(CartAddToCartButtonView.prototype, {
        getRentalsAddToCartValidators: function getRentalsAddToCartValidators(rentalsView) {
            var self = this;
            var requiresSpecialSelection = rentalsView.requiresSpecialSelection();
            var isLoggedIn = ProfileModel.getInstance().get('isLoggedIn') === 'T';
            return {
                custcol_nsts_csic_web_purchase_type: {
                    fn: function validatePurchaseType() {
                        if (requiresSpecialSelection && !self.model.get('custcol_nsts_csic_web_purchase_type')) {
                            return _.translate('Please select value for PURCHASE TYPE');
                        }
                    }
                },
                custcol_nsts_csic_web_product_type: {
                    fn: function validateProductType() {
                        if (requiresSpecialSelection && !rentalsView.getOptionInternalId('custcol_nsts_csic_web_product_type')) {
                            return _.translate('Please select value for CONDITION');
                        }
                    }
                },
                custcol_nsts_csmg_school: {
                    fn: function validateSchool() {
                        if (rentalsView.isRentalTypeSelected()) {
                            if (!isLoggedIn) {
                                return _.translate(rentalsView.environment.getConfig('rentalItemLoginRequiredMessage'));
                            }
                            if (!self.model.get('custcol_nsts_csmg_school')) {
                                return _.translate('Please select value for SCHOOL');
                            }
                            if (!_.contains(rentalsView.getSchoolsFromRentalDurations(), self.model.get('custcol_nsts_csmg_school'))) {
                                return _.translate('Please select valid option for SCHOOL');
                            }
                        }
                    }
                },
                custcol_nsts_csmg_aca_term: {
                    fn: function validateAcademicTerm() {
                        if (rentalsView.isRentalTypeSelected()) {
                            if (!self.model.get('custcol_nsts_csmg_aca_term')) {
                                return _.translate('Please select value for TERM');
                            }
                        }
                    }
                },
                custcol_nsts_csre_dur: {
                    fn: function validateRentalDuration() {
                        if (rentalsView.isRentalTypeSelected()) {
                            if (!self.model.get('custcol_nsts_csre_dur')) {
                                return _.translate('Please select value for RENTAL DURATION');
                            }
                        }
                    }
                }
            };
        },
        addToCart: _.wrap(CartAddToCartButtonView.prototype.addToCart, function addToCart(fn) {
            var productOptionsView = this.parentView && this.parentView.getChildViewInstance('Product.Options');
            var rentalsView = productOptionsView && productOptionsView.getChildViewInstance('Options.Collection', 'Rentals.View');
    
            if (rentalsView) {
                var attributesToValidate = [
                    'custcol_nsts_csic_web_purchase_type',
                    'custcol_nsts_csic_web_product_type',
                    'custcol_nsts_csmg_school',
                    'custcol_nsts_csmg_aca_term',
                    'custcol_nsts_csre_dur'
                ];
                if (!this.model.areAttributesValid(attributesToValidate, this.getRentalsAddToCartValidators(rentalsView))) {
                    return false;
                }
            }
            return fn.apply(this, _.toArray(arguments).slice(1));
        })
    });
});
define('Cart.Item.Summary.View.Rentals', [
	'Cart.Item.Summary.View',
	'underscore'
],	function CartItemSummaryViewRentals(
	CartItemSummaryView,
	_
) {
	'use strict';
	_.extend(CartItemSummaryView.prototype, {
		getContext: _.wrap(CartItemSummaryView.prototype.getContext, function getContext(fn) {
			var originalContext = fn.apply(this, _.toArray(arguments).slice(1));
			var durationOption = this.model.getOption('custcol_nsts_csre_dur');
			var durationOptionId = durationOption && durationOption.get('value') && durationOption.get('value').internalid;
			if (durationOptionId) {
				originalContext.showComparePrice = false;
			}
			
			return originalContext;
		})
	});
});
define('Header.MiniCartItemCell.View.Rentals', [
	'Header.MiniCartItemCell.View'
],	function HeaderMiniCartItemCellViewRentals(
	HeaderMiniCartItemCellView
) {
	'use strict';
	_.extend(HeaderMiniCartItemCellView.prototype, {
		initialize: _.wrap(HeaderMiniCartItemCellView.prototype.initialize, function initialize(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
			
			this.model.on('changeRentalDurationPrice', this.render, this);
        })
	});
});
define('Item.KeyMapping.Rentals', [
    'Item.KeyMapping',
    'underscore'
], function ItemKeyMapping(
    KeyMapping,
    _
) {
    'use strict';
    return _.extend(KeyMapping, {
        getKeyMapping: _.wrap(KeyMapping.getKeyMapping, function getKeyMapping(fn) {
            var originalMapping = fn.apply(this, _.toArray(arguments).slice(1));
    
            _.extend(originalMapping, {
                _isReturnable: _.wrap(originalMapping._isReturnable, function isReturnable(fn, item) { // eslint-disable-line
                    var result = fn.apply(this, _.toArray(arguments).slice(1));
                    return result || item.get('itemtype') === 'OthCharge';
                })
            });
    
            return originalMapping;
        })
    });
});
define('Product.Model.Rentals', [
    'Product.Model',
    'RentalDuration.Collection',
    'Rentals.Helper',
    'underscore'
], function ProductModelRentals(
    ProductModel,
    RentalDurationCollection,
    RentalsHelper,
    _
) {
    'use strict';
    _.extend(ProductModel.prototype, RentalsHelper);
    _.extend(ProductModel.prototype, {
        initialize: _.wrap(ProductModel.prototype.initialize, function initialize(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
            
            var self = this;
            var durationCollection = new RentalDurationCollection();
            
            durationCollection.fetch()
                .done(function donePromiseRentalDurationCollection(rentalDurations) {
                    self.rentalDurations = rentalDurations;
                    self.trigger('change');
            });
        }),
        getPrice: _.wrap(ProductModel.prototype.getPrice, function getPrice(fn) {
            var result = fn.apply(this, _.toArray(arguments).slice(1));
            var selectedMatrixChildren = this.getSelectedMatrixChilds();
            var selectedItem = selectedMatrixChildren && selectedMatrixChildren.length === 1 ? selectedMatrixChildren[0] : this;
            var rentaldurationPrice = this.getDurationPrice(selectedItem, this.rentalDurations);
            return _.extend(result, rentaldurationPrice);
        }),
        /**
         * @see getSelectedOptions Product.Model
         * getSelectedOptions() in Product.Model doesn't check option.get('value') for undefined values and pushes into selected_options.
         * This causes undefined values in selected_options and displayes extra commas in template. Code below removes such undefined options.
         */
        getSelectedOptions: _.wrap(ProductModel.prototype.getSelectedOptions, function getSelectedOptions(fn) {
            var result = fn.apply(this, _.toArray(arguments).slice(1));
            var selectedOptions = _.reject(result, function rejectUndefined(option) {
                return !option;
            });
            
            return selectedOptions;
        })
    });
});
define('ProductViews.Price.View.Rentals', [
	'ProductViews.Price.View',
	'underscore'
],	function TransactionLineViewsPriceViewRentals(
	ProductViewsPriceView,
	_
) {
	'use strict';
	_.extend(ProductViewsPriceView.prototype, {
		getContext: _.wrap(ProductViewsPriceView.prototype.getContext, function getContext(fn) {
			var originalContext = fn.apply(this, _.toArray(arguments).slice(1));
			var durationOption = this.model.getOption('custcol_nsts_csre_dur');
			var durationOptionId = durationOption && durationOption.get('value') && durationOption.get('value').internalid;
			if (durationOptionId) {
				originalContext.showComparePrice = false;
			}
			
			return originalContext;
		})
	});
});
define('RentalDefaultCC.Model', [
    'Backbone',
    'underscore'
], function RentalDefaultCCModel(
    Backbone,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/RentalDefaultCC.Service.ss')),
        getDefaultCCExpiration: function getDefaultCCExpiration(customerId) {
            if (customerId === '0') {
                return {};
            }
            else {
                var requestFilters = {
                    data: {
                        customerId: customerId
                    },
                    parse: true
                };
                return this.fetch(requestFilters);
            }
        }
    });
});
define('RentalDuration.Collection', [
    'Backbone.CachedCollection',
    'RentalDuration.Model',
    'underscore',
    'Utils'
], function RentalDurationCollection(
    BackboneCachedCollection,
    RentalDurationModel,
    _,
    Utils // eslint-disable-line
) {
    'use strict';
    return BackboneCachedCollection.extend({
        model: RentalDurationModel,
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/RentalDuration.Service.ss'))
    });
});
define('RentalDuration.Model', [
    'Backbone.CachedModel',
    'underscore',
    'Utils'
], function RentalDurationModel(
    BackboneCachedModel,
    _,
    Utils // eslint-disable-line
) {
    'use strict';
    return BackboneCachedModel.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/RentalDuration.Service.ss')),
        calculateDueDate: function calculateDueDate() {
            // internalid === '1': Term
            // internalid === '2': Days
            // internalid === '3': Mixed
            var dueDate = new Date();
            var durationLength = parseInt(this.get('rentalDuration'), 10);
            // Due date depends on chosen academic term
            if ((this.get('durationType') || {}).internalid === '1') {
                return null;
            }
            if (durationLength && durationLength > 0) {
                dueDate.setDate(dueDate.getDate() + durationLength);
            }
            return dueDate;
        }
    });
});
define('RentalIneligibility.Model', [
    'Backbone',
    'underscore'
], function RentalIneligibilityModel(
    Backbone,
    _
) {
    'use strict';
    return Backbone.Model.extend({
        urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/RentalIneligibility.Service.ss')),
        validateCustomer: function validateCustomer(customerId) {
            var requestFilters = {
                data: {
                    customerId: customerId
                },
                parse: true
            };
            return this.fetch(requestFilters);
        },
        getReasons: function getReasons() {
            return this.get('inelegibilityReasons');
        },
        isEligible: function isEligible() {
            return (this.get('eligibleToRent') === 'T');
        }
    });
});
define('Rentals.Helper', [
    'underscore'
], function RentalsHelper(
    _
) {
    'use strict';
    return {
        getDurationPrice: function getDurationPrice(selectedItem, rentalDurations) {
            var durationOption = this.getOption('custcol_nsts_csre_dur');
            var durationOptionId =  durationOption && durationOption.get('value') && durationOption.get('value').internalid;
            var durationPrice = {};
            var selectedDuration;
            var priceLevelId;
            if (durationOptionId && rentalDurations) {
                selectedDuration = _.findWhere(rentalDurations, {internalid: durationOptionId});
                priceLevelId = selectedDuration && selectedDuration.priceLevel.internalid;
                priceLevelId = priceLevelId ? 'pricelevel' + priceLevelId : '';
                if (priceLevelId) {
                    durationPrice = {
                        compare_price: selectedItem.get(priceLevelId),
                        compare_price_formatted: selectedItem.get(priceLevelId + '_formatted'),
                        price: selectedItem.get(priceLevelId),
                        price_formatted: selectedItem.get(priceLevelId + '_formatted'),
                        rate: selectedItem.get(priceLevelId),
                        rate_formatted: selectedItem.get(priceLevelId + '_formatted')
                    };
                }
            }
            return durationPrice;
        }
    };
});
// @module CampusStores.RentalsExtension.Rentals
define('Rentals.View',	[
    'Backbone',
    'Profile.Model',
    'RentalDuration.Collection',
    'AcademicTerm.Collection',
    'RentalIneligibility.Model',
    'RentalDefaultCC.Model',
    'rentals_view.tpl',
    'jQuery',
    'underscore',
],	function (
    Backbone,
    ProfileModel,
    RentalDurationCollection,
    AcademicTermCollection,
    RentalIneligibilityModel,
    RentalDefaultCCModel,
    rentalsViewTpl,
    jQuery,
    _
) {
    'use strict';
	/**
	 * @class   CampusStores.RentalsExtension.Rentals.View
	 * @extends Backbone.View
	 */
	return Backbone.View.extend({
        template: rentalsViewTpl,
        
        durationOptionId: 'custcol_nsts_csre_dur',
        termsAndConditionOptionId: 'custcol_nsts_csic_docs_accepted', // Terms and conditions
        academicTermOptionId: 'custcol_nsts_csmg_aca_term', // Academic terms
        schoolOptionId: 'custcol_nsts_csmg_school',
        conditionOptionId: 'custcol_nsts_csic_web_product_type',
        isbnOptionId: 'custcol_nsts_csbb_isbn',
        purchaseTypeOptionId: 'custcol_nsts_csic_web_purchase_type',
        productTypeId: 'custitem_nsts_csic_product_type',
        rentalOptionId: 'custcol_nsts_csre_rntl',
        rentalItemId: 'custitem_nsts_csic_erp_rental',
        BUY_TYPE: '1',
        RENT_TYPE: '2',
        DIGITAL_TYPE: '3',
        events: {
            'click [data-toggle="set-option"]': 'setOption',
        },
		initialize: function initialize(options) {
            var self = this;
            var promiseProfileModel = ProfileModel.getPromise();
            var isLoggedIn;
            var customerId;
            self.container = options.container;
            self.pdp = options.pdp;
            self.environment = options.environment;
            self.currentView = self.container.getLayout().getCurrentView();
            self.isQuickView = self.pdp._getViewIdentifier(self.currentView) === self.pdp.PDP_QUICK_VIEW;
            self.isAdoptionSearchPDPView = self.pdp._getViewIdentifier(self.currentView) === self.pdp.PDP_ADOPTION_SEARCH_VIEW;
            self.durationCollection = new RentalDurationCollection();
            self.termCollection = new AcademicTermCollection();
            self.rentalEligibility = new RentalIneligibilityModel();
            self.rentalDefaultCC = new RentalDefaultCCModel();
            self.fetches = [
                self.durationCollection.fetch(),
                self.termCollection.fetch()
            ];
            self.matrixChildren = [];
            self.defaultCC = {};
            if (_.isEmpty(self.pdp.getAllMatrixChilds())) {
                self.matrixChildren = self.pdp.getItemInfo() && self.pdp.getItemInfo().item && self.pdp.getItemInfo().item.matrixchilditems_detail ? self.pdp.getItemInfo().item.matrixchilditems_detail : []
            } else {
                self.matrixChildren = self.pdp.getAllMatrixChilds();
            }
            promiseProfileModel
                .done(function donePromiseProfileModel(profile) {
                    isLoggedIn = profile && profile.isLoggedIn === 'T';
                    customerId = profile.internalid;
                    jQuery
                        .when(
                            self.durationCollection.fetch(),
                            self.termCollection.fetch(),
                            self.rentalDefaultCC.getDefaultCCExpiration(customerId)
                        )
                        .done(function doneFetchingCollections(resultDuration, resultTerm, resultDefaultCC) {
                            self.rentalDurations = resultDuration[0];
                            self.academicTerms = resultTerm[0];
                            self.defaultCC = resultDefaultCC[0];
                            if (isLoggedIn) {
                                jQuery
                                    .when(self.rentalEligibility.validateCustomer(profile.internalid))
                                    .done(function doneValidatingCustomer(resultValidateCustomer) {
                                        if (resultValidateCustomer) {
                                            self.setRentalEligibility();
                                        }
                                        self.render();
                                    });
                            } else {
                                self.render();
                            }
                        })
                        .fail(function failFetchingCollections(error) {
                            console.error(
                                'Failed to fetch durations and/or academic terms for rentals:',
                                error
                            );
                        });
                })
                .fail(function failPromiseProfileModel(error) {
                    console.error('Failed to get profile model for rentals:', error);
                });
        },
         /**
         * @method setRentalEligibility
         */
        setRentalEligibility: function setRentalEligibility() {
            var self = this;
            var unableToRentMessage = this.environment.getConfig('rentalItemIneligibleToRentMessage');
            var ineligibilityReasons = '';
            if (self.rentalEligibility.getReasons()) {
                ineligibilityReasons = '<p class="product-line-stock-msg-out"><span class="product-line-stock-icon-out"><i></i></span><span class="product-line-stock-msg-out-text">' + unableToRentMessage + '</span></p></br>'; // eslint-disable-line
                _.each(self.rentalEligibility.getReasons(), function eachReason(reason) {
                    ineligibilityReasons = ineligibilityReasons + '<p class="product-line-stock-msg-out"><span class="product-line-stock-icon-out"><i></i></span><span class="product-line-stock-msg-out-text">' + reason.name + '</span></p></br>'; // eslint-disable-line
                });
            } 
            self.ineligibilityReasons = ineligibilityReasons;
            self.eligibleToRent = self.rentalEligibility.isEligible();
        },
        /**
         * @method setOption   
         * @param  {Object} e  baseEvents 
         * 
         */
        setOption: function setOption(e) {
            var self = this;
            var $target = jQuery(e.currentTarget);
            var cartOptionId = $target.closest('[data-type="option"]').data('cart-option-id');
            var value = ($target.val() || $target.data('value') || '') + '';
            var academicTerms = [];
            var schoolsList = [];
            var durations = [];
            e.preventDefault();
            // If option is selected, remove the value
			if ($target.data('active')) {
				value = null;
            } 
            // Make sure terms accepted checkbox gets unchecked when term selection changes
            switch(cartOptionId) {
                case self.purchaseTypeOptionId:
                    self.clearOptions([
                        self.rentalOptionId,
                        self.durationOptionId,
                        self.termsAndConditionOptionId,
                        self.conditionOptionId,
                        self.schoolOptionId,
                        self.academicTermOptionId
                    ]);
                    // Needs to set before rental type and purchase type is checked
                    self.pdp.setOption(cartOptionId, value);
                    if (self.isRentalTypeSelected()) {
                        self.pdp.setOption(self.rentalOptionId, 'T');
                    } else {
                        self.pdp.setOption(self.rentalOptionId, null);
                    }
                    break;
                
                case self.conditionOptionId:
                    self.clearOptions([
                        self.durationOptionId,
                        self.academicTermOptionId,
                        self.termsAndConditionOptionId,
                        self.schoolOptionId
                    ]);
                    self.pdp.setOption(cartOptionId, value);
                    if (self.isRentalTypeSelected()) {
                        schoolsList = self.getSchoolsList();
                        //currentOptionValue = self.getOptionInternalId(self.conditionOptionId);
                        // Set first school as default if there's only one school available
                        //var schoolOptionValue = schoolsList.length === 1 && currentOptionValue !== value ? schoolsList[0].internalid : null;
                        var schoolOptionValue = schoolsList.length === 1 && value !== null ? schoolsList[0].internalid : null;
                        self.pdp.setOption(self.schoolOptionId, schoolOptionValue);
                    }
                    break;
                
                case self.schoolOptionId:
                    self.clearOptions([
                        self.durationOptionId,
                        self.academicTermOptionId
                    ]);
                    self.pdp.setOption(cartOptionId, value);
                    if (this.isRentalTypeSelected()) {
                        academicTerms = self.getAcademicTerms();
                        // Set first term as default if there's only one academic available
                        var termOptionValue = academicTerms.length === 1 && value !== null ? academicTerms[0].internalid : null;
                        self.pdp.setOption(self.academicTermOptionId, termOptionValue);
                    }
                    break;
                
                case self.academicTermOptionId:
                    self.clearOptions([
                        self.termsAndConditionOptionId
                    ]);
                    self.pdp.setOption(cartOptionId, value);
                    if (self.isRentalTypeSelected()) {
                        durations = self.mapFilteredDurations();
                        //currentOptionValue = self.getOptionInternalId(self.academicTermOptionId);
                        // Set first duration as default if there's only one duration available
                        var duationOptionValue = durations.length === 1 && value !== null ? durations[0].internalid : null;
                        self.pdp.setOption(self.durationOptionId, duationOptionValue);
                    }
                    self.pdp.setOption(cartOptionId, value);
                    break;
                
                case self.durationOptionId:
                    self.clearOptions([
                        self.termsAndConditionOptionId
                    ]);
                    self.pdp.setOption(cartOptionId, value);
                    break;
                default:
                    self.pdp.setOption(cartOptionId, value);
                    break;
            }
            if (!self.isQuickView && !self.isAdoptionSearchPDPView) {
                self.currentView.updateURL();
            }
            self.render();
        },
        /**
         * @method clearOptions   
         * @param  {Array}       options 
         */
        clearOptions: function clearOptions(options) {
            var self = this;
            self.pdp.cancelableDisable('afterOptionSelection');
            _.each(options, function clearIds(option) {
                self.pdp.setOption(option, null);
            });
            self.pdp.cancelableEnable('afterOptionSelection'); 
        },
        /**
         * @method  getSchoolsList   Custom function to map the duration models to a more usable format
         * @returns {Array}          Atrray of school ids
         */
        getSchoolsList: function getSchoolsList() {
            var self = this;
            var schoolsList = [];
            var school = {};
            var selectedSchool = this.getOptionInternalId(self.schoolOptionId);
            var academicTermSchoolIds = [];
            self.schoolsWithNoActiveTerms = [];
            if (self.academicTerms) {
                // Get all academicTerm's school ids
                academicTermSchoolIds = _.pluck(_.pluck(self.academicTerms, 'school'), 'internalid');
            }
            self.durationCollection.each(function eachDurationModel(duration) {
                school = duration.get('school');
                if (school) {
                    // If the school has no active terms, don't display it
                    if (!_.contains(academicTermSchoolIds, school.internalid)) {
                        if (!_.contains(self.schoolsWithNoActiveTerms, school.internalid)) {// Push if it's not already pushed
                            self.schoolsWithNoActiveTerms.push(school.internalid);
                        }
                    }
                    if (!_.findWhere(schoolsList, {internalid: school.internalid})) {
                        school.isActive = selectedSchool === school.internalid;
                        schoolsList.push(school);
                    }
                }
            });
            return schoolsList;
        },
        /**
         * @method  getAcademicTerms   Custom function to map the duration models to a more usable format
         * @returns {Array}            Atrray of school ids
         */
        getAcademicTerms: function getAcademicTerms() {
            var self = this;
            var selectedSchoolId = self.getOptionInternalId(self.schoolOptionId);
            var terms = _.filter(self.academicTerms, function filterAvailableTerms(term) {
                return term.school && term.school.internalid && term.school.internalid == selectedSchoolId;
            });
            // Set default first term if only one term
            if (terms.length === 1 && self.selectedItemIsRentable()) {
                self.pdp.setOption(self.academicTermOptionId, terms[0].internalid);
            }
            return terms;
        },
        /**
         * @method  mapAcademicTerms   Add label to each term and mark active
         * @returns {Array}            Array of filtered academic terms
         */
        mapAcademicTerms: function mapAcademicTerms() {
            var self = this;
            var terms = self.getAcademicTerms();
            var selectedTermId = self.getOptionInternalId(self.academicTermOptionId);
            _.each(terms, function mapAvailableTerms(term) {
                term.isActive = term.internalid == selectedTermId;
            });
            return terms;
        },
         /**
         * @method  mapFilteredDurations   Custom function to map the duration models to a more usable format
         * @returns {Array}                Returns an array of objects
         */
        mapFilteredDurations: function mapFilteredDurations() {
            var self = this;
            var availableSchools = self.getSchoolsList();
            var selectedItem = self.getSelectedItem();
            var durationPriceLevelId;
            var durationPrice;
            var durations = [];
            var selectedSchool = self.getOptionInternalId(self.schoolOptionId);
            var mappedDuations = [];
            var selectedDuarion = self.getOptionInternalId(self.durationOptionId);
            if (!_.isEmpty(selectedItem)) {// Need selected item to get price levels
                // Filter priceless durations
                var durations = _.reject(self.durationCollection.models, function filterPricelessDurations(duration) {
                    durationPriceLevelId = duration.get('priceLevel') && duration.get('priceLevel').internalid || null;
                    if (durationPriceLevelId) {
                        durationPrice = selectedItem['pricelevel' + durationPriceLevelId];
                        return !durationPrice;
                    }
                    return true;    
                });
            }
            // Filter durations based on selected school
            if (selectedSchool && availableSchools.length) {
                durations = _.filter(durations, function filterDurationModels(duration) {
                    return duration.get('school') && duration.get('school').internalid === selectedSchool;
                });
            }
            mappedDuations = _.map(durations, function mapDurationModels(durationModel) {
                var durationType = durationModel.get('durationType') || {};
                var school = durationModel.get('school') || {};
                var label = school.name + ' -- ' + durationType.name;
                label += durationType.name !== 'Term' ? ': ' + durationModel.get('rentalDuration') : '';
                return {
                    durationType: durationType.name,
                    internalid: durationModel.get('internalid'),
                    school: school.name,
                    rentalDuration: durationModel.get('rentalDuration'),
                    isActive: durationModel.get('internalid') === selectedDuarion,
                    label: label
                };
            });
            return mappedDuations;
        },
        /**
         * @method  getSelectedItem
         * @return  {Object}          
         */
        getSelectedItem: function getSelectedItem() {
            var selectedMatrixChild = this.pdp.getSelectedMatrixChilds();
            return selectedMatrixChild.length === 1 ? selectedMatrixChild[0] : {};
        },
        /**
         * @method  selectedItemIsRentable 
         * @return  {Boolean}                
         */
        selectedItemIsRentable: function selectedItemIsRentable() {
            var selectedMatrixChild = this.getSelectedItem();
            return !_.isEmpty(selectedMatrixChild) && selectedMatrixChild[this.rentalItemId] === true ? true : false;          
        },
        /**
         * @method  requiresSpecialSelection 
         * @return  {Boolean}                
         */
        requiresSpecialSelection: function requiresSpecialSelection() {
            var self = this;
            var itemInfo = self.pdp.getItemInfo();
            var children = itemInfo.item.matrixchilditems_detail || [];
            var required = _.find(children, function findSpecialField(child) {
                return child[self.productTypeId] && child[self.productTypeId] !== '&nbsp;';
            });
            return !_.isEmpty(required);
        },
        /**
         * @method  getRentableChildren  Get all rentable matrix subitems
         * @return  {Array}              Rental Matrix subitems
         */
        getRentableChildren: function getRentableChildren() {
            return _.filter(this.matrixChildren, function filterRentalItems(child) {
                return (child.custitem_nsts_csic_erp_rental && !child.custitem_nsts_csic_cei_item && !child.custitem_nsts_csic_redshelf_item);
            });
        },
        /**
         * @method  isRentalTypeSelected   Check if current selected purchase type is rental
         * @return  {Boolean}              True if rental, false otherwise
         */
        isRentalTypeSelected: function isRentalTypeSelected() {
            return this.getOptionInternalId(this.purchaseTypeOptionId) === this.RENT_TYPE;
        },
        /**
         * @method  isDigitalTypeSelected   Check if current selected purchase type is rental
         * @return  {Boolean}               True if rental, false otherwise
         */
        isDigitalTypeSelected: function isDigitalTypeSelected() {
            return this.getOptionInternalId(this.purchaseTypeOptionId) === this.DIGITAL_TYPE;
        },
        /**
         * @method  isBuyTypeSelected   Check if current selected purchase type is rental
         * @return  {Boolean}           True if rental, false otherwise
         */
        isBuyTypeSelected: function isBuyTypeSelected() {
            return this.getOptionInternalId(this.purchaseTypeOptionId) === this.BUY_TYPE;
        },
        /**
         * @method  getDigitalChildren   Get all digital matrix subitems
         * @return  {Array}              Digital Matrix subitems
         */
        getDigitalChildren: function getDigitalChildren() {
            return _.filter(this.matrixChildren, function filterDigitalItems(child) {
                return child.custitem_nsts_csic_cei_item || child.custitem_nsts_csic_redshelf_item;
            });
        },
        /**
         * @method  getOption  Provided optionid, get current selected option
         * @return  {Object}   Selected option value or empty object
         */
        getOption: function getOption(optionId) {
            var itemInfo = this.pdp.getItemInfo();
            
            return _.findWhere(itemInfo.options, {cartOptionId: optionId}) || {};
        },
        /**
         * @method  getOptionInternalId  Provided optionid, get current selected option
         * @return  {String}             Selected option internalid or null
         */
        getOptionInternalId: function getOptionInternalId(optionId) {
           return this.getOption(optionId).value && this.getOption(optionId).value.internalid || null;
        },
        /**
         * @method  getAvailableMatrixChildren  Return matrix children based on current purchase type option selected
         * @return  {Array}                     Filtered children
         */
        getAvailableMatrixChildren: function getAvailableMatrixChildren() {
            var self = this;
            var selectedPurchaseType = self.getOption(self.purchaseTypeOptionId).value ? self.getOption(self.purchaseTypeOptionId).value.internalid : null;
            var matrixChildren = [];
            switch (selectedPurchaseType) {
            case self.BUY_TYPE:
                // Remove digital items
                matrixChildren = _.reject(self.matrixChildren, function rejectDigitalItems(child) {
                    return child.custitem_nsts_csic_cei_item || child.custitem_nsts_csic_redshelf_item;
                });
                break;
            case self.RENT_TYPE:
                // Remove digital items, show rental duration options
                matrixChildren = self.getRentableChildren();
                break;
            case self.DIGITAL_TYPE:
                // Only show digital
                matrixChildren = self.getDigitalChildren();
                break;
            default:
                matrixChildren = [];
            }
            return matrixChildren;
        },
         /**
         * @method  getSchoolsFromRentalDurations
         * @return  {Array}
         */
        getSchoolsFromRentalDurations: function getSchoolsFromRentalDurations() {
            var rentalDurations = this.rentalDurations || [];
            var schools = [];
            if (rentalDurations && rentalDurations.length) {
                schools = _.pluck(_.pluck(rentalDurations, 'school'), 'internalid');
            }
            return _.uniq(schools);
        },
        /**
         * @method  getContext
         * @return  Rentals.View.Context
         */
        getContext: function getContext() {
            var self = this;
            var rentableChildren = self.getRentableChildren();
            var digitalChildren = self.getDigitalChildren();
            var purchaseTypeOptionValues = self.getOption(self.purchaseTypeOptionId).values;
            var purchaseTypes = [];
            var profileModel = ProfileModel.getInstance();
            var isLoggedIn = profileModel.get('isLoggedIn') === 'T';
            var schoolsList = self.getSchoolsList();
            var unableToRentMessage = '';
            var durationExceededMessage = '';
            var profileSchoolAffiliations = profileModel.get('schoolsWithIds') || [];
            var schoolAffiliationRequired = SC.ENVIRONMENT.published.CSConfig.rentals.schoolIdRequired;
            var showSchoolsList = !!(schoolsList && schoolsList.length);
            if (showSchoolsList) {
                if (_.isEmpty(profileSchoolAffiliations)) {
                    if (schoolAffiliationRequired) {
                        showSchoolsList = false;
                    }
                } else {
                    schoolsList = _.filter(schoolsList, function (school) {
                        return _.contains(profileSchoolAffiliations, school.internalid);
                    });
                }
            }
            // NOTE: Set purchase type to digital and don't show purchase types if all children are digital
            // In case of standalone non-matrix items, matrixChildren length is 0. Digital item will always have at least one matrix child
            if (self.matrixChildren.length > 0 && self.matrixChildren.length === digitalChildren.length) {
                self.pdp.setOption(self.purchaseTypeOptionId, self.DIGITAL_TYPE);
            } else if (purchaseTypeOptionValues) { // Add purchase type options to show on PDP
                purchaseTypes.push(purchaseTypeOptionValues[1]); // Buy
                if (rentableChildren.length) {
                    purchaseTypes.push(purchaseTypeOptionValues[2]); // Rent
                }
                if (digitalChildren.length) {
                    purchaseTypes.push(purchaseTypeOptionValues[3]); // Digital
                }
            }
            _.each(purchaseTypes, function setIsSelectedFlag(type) {
                type.isActive = type.internalid === self.getOptionInternalId(self.purchaseTypeOptionId);
            });
            // Show available conditions based on selected purchase type
            var availableMatrixChildren = self.getAvailableMatrixChildren();
            var availableConditionLabels = _.pluck(availableMatrixChildren, self.productTypeId);
            var conditionOptionValues = self.getOption(self.conditionOptionId).values || [];
            var availableConditions = _.filter(conditionOptionValues, function getAvailableConditions(condition) {
                return condition.internalid && _.contains(availableConditionLabels, condition.label);
            });
            _.each(availableConditions, function setIsSelectedFlag(condition) {
                condition.isActive = condition.internalid === self.getOptionInternalId(self.conditionOptionId);
            });
            if (self.isRentalTypeSelected()) {
                if (isLoggedIn) {
                    if (!showSchoolsList || schoolsList.length === 0) {
                        unableToRentMessage = self.environment.getConfig('rentalItemAffiliationRequiredMessage');
                    }
                } else {
                    unableToRentMessage = self.environment.getConfig('rentalItemLoginRequiredMessage');
                }
            }   
            var availableTerms = self.mapAcademicTerms();
            var rentalDurations = self.mapFilteredDurations();
            var selectedTerm;
            for (var i = 0; i < availableTerms.length; i ++) {
                var term = availableTerms[i];
                if (term.isActive) {
                    selectedTerm = availableTerms[i];
                }
            };
            var selectedDuration;
            var selectedDurationIndex;
            for (var i = 0; i < rentalDurations.length; i ++) {
                var duration = rentalDurations[i];
                if (duration.isActive) {
                    selectedDuration = rentalDurations[i];
                    selectedDurationIndex = i;
                }
            };
            var durationEndDate;
            var ccExpThresholdPref = SC.ENVIRONMENT.published.CSConfig && SC.ENVIRONMENT.published.CSConfig.rentals && SC.ENVIRONMENT.published.CSConfig.rentals.cc_exp_threshold;
            // only need to check if duration is populated since term has to be selected prior
            // check if self.defaultCC is populated, then check for ccexpiredate
            if (selectedDuration && self.defaultCC && self.defaultCC.ccexpiredate) {
                var durationType = selectedDuration.durationType;
                if (durationType === 'Term') {
                    durationEndDate = new Date(selectedTerm.onlineEndDate);
                    durationEndDate.setDate(durationEndDate.getDate() + parseInt(selectedTerm.gracePeriodLength, 10) + parseInt(ccExpThresholdPref, 10));
                }
                else {
                    var durationLength = parseInt(selectedDuration.rentalDuration);
                    durationEndDate = new Date();
                    durationEndDate.setDate(durationEndDate.getDate() + durationLength + parseInt(selectedTerm.gracePeriodLength, 10) + parseInt(ccExpThresholdPref, 10));
                }
                var durationEndMonth = durationEndDate.getMonth();
                var durationEndDay = durationEndDate.getDate();
                var durationEndYear = durationEndDate.getFullYear();
    
                var defaultCCExpiration = new Date(self.defaultCC.ccexpiredate);
                var defaultCCExpMonth = defaultCCExpiration.getMonth();
                var defaultCCExpYear = defaultCCExpiration.getFullYear();
    
                var defaultCCExpirationMessage = self.environment.getConfig('rentalItemDefaultCCExpirationMessage');
    
                var durationExceedsExpiration = (defaultCCExpYear < durationEndYear) || (defaultCCExpYear === durationEndYear && defaultCCExpMonth < durationEndMonth);
    
                if (durationExceedsExpiration) {
                    durationExceededMessage = defaultCCExpirationMessage + ' Duration End Date: ' + (durationEndMonth + 1) + '/' + (durationEndDay) + '/' + durationEndYear + ', Default Credit Card Expiration Date: ' + (defaultCCExpMonth + 1) + '/' + defaultCCExpYear + '.';
                    self.clearOptions([self.durationOptionId]);
                    // this clears the option in the url so the user has to reselect a duration and run through the logic again
                }
            }
            
            return {
                showLabel: true,
                showModifiedSelection: self.requiresSpecialSelection(),
                availablePurchaseTypes: purchaseTypes,
                showPurchaseTypeSelection: purchaseTypes.length,
                availableConditions: availableConditions,
                showConditionSelection: self.getOptionInternalId(self.purchaseTypeOptionId) && availableConditions.length,
                inEligibleToRent: !self.eligibleToRent || !_.isEmpty(unableToRentMessage),
                ineligibilityReasons: self.ineligibilityReasons,
                unableToRentMessage: unableToRentMessage,
                durationExceededMessage: durationExceededMessage,
                rentAndConditionSelected: self.selectedItemIsRentable() && self.isRentalTypeSelected() && self.getOptionInternalId(self.conditionOptionId),
                schoolsList: schoolsList,
                showSchoolsList: showSchoolsList,
                selectedSchoolHasNoActiveTerms: _.contains(self.schoolsWithNoActiveTerms, self.getOptionInternalId(self.schoolOptionId)),
                academicTerms: availableTerms,
                showAcademicTerms: availableTerms && availableTerms.length,
                showDurations: availableTerms.length && self.getOptionInternalId(self.academicTermOptionId),
                rentalDurations: rentalDurations
            };
        }
	});
});
define('TermsAndConditions.View.Rentals', [
    'Rentals.View',
    'Utils',
    'underscore'
], function(
    RentalsView,
    Utils,
    _
) {
    'use strict';
    _.extend(RentalsView.prototype, {
        initialize: _.wrap(RentalsView.prototype.initialize, function(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
            
            // Get from configurations, hardcoded for now
            var self = this;
            if (self.environment.getConfig('termsandconditionEnabled')) {
                var TermsAndConditionsView = require('TermsAndConditions.View');
                _.extend(TermsAndConditionsView.prototype, {
                    getRequiredDocuments: _.wrap(TermsAndConditionsView.prototype.getRequiredDocuments, function(fn) {
                        var requiredDocs = fn.apply(this, _.toArray(arguments).slice(1));
                        // Show terms and conditions only if rental school duration is selected 
                        if (self.isRentalTypeSelected()) {
                            var selectedDuarionId = self.getOptionInternalId(self.durationOptionId);
                            var item = this.pdp.getItemInfo().item;
                            if (selectedDuarionId) {
                                var selectedDurationModel = self.durationCollection.get(selectedDuarionId);
                                var rentalContractIds = selectedDurationModel ? selectedDurationModel.get('rentalContracts') : [];
                                var selectedTermId =  self.getOptionInternalId(self.academicTermOptionId);
                                var selectedTermModel = selectedTermId && _.findWhere(self.academicTerms, {'internalid': selectedTermId});
                                var selectedTermEndDate = selectedTermModel && selectedTermModel.endDate && new Date(selectedTermModel.endDate);
                                var dueDate = (selectedDurationModel && selectedDurationModel.calculateDueDate()) || selectedTermEndDate;
                                var allScaDocuments = SC.ENVIRONMENT.published.scaDocuments && SC.ENVIRONMENT.published.scaDocuments.length ? Utils.deepCopy(SC.ENVIRONMENT.published.scaDocuments) : [];
                                
                                _.each(allScaDocuments, function eachScaDocument(document) {
                                    // Add rental contract documents in addition to requiredDocs. Also make sure that duplicate document isn't being added.
                                    if (_.contains(rentalContractIds, document.internalid) && !_.findWhere(requiredDocs, {'internalid': document.internalid})) {
                                        requiredDocs.push(document);
                                    }
                                });
                                // Replace item name and due date tags in text
                                requiredDocs = _.map(requiredDocs, function mapRequiredDocuments(document) {
                                    if (document.documentText) {
                                        document.documentText = document.documentText.replace(/&lt;item&gt;/gi, item.displayname || item.itemid);
                                        document.documentText = document.documentText.replace('[[itemname]]', item.displayname || item.itemid);
                                        document.documentText = dueDate ? document.documentText.replace('[[duedate]]', dueDate.toDateString()) : document.documentText;
                                    }
                                    return document;
                                });
                            } else {
                                // Do not show Terms and Conditions view yet until Rental selection is complete
                                requiredDocs = [];
                            }
                        }
                        return requiredDocs;
                    })
                });
            }
        })
    });
});
define('Transaction.Line.Model.Rentals', [
    'Transaction.Line.Model',
    'RentalDuration.Collection',
    'Rentals.Helper',
    'SC.Configuration',
    'underscore'
], function TransactionLineModelRentals(
    TransactionLineModel,
    RentalDurationCollection,
    RentalsHelper,
    Configuration,
    _
) {
    'use strict';
    _.extend(TransactionLineModel.prototype, RentalsHelper);
    _.extend(TransactionLineModel.prototype, {
        initialize: _.wrap(TransactionLineModel.prototype.initialize, function initialize(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
            var self = this;
            var durationCollection = new RentalDurationCollection();
            durationCollection.fetch()
                .done(function fetch(rentalDurations) {
                    self.rentalDurations = rentalDurations;
                    self.trigger('changeRentalDurationPrice');
            });
        }),
        
        getPrice: _.wrap(TransactionLineModel.prototype.getPrice, function getPrice(fn) {
            var result = fn.apply(this, _.toArray(arguments).slice(1));
            var selectedItem = this.get('item');
            var rentaldurationPrice = this.getDurationPrice(selectedItem, this.rentalDurations);
    
            return _.extend(result, rentaldurationPrice);
        }),
        /**
         * itemOptions.optionsConfiguration from Configuration filters out all rental options and getVisibleOptions always returns an empty collection.
         * For Rentals it's okay to hide them as Rentals Extension takes care of showing/hiding rental options. However, we don't want to hide options 
         * for Mini Cart, Cart and Checkout views. Below code bypasses itemOptions.optionsConfiguration logic in ProductLine.Common and returns all the
         * options Collection. TODO: Find a better way for handling this logic in SC Configuration for both PDP and Transaction Lines.  
         */
        getVisibleOptions: _.wrap(TransactionLineModel.prototype.getVisibleOptions, function getVisibleOptions() {
            var visibleOptions = this.get('options').models;
            var myAccountOptionsToHide = Configuration.get('rentalItemMyAccountHiddenLineIds') || [];
            var application = SC.ENVIRONMENT.SCTouchpoint || '';
            // Hide extra item options in MyAccount Purchase History Sales Order View based on item option fields listed in Configuration 
            if (application === 'myaccount') {
                visibleOptions = _.reject(visibleOptions, function(option) {
                    return _.contains(myAccountOptionsToHide, option.get('cartOptionId'));
                });
            } 
            return _.sortBy(visibleOptions, function sortBy(option) {
                return option.get('index');
            });
        })
    });
});
define('Transaction.Line.Views.Price.View.Rentals', [
	'Transaction.Line.Views.Price.View',
	'underscore'
],	function TransactionLineViewsPriceViewRentals(
	TransactionLineViewsPriceView,
	_
) {
	'use strict';
	_.extend(TransactionLineViewsPriceView.prototype, {
		initialize: _.wrap(TransactionLineViewsPriceView.prototype.initialize, function initialize(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
			
			this.model.on('changeRentalDurationPrice', this.render, this);
		}),
		
		getContext: _.wrap(TransactionLineViewsPriceView.prototype.getContext, function getContext(fn) {
			var originalContext = fn.apply(this, _.toArray(arguments).slice(1));
			var durationOption = this.model.getOption('custcol_nsts_csre_dur');
			var durationOptionId = durationOption && durationOption.get('value') && durationOption.get('value').internalid;
			if (durationOptionId) {
				originalContext.showComparePrice = false;
			}
			
			return originalContext;
		})
	});
});
define('CampusStores.Rentals.Shopping', [
    'Rentals.View',
    'RentalDuration.Collection',
    'Product.Model.Rentals',
    'TermsAndConditions.View.Rentals',
    'Cart.AddToCart.Button.View.Rentals',
    'Transaction.Line.Model.Rentals',
    'Transaction.Line.Views.Price.View.Rentals',
    'Header.MiniCartItemCell.View.Rentals',
    'Item.KeyMapping.Rentals',
    'ProductViews.Price.View.Rentals',
    'Cart.Item.Summary.View.Rentals'
], function CampusStoresRentalsShopping(
    RentalsView,
    RentalDurationCollection
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var pdp = container.getComponent('PDP');
            var environment = container.getComponent('Environment');
            var self = this;
            
            if (environment.getConfig('rentalsEnabled')) {
                try {
                    // NOTE: All item options are child views of Options.Collection in original PDP view.
                    // Make sure rental options are also child view of Options.Collection to get it working with PDP mobile view.
                    var rentalsChildViews = this.getRentalsChildView({
                        pdp: pdp,
                        container: container,
                        environment: environment
                    });
                    pdp.addChildViews(pdp.PDP_FULL_VIEW, rentalsChildViews);
                    pdp.addChildViews(pdp.PDP_QUICK_VIEW, rentalsChildViews);
                } catch (error) {
                    console.log('Failed adding Rentals as a child view for PDP_FULL_VIEW and PDP_QUICK_VIEW: ', error);
                }
                container.on('afterStart', function afterStartApplication(application) {
                    if (environment.getConfig('adoptionsearchEnabled')) {
                        try {
                            var pdp = application.getComponent('PDP');
                            var rentalsAdoptionChildViews = self.getRentalsChildView({
                                pdp: pdp,
                                container: application,
                                environment: environment
                            });
                            pdp.addChildViews(pdp.PDP_ADOPTION_SEARCH_VIEW, rentalsAdoptionChildViews);
                        } catch (error) {
                            /**
                             * NOTE: It's possible for the CDN cache to keep the adoptionsearchEnabled environment variable set to
                             * true for a certain amount of time after the Adoption Search Extension has been deactivated. This
                             * try/catch is added to catch the error where adoptionsearchEnabled is still true according to the
                             * CDN cache, but Adoption Search Extension is deactivated.
                             */
                            console.log('Failed adding Rentals as a child view of PDP_ADOPTION_SEARCH_VIEW: ', error);
                        }
                    }
                });
            }
            /**
             * NOTE: Even though Rental duration collection is cached collection, for some reason PLP fetches this collections number of times.
             * For instance, if you have 25 items on PLP, it'll request RentalDuration.Service.ss 25 times. This is due to Product.Model.Rentals
             * fetches this collection in initialize() method, and we do need that for showing correct rental prices. Solution would be to fetch
             * rental duration collection here in mountToApp() so that cached data is available in entrire shoppig application.
             */
            var durationCollection = new RentalDurationCollection(); 
            durationCollection.fetch();
        },
        getRentalsChildView: function getRentalsChildView(options) {
            var rentalsChildViews = {
                'Options.Collection': {
                    'Rentals.View': {
                        childViewIndex: 11,
                        childViewConstructor: function childViewConstructor() {
                            return new RentalsView({
                                container: options.container,
                                pdp: options.pdp,
                                environment: options.environment
                            });
                        }
                    }
                }
            }
            return rentalsChildViews;
        }
    };
});
};
extensions['CampusStores.SchoolAffiliationExtension.1.2.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/SchoolAffiliationExtension/1.2.4/' + asset;
};
define('Cart.AddToCart.Button.View.SchoolAffiliation', [
    'SchoolAffiliation.ListProvider',
    'Cart.AddToCart.Button.View',
    'Profile.Model',
    'underscore'
], function CartAddToCartButtonViewSchoolAffiliation(
    ListProvider,
    CartAddToCartButtonView,
    ProfileModel,
    _
) {
    'use strict';
    var viewPrototype = CartAddToCartButtonView.prototype;
    _.extend(viewPrototype, {
        addToCart: _.wrap(viewPrototype.addToCart, function initialize(fn) {
            var response = this.checkAffiliation();
            if (response.response){
                this.showError(response.message);
                return false;
            }
            return fn.apply(this, _.toArray(arguments).slice(1));
        }),
        checkAffiliation: function () {
            var itemRequiresCustomer = this.model.attributes.item.get('custitem_nsts_csic_cust_reqd');
            var itemPurchasersAllowed = this.model.attributes.item.get('custitem_nsts_csic_purch_allowed');
            var profile = ProfileModel.getInstance();
            var categoryLists = ListProvider.get('categoryLists');
            var additionalCategories = profile.get('additionalCategories');
            var customerCategory = profile.get('customerCategory');
            var customerCategoryName = '';
            var newAdditionalCategories = [];
            var response = false;
            var message = '';
            if (itemRequiresCustomer && itemPurchasersAllowed == '&nbsp;' && profile.get('isLoggedIn') === 'F') {
                message = 'You must be logged in to add this item to cart'; //TODO: move this hardcoded message to SC Config or prefs
                response = true;
            }
            else if (itemRequiresCustomer && itemPurchasersAllowed != '&nbsp;' && profile.get('isLoggedIn') === 'F') {
                message = SC.ENVIRONMENT && SC.ENVIRONMENT.published && SC.ENVIRONMENT.published.CSConfig &&
                	SC.ENVIRONMENT.published.CSConfig.schoolAffiliation && SC.ENVIRONMENT.published.CSConfig.schoolAffiliation.purch_allow_message;
                //message = 'TEST 2 You must be logged in with an authorized user account to add this item to cart';
                response = true;
            }
            else if (profile.get('isLoggedIn') === 'T' && itemPurchasersAllowed != '&nbsp;') {
                response = true;
                message = SC.ENVIRONMENT && SC.ENVIRONMENT.published && SC.ENVIRONMENT.published.CSConfig &&
            	SC.ENVIRONMENT.published.CSConfig.schoolAffiliation && SC.ENVIRONMENT.published.CSConfig.schoolAffiliation.purch_allow_message;
                //message = 'TEST You must be logged in with an authorized user account to add this item to cart';
                itemPurchasersAllowed = itemPurchasersAllowed.split(',');
                _.each(categoryLists, function (val) {
                    if (_.contains(additionalCategories, val.internalid)) {
                        var nCat = {};
                        nCat.internalid = val.internalid;
                        nCat.name = val.name;
                        newAdditionalCategories.push(nCat);
                    }
                    if (customerCategory == val.internalid) {
                        customerCategoryName = val.name;
                    }
                });
                _.each(itemPurchasersAllowed, function (purchAll) {
                    var trimPurchAll = purchAll.trim();
                    if (_.any(newAdditionalCategories, {name: trimPurchAll})) {
                        response = false;
                    }
                    if(trimPurchAll == customerCategory || customerCategoryName == trimPurchAll) {
                        response = false;
                    }
                });
            }
            return {response: response, message: message};
        },
        getContext: _.wrap(viewPrototype.getContext, function getContext(fn) {
            return fn.apply(this, _.toArray(arguments).slice(1));
        })
    });
});
define('Header.Menu.MyAccount.View.SchoolAffiliation', [
    'Header.Menu.MyAccount.View',
    'underscore',
    'jQuery'
], function HeaderMenuMyAccountViewSchoolAffiliation(
    HeaderMenuMyAccountView,
    _,
    jQuery
) {
    'use strict';
    var viewPrototype = HeaderMenuMyAccountView.prototype;
    _.extend(viewPrototype, {
        initialize: _.wrap(viewPrototype.initialize, function initialize(fn) {
            var $creditCardNode;
            var customerIdNodeString = '<a class="header-menu-myaccount-anchor-level3" href="#"'
                                    + ' data-touchpoint="customercenter" data-hashtag="#schoolids" name="schoolids">'
                                    + _('Schools & Ids').translate()
                                    + '</a>';
            var $customerIdNode = jQuery(customerIdNodeString);
            fn.apply(this, _.toArray(arguments).slice(1));
            this.on('afterViewRender', function afterViewRenderHandler() {
                $creditCardNode = this.$('[name="creditcards"]');
                if ($creditCardNode) {
                    $customerIdNode.insertAfter($creditCardNode);
                }
            }.bind(this));
        })
    });
});
/**
 * NOTE: login_register_register.tpl has data-view="Register.CustomFields" placeholder in the default base theme templates.
 * Other themes like Horizon and Summit are missing such placeholder, and SchoolAffiliation.Register.View can't be added
 * as child view due to missing data-view. To fix this issue, we've extended LoginRegister.Register.View to add placeholder
 * manually with jQuery ONLY if it's missing from login_register_register.tpl, so that childview can be rendered.
 */
define('LoginRegister.Register.View.SchoolAffiliation', [
    'LoginRegister.Register.View',
    'SchoolAffiliation.Register.View',
    'underscore',
    'jQuery'
], function LoginRegisterRegisterViewSchoolAffiliation(
    LoginRegisterRegisterView,
    SchoolAffiliationRegisterView,
    _,
    jQuery // eslint-disable-line
) {
    'use strict';
    var viewPrototype = LoginRegisterRegisterView.prototype;
    _.extend(viewPrototype, {        
        initialize: _.wrap(viewPrototype.initialize, function initialize(fn) {
            fn.apply(this, _.toArray(arguments).slice(1));
            var self = this,
                registerCustomFields = [],
                password2Node = [],
                registerCustomFieldsNode = [];
            self.on('beforeCompositeViewRender', function addCustomFieldsChildView() {
                registerCustomFields = self.$el.find('[data-view="Register.CustomFields"]');
                
                // Add placeholder Register.CustomFields only if it's missing from the template.
                if (!registerCustomFields.length) {
                    try {
                        password2Node = self.$el.find('#register-password2').parent().parent();
                        registerCustomFieldsNode = jQuery('<div data-view="Register.CustomFields"></div>');
                        registerCustomFieldsNode.insertAfter(password2Node);
                    } catch (error) {
                        console.warn('Error in adding Register.CustomFields placeholder: ' + error);
                    }
                }
            });
        }),
        childViews: _.extend(viewPrototype.childViews || {}, {
            'Register.CustomFields': function RegisterCustomFields() {
                return new SchoolAffiliationRegisterView({
                    container: this.application
                });
            }
        })
    });
});
define('SchoolAffiliation.ListProvider', [
], function(
) {
    return {
        get: function get(key) {
            return SC.ENVIRONMENT.published && SC.ENVIRONMENT.published[key];
        }
    };
});
define(
	'CampusStores.SchoolAffiliationExtension.SchoolAffiliation.Shopping'
,   [
		'Header.Menu.MyAccount.View.SchoolAffiliation',
		'Cart.AddToCart.Button.View.SchoolAffiliation'
	]
,   function (
		HeaderMenuMyAccountViewSchoolAffiliation,
		CartAddToCartButtonViewSchoolAffiliation
	)
{
	'use strict';
	return  {
		mountToApp: function mountToApp(container) { // eslint-disable-line
		}
	};
});
};
extensions['SuiteCommerce.SizeChart.1.0.4'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/SuiteCommerce/SizeChart/1.0.4/' + asset;
};
/// <amd-module name="SuiteCommerce.SizeChart.Chart.Collection"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.Collection", ["require", "exports", "Backbone", "SuiteCommerce.SizeChart.Chart.Model", "SuiteCommerce.SizeChart.Common.Utils"], function (require, exports, Backbone_1, Chart_Model_1, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartCollection = /** @class */ (function (_super) {
        __extends(ChartCollection, _super);
        function ChartCollection() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.url = Utils_1.Utils.getAbsoluteUrl(getExtensionAssetsPath('services/SuiteCommerce.SizeChart.Service.ss'));
            _this.model = Chart_Model_1.ChartModel;
            return _this;
        }
        return ChartCollection;
    }(Backbone_1.Collection));
    exports.ChartCollection = ChartCollection;
});
/// <amd-module name="SuiteCommerce.SizeChart.Chart.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartModel = /** @class */ (function (_super) {
        __extends(ChartModel, _super);
        function ChartModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(ChartModel.prototype, "internalId", {
            get: function () {
                return this.get('internalId');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartModel.prototype, "name", {
            get: function () {
                return this.get('recordName');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartModel.prototype, "title", {
            get: function () {
                return this.get('title');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartModel.prototype, "description", {
            get: function () {
                return this.get('description');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartModel.prototype, "chart", {
            get: function () {
                return this.get('chart');
            },
            enumerable: true,
            configurable: true
        });
        return ChartModel;
    }(Backbone_1.Model));
    exports.ChartModel = ChartModel;
});
/// <amd-module name="SuiteCommerce.SizeChart.Chart.Page.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.Page.Model", ["require", "exports", "Backbone", "SuiteCommerce.SizeChart.Chart.Collection", "SuiteCommerce.SizeChart.Common.Utils"], function (require, exports, Backbone_1, Chart_Collection_1, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartPageModel = /** @class */ (function (_super) {
        __extends(ChartPageModel, _super);
        function ChartPageModel(options) {
            return _super.call(this, options) || this;
        }
        Object.defineProperty(ChartPageModel.prototype, "charts", {
            get: function () {
                if (!this.get('charts')) {
                    this.charts = new Chart_Collection_1.ChartCollection();
                }
                return this.get('charts');
            },
            set: function (charts) {
                this.set('charts', charts);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartPageModel.prototype, "isRenderedInModal", {
            get: function () {
                return this.get('isRenderedInModal');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChartPageModel.prototype, "sizeChartSearchKey", {
            get: function () {
                return this.get('sizeChartSearchKey');
            },
            enumerable: true,
            configurable: true
        });
        ChartPageModel.prototype.getPageTitle = function () {
            if (this.sizeChartSearchKey && this.charts.size() > 0) {
                return this.charts.at(0).title;
            }
            return Utils_1.Utils.translate('Size Charts');
        };
        ChartPageModel.prototype.getSizeChartId = function () {
            if (this.sizeChartSearchKey && this.charts.size() > 0) {
                return this.charts.at(0).internalId;
            }
            return;
        };
        return ChartPageModel;
    }(Backbone_1.Model));
    exports.ChartPageModel = ChartPageModel;
});
/// <amd-module name="SuiteCommerce.SizeChart.Chart.Page.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.Page.View", ["require", "exports", "Backbone", "Backbone.CollectionView", "SuiteCommerce.SizeChart.Chart.View", "suitecommerce_sizechart_page.tpl"], function (require, exports, Backbone_1, BackboneCollectionView, Chart_View_1, sizeChartPageTemplate) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartPageView = /** @class */ (function (_super) {
        __extends(ChartPageView, _super);
        function ChartPageView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = sizeChartPageTemplate;
            _this.title = _this.model.getPageTitle();
            return _this;
        }
        Object.defineProperty(ChartPageView.prototype, "childViews", {
            get: function () {
                var _this = this;
                return {
                    'SizeCharts.View': function () {
                        return new BackboneCollectionView({
                            collection: _this.model.charts,
                            childView: Chart_View_1.ChartView,
                            childViewOptions: {
                                showSizeChartTitle: !_this.model.sizeChartSearchKey,
                            },
                        });
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        ChartPageView.prototype.getContext = function () {
            return {
                isRenderedInModal: this.model.isRenderedInModal,
                pageTitle: this.model.getPageTitle(),
                sizeChartId: this.model.getSizeChartId(),
            };
        };
        return ChartPageView;
    }(Backbone_1.View));
    exports.ChartPageView = ChartPageView;
});
/// <amd-module name="SuiteCommerce.SizeChart.Chart.Router"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.Router", ["require", "exports", "Backbone", "SuiteCommerce.SizeChart.NotFoundPage.View", "SuiteCommerce.SizeChart.Chart.Page.Model", "SuiteCommerce.SizeChart.Chart.Page.View", "SuiteCommerce.SizeChart.Instrumentation"], function (require, exports, Backbone_1, NotFoundPage_View_1, Chart_Page_Model_1, Chart_Page_View_1, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartRouter = /** @class */ (function (_super) {
        __extends(ChartRouter, _super);
        function ChartRouter(options) {
            var _this = _super.call(this, options) || this;
            _this.application = options.application;
            _this.environment = options.application.getComponent('Environment');
            return _this;
        }
        Object.defineProperty(ChartRouter.prototype, "routes", {
            get: function () {
                return {
                    'size-charts(/)(/:sizeChartSearchKey)(/)': 'openSizeChartAction',
                };
            },
            enumerable: true,
            configurable: true
        });
        ChartRouter.prototype.openSizeChartAction = function (sizeChartSearchKey) {
            this.showSizeChartView(sizeChartSearchKey);
        };
        ChartRouter.prototype.showSizeChartView = function (sizeChartSearchKey, isRenderedInModal) {
            var _this = this;
            if (isRenderedInModal === void 0) { isRenderedInModal = false; }
            this.isSearchingSizeCharts = true;
            var chartPageModel = new Chart_Page_Model_1.ChartPageModel({
                isRenderedInModal: isRenderedInModal,
                sizeChartSearchKey: sizeChartSearchKey,
            });
            var fetchPromise;
            var sizeChartLoadingTimeLog = Instrumentation_1.default.getLog('sizeChartLoadingTimeLog');
            sizeChartLoadingTimeLog.startTimer();
            if (sizeChartSearchKey) {
                fetchPromise = chartPageModel.charts.fetch({
                    data: { sizeChartSearchKey: sizeChartSearchKey },
                });
            }
            else {
                fetchPromise = chartPageModel.charts.fetch();
            }
            fetchPromise.done(function () {
                sizeChartLoadingTimeLog.endTimer();
                _this.isSearchingSizeCharts = false;
                if (chartPageModel.charts.size() > 0) {
                    var chartPageView = new Chart_Page_View_1.ChartPageView({
                        model: chartPageModel,
                        application: _this.application,
                    });
                    if (isRenderedInModal) {
                        chartPageView.showInModal();
                    }
                    else {
                        chartPageView.showContent();
                        _this.logSizeChartsPageVisit(chartPageModel.charts.size() === 1
                            ? chartPageModel.charts.at(0)
                            : null);
                    }
                }
                else {
                    var notFoundView = new NotFoundPage_View_1.NotFoundView({
                        application: _this.application
                    });
                    notFoundView.showContent();
                }
                sizeChartLoadingTimeLog.setParameters({
                    activity: 'Time it takes to load the size chart data',
                    instanceCount: chartPageModel.charts.size(),
                    totalTime: sizeChartLoadingTimeLog.getElapsedTimeForTimer(),
                });
                sizeChartLoadingTimeLog.submit();
            });
        };
        ChartRouter.prototype.logSizeChartsPageVisit = function (chart) {
            if (chart === void 0) { chart = null; }
            var visitedSizeChartPageLog = Instrumentation_1.default.getLog('visitedSizeChartPageLog');
            visitedSizeChartPageLog.setParameters({
                activity: 'Visited Size Chart landing page',
                message: "Size chart: " + (chart ? "Id:" + chart.internalId + " - Name: " + chart.name : 'All'),
            });
            visitedSizeChartPageLog.submit();
        };
        return ChartRouter;
    }(Backbone_1.Router));
    exports.ChartRouter = ChartRouter;
});
/// <amd-module name="SuiteCommerce.SizeChart.Chart.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.Chart.View", ["require", "exports", "Backbone", "suitecommerce_sizechart_chart.tpl"], function (require, exports, Backbone_1, chartTemplate) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ChartView = /** @class */ (function (_super) {
        __extends(ChartView, _super);
        function ChartView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = chartTemplate;
            _this.showSizeChartTitle = options.showSizeChartTitle;
            return _this;
        }
        ChartView.prototype.getContext = function () {
            return {
                chart: this.model.chart,
                description: this.model.description,
                showSizeChartTitle: this.showSizeChartTitle,
                title: this.model.title,
            };
        };
        return ChartView;
    }(Backbone_1.View));
    exports.ChartView = ChartView;
});
/// <amd-module name="SuiteCommerce.SizeChart.Common.Configuration"/>
define("SuiteCommerce.SizeChart.Common.Configuration", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Object.defineProperty(Configuration, "environment", {
            set: function (environmentComponent) {
                environment = environmentComponent;
            },
            enumerable: true,
            configurable: true
        });
        Configuration.get = function (key) {
            if (environment) {
                return environment.getConfig(key);
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        Object.defineProperty(Configuration, "sizeChartPageURL", {
            get: function () {
                return 'size-charts';
            },
            enumerable: true,
            configurable: true
        });
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
/// <amd-module name="SuiteCommerce.SizeChart.Common.DependencyProvider"/>
define("SuiteCommerce.SizeChart.Common.DependencyProvider", ["require", "exports", "underscore", "Utils"], function (require, exports, _, UtilsModule) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Utils = getDependency(UtilsModule);
    function getDependency(module) {
        if (isTranspiledModule(module)) {
            return module[Object.keys(module)[0]];
        }
        return module;
    }
    function isTranspiledModule(module) {
        var moduleKeys = Object.keys(module);
        return !_.isFunction(module) && moduleKeys.length === 1;
    }
});
/// <amd-module name="SuiteCommerce.SizeChart.Common.InstrumentationHelper"/>
define("SuiteCommerce.SizeChart.Common.InstrumentationHelper", ["require", "exports", "SuiteCommerce.SizeChart.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueueNameSuffix = '-SizeChart';
    var ExtensionVersion = '1.0.4';
    var ComponentArea = 'SC Size Chart';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (environment) {
            Instrumentation_1.default.initialize({
                environment: environment,
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                }
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
/// <amd-module name="SuiteCommerce.SizeChart.Common.Utils"/>
define("SuiteCommerce.SizeChart.Common.Utils", ["require", "exports", "SuiteCommerce.SizeChart.Common.DependencyProvider"], function (require, exports, DependencyProvider_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.getAbsoluteUrl = function (file, isServices2) {
            if (isServices2 === void 0) { isServices2 = false; }
            return DependencyProvider_1.Utils.getAbsoluteUrl(file, isServices2);
        };
        Utils.translate = function (text) {
            var continuationText = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                continuationText[_i - 1] = arguments[_i];
            }
            return DependencyProvider_1.Utils.translate(text, continuationText);
        };
        Utils.getURLComponent = function (fragment) {
            return fragment
                .replace(/[^a-zA-Z0-9_ -]/g, '')
                .replace(/^ +| +$/g, '')
                .replace(/ /g, '-')
                .toLowerCase();
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
/// <amd-module name="SuiteCommerce.SizeChart.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.SizeChart.Instrumentation.Log", ["require", "exports", "SuiteCommerce.SizeChart.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
/// <amd-module name="SuiteCommerce.SizeChart.Instrumentation.Logger"/>
define("SuiteCommerce.SizeChart.Instrumentation.Logger", ["require", "exports", "SuiteCommerce.SizeChart.Instrumentation.MockAppender"], function (require, exports, Instrumentation_MockAppender_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Logger = /** @class */ (function () {
        function Logger() {
        }
        Logger.getLogger = function () {
            this.instance = this.instance || this.buildLoggerInstance();
            return this.instance;
        };
        Logger.buildLoggerInstance = function () {
            var _a;
            try {
                // @ts-ignore
                var LoggersModule = require('Loggers').Loggers;
                // @ts-ignore
                var elasticAppender = require('Loggers.Appender.ElasticLogger')
                    .LoggersAppenderElasticLogger.getInstance();
                // Just for test purposes in local environments: the output of MockApppender is the browser console.
                var mockAppender = Instrumentation_MockAppender_1.MockAppender.getInstance();
                // @ts-ignore
                var configurationModule = require('Loggers.Configuration');
                var loggerName = "CommerceExtensions" + Logger.options.queueNameSuffix;
                LoggersModule.setConfiguration((_a = {},
                    _a[loggerName] = {
                        log: [
                            { profile: configurationModule.prod, appenders: [elasticAppender] },
                            { profile: configurationModule.dev, appenders: [mockAppender] }
                        ],
                        actions: {},
                        loggers: {},
                    },
                    _a));
                return LoggersModule.getLogger(loggerName);
            }
            catch (e) {
                return {
                    info: function (obj) { },
                    error: function (obj) { },
                };
            }
        };
        return Logger;
    }());
    exports.Logger = Logger;
});
/// <amd-module name="SuiteCommerce.SizeChart.Instrumentation.MockAppender"/>
define("SuiteCommerce.SizeChart.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.prototype.ready = function () {
            return true;
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        MockAppender.prototype.start = function (action, options) {
            return options;
        };
        MockAppender.prototype.end = function (startOptions, options) { };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
/// <amd-module name="SuiteCommerce.SizeChart.Instrumentation"/>
define("SuiteCommerce.SizeChart.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.SizeChart.Instrumentation.Logger", "SuiteCommerce.SizeChart.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
/// <amd-module name="SuiteCommerce.SizeChart.NotFoundPage.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.NotFoundPage.View", ["require", "exports", "Backbone", "suitecommerce_size_chart_not_found_page.tpl", "SuiteCommerce.SizeChart.Common.Utils"], function (require, exports, Backbone_1, NotFoundViewTemplate, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NotFoundView = /** @class */ (function (_super) {
        __extends(NotFoundView, _super);
        function NotFoundView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = NotFoundViewTemplate;
            _this.title = Utils_1.Utils.translate('Page not found');
            return _this;
        }
        NotFoundView.prototype.getContext = function () {
            return {
                pageHeader: this.title,
            };
        };
        return NotFoundView;
    }(Backbone_1.View));
    exports.NotFoundView = NotFoundView;
});
/// <amd-module name="SuiteCommerce.SizeChart.PDP.Configuration"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.PDP.Configuration", ["require", "exports", "SuiteCommerce.SizeChart.Common.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPConfiguration = /** @class */ (function (_super) {
        __extends(PDPConfiguration, _super);
        function PDPConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(PDPConfiguration, "hyperlinkText", {
            get: function () {
                return this.get('sizechart.hyperlinkText');
            },
            enumerable: true,
            configurable: true
        });
        return PDPConfiguration;
    }(Configuration_1.Configuration));
    exports.PDPConfiguration = PDPConfiguration;
});
/// <amd-module name="SuiteCommerce.SizeChart.PDP.Item.Model"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.PDP.Item.Model", ["require", "exports", "Backbone", "SuiteCommerce.SizeChart.Common.Utils"], function (require, exports, Backbone_1, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ItemFields;
    (function (ItemFields) {
        ItemFields["sizeChartId"] = "custitem_ns_sc_ext_sich_size_chart_id";
        ItemFields["sizeChartName"] = "custitem_ns_sc_ext_sich_size_chart";
    })(ItemFields = exports.ItemFields || (exports.ItemFields = {}));
    var PDPItemModel = /** @class */ (function (_super) {
        __extends(PDPItemModel, _super);
        function PDPItemModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(PDPItemModel.prototype, "sizeChartId", {
            get: function () {
                return this.get(ItemFields.sizeChartId);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPItemModel.prototype, "sizeChartName", {
            get: function () {
                return this.get(ItemFields.sizeChartName) || '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPItemModel.prototype, "sizeChartURLComponent", {
            get: function () {
                return Utils_1.Utils.getURLComponent(this.sizeChartName);
            },
            enumerable: true,
            configurable: true
        });
        PDPItemModel.prototype.hasSizeChart = function () {
            return !!(this.sizeChartId && this.sizeChartName);
        };
        return PDPItemModel;
    }(Backbone_1.Model));
    exports.PDPItemModel = PDPItemModel;
});
/// <amd-module name="SuiteCommerce.SizeChart.PDP.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.SizeChart.PDP.View", ["require", "exports", "Backbone", "SuiteCommerce.SizeChart.PDP.Item.Model", "suite_commerce_size_chart_pdp.tpl", "SuiteCommerce.SizeChart.PDP.Configuration", "SuiteCommerce.SizeChart.Instrumentation"], function (require, exports, Backbone_1, PDP_Item_Model_1, PDPTemplate, PDP_Configuration_1, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPView = /** @class */ (function (_super) {
        __extends(PDPView, _super);
        function PDPView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = PDPTemplate;
            _this.events = {
                'click [data-action="openSizeChart"]': 'openSizeChartAction'
            };
            _this.pdp = options.pdp;
            _this.router = options.router;
            _this.model = new PDP_Item_Model_1.PDPItemModel(_this.getItemInfo());
            _this.setupListeners();
            _this.logSizeChartUsage();
            return _this;
        }
        PDPView.prototype.setupListeners = function () {
            var _this = this;
            this.pdp.on('afterOptionSelection', function () {
                var lastSizeChartId = _this.model.sizeChartId;
                _this.model.set(_this.getItemInfo());
                if (lastSizeChartId !== _this.model.sizeChartId) {
                    _this.render();
                    _this.logSizeChartUsage();
                }
            });
        };
        PDPView.prototype.getItemInfo = function () {
            var selectedMatrixChild = this.pdp.getSelectedMatrixChilds() &&
                this.pdp.getSelectedMatrixChilds().length === 1
                ? this.pdp.getSelectedMatrixChilds()[0]
                : null;
            if (selectedMatrixChild && selectedMatrixChild[PDP_Item_Model_1.ItemFields.sizeChartId]) {
                return selectedMatrixChild;
            }
            return this.pdp.getItemInfo().item;
        };
        PDPView.prototype.logSizeChartUsage = function () {
            if (this.model.sizeChartId) {
                var sizeChartUsageLog = Instrumentation_1.default.getLog('sizeChartUsageLog');
                sizeChartUsageLog.setParameters({
                    activity: 'Size Chart Usage',
                    message: "Size Chart: Id: " + this.model.sizeChartId + " - Name: " + this.model.sizeChartName,
                });
                sizeChartUsageLog.submit();
            }
        };
        PDPView.prototype.openSizeChartAction = function (event) {
            event.preventDefault();
            if (!this.router.isSearchingSizeCharts) {
                this.router.showSizeChartView(this.model.sizeChartId, true);
            }
            this.logClickInSizeChartLink();
            return false;
        };
        PDPView.prototype.logClickInSizeChartLink = function () {
            var clickInSizeChartLinkLog = Instrumentation_1.default.getLog('clickInSizeChartLinkLog');
            clickInSizeChartLinkLog.setParameters({
                activity: 'Click in Size Char Link',
                message: "Size Chart: Id: " + this.model.sizeChartId + " - Name: " + this.model.sizeChartName,
            });
            clickInSizeChartLinkLog.submit();
        };
        PDPView.prototype.getContext = function () {
            return {
                sizeChartId: this.model.sizeChartId,
                sizeChartName: this.model.sizeChartName,
                hyperlinkText: PDP_Configuration_1.PDPConfiguration.hyperlinkText,
                sizeChartPageURL: PDP_Configuration_1.PDPConfiguration.sizeChartPageURL,
                isAssociatedToSizeChart: this.model.hasSizeChart(),
                sizeChartUrlComponent: this.model.sizeChartURLComponent,
            };
        };
        return PDPView;
    }(Backbone_1.View));
    exports.PDPView = PDPView;
});
/// <amd-module name="SuiteCommerce.SizeChart.PDP"/>
define("SuiteCommerce.SizeChart.PDP", ["require", "exports", "SuiteCommerce.SizeChart.PDP.View"], function (require, exports, PDP_View_1) {
    "use strict";
    return {
        mountToApp: function (options) {
            var pdp = options.container.getComponent('PDP');
            if (pdp) {
                this.addViews(pdp, options.router);
            }
        },
        addViews: function (pdp, router) {
            var childViewConstructor = {
                'Product.Options': {
                    'SizeChart.Link': {
                        childViewConstructor: function () {
                            return new PDP_View_1.PDPView({
                                pdp: pdp,
                                router: router,
                            });
                        },
                    },
                },
            };
            pdp.addChildViews(pdp.PDP_FULL_VIEW, childViewConstructor);
            pdp.addChildViews(pdp.PDP_QUICK_VIEW, childViewConstructor);
        },
    };
});
/// <amd-module name="SuiteCommerce.SizeChart.Shopping"/>
define("SuiteCommerce.SizeChart.Shopping", ["require", "exports", "SuiteCommerce.SizeChart.Common.Configuration", "SuiteCommerce.SizeChart.PDP", "SuiteCommerce.SizeChart.Chart.Router", "SuiteCommerce.SizeChart.Common.InstrumentationHelper"], function (require, exports, Configuration_1, PDP, Chart_Router_1, InstrumentationHelper_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var environment = container.getComponent('Environment');
            this.initializeConfiguration(environment);
            this.initializeInstrumentation(environment);
            var router = new Chart_Router_1.ChartRouter({
                application: container,
                routes: {},
            });
            PDP.mountToApp({
                router: router,
                container: container,
            });
        },
        initializeConfiguration: function (environment) {
            Configuration_1.Configuration.environment = environment;
        },
        initializeInstrumentation: function (environment) {
            InstrumentationHelper_1.InstrumentationHelper.initializeInstrumentation(environment);
        },
    };
});
};
extensions['CampusStores.StudentManagerExtension.1.2.1'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/StudentManagerExtension/1.2.1/' + asset;
};
define('Header.Menu.MyAccount.View.StudentManager',
	[
		'Header.Menu.MyAccount.View',
		'underscore',
		'header_menu_myaccount_studentmanager.tpl'
	],
	function HeaderMenuMyAccountViewStudentManager(
		HeaderMenuMyAccountView,
		_,
		headerMenuMyAccountStudentManagerTpl
	){
		'use strict';
		// this file is needed to get "My Curriculum" to show in MyAccount menu in mobile view
		
		_.extend(HeaderMenuMyAccountView.prototype, {
			template: headerMenuMyAccountStudentManagerTpl,
			getContext: _.wrap(HeaderMenuMyAccountView.prototype.getContext, function getContext(fn) {
				var originalContext = fn.apply(this, _.toArray(arguments).slice(1));
				var studentTerms = SC.ENVIRONMENT.StudentManager && SC.ENVIRONMENT.StudentManager.studentTerms || [];
				//console.log("Stu Mgr header view: studentTerms= ", studentTerms);
				_.extend(originalContext, {
					termInfo: studentTerms
				});
				return originalContext;
			})
		});
	}
);
define('StudentManager.Collection',
  [
  'Backbone',
  'StudentManager.Model',
  'underscore'
  ],
  function (Backbone, Model, _) {
    return Backbone.Collection.extend({
      model: Model,
      url: _.getAbsoluteUrl(getExtensionAssetsPath('services/StudentManager.Service.ss'))
    });
  }
);
define('StudentManager.Details.View',
  [
  'Backbone',
  'studentmanager_details.tpl'
  ],
  function (Backbone, studentmanager_details_template) {
    return Backbone.View.extend({
      getContext: function () {
        return {
          'customer': this.model.get('customer'),
          'customer_id': this.model.get('customer_id'),
          'school': this.model.get('school'),
          'term': this.model.get('term'),
          'term_id': this.model.get('term_id'),
          'catalog_no': this.model.get('catalog_no'),
          'class_nbr': this.model.get('class_nbr'),
          'section_no': this.model.get('section_no'),
          'course_id': this.model.get('course_id'),
          'course_name': this.model.get('course_name'),
          'course_internalid': this.model.get('course_internalid'),
          'course_full_name': this.model.get('course_full_name')
        };
      },
      template: studentmanager_details_template
    });
  }
);
define('StudentManager.List.View', [
'Backbone',
'studentmanager_list.tpl',
'Backbone.CollectionView',
'Backbone.CompositeView',
'StudentManager.Details.View',
'StudentManager.Model'
], function(Backbone, studentmanager_list_tpl, CollectionView, CompositeView, StudentManagerDetailsView, AdoptionSearchRouter,StudentManagerModel) {
   return Backbone.View.extend({
   		template: studentmanager_list_tpl,
   		initialize: function(options) {
   			CompositeView.add(this);
   			this.application = options.application;
			this.collection = options.collection;
			this.environment =  this.application.getComponent('Environment');
			this.adoptionItemsErrorMessage = '';
			this.noAdoptionItems = false; 
			//this.collection.on('reset', this.render, this);
   		},
   		childViews: {
   			'StudentManager.Collection': function() {
   				return new CollectionView({
   					'childView': StudentManagerDetailsView,
   					'collection': this.collection,
   					'viewsPerRow': 1
   				});
   			}
   		},
   		events: {
   			'click [data-action="adoptionresults"]': 'shopCcIds',
   			'click [data-action="printbooklist"]': 'printBookList'
   		},
   		shopCcIds: function (e) {
			var self = this;
   			var models = this.collection.models;
			var ccIds = [];
            // build a an array of ccIds that we'll use to pass to adoption search
            _.each(models, function makeCcIds(m) {
                if (m.attributes.course_internalid !== null) {
                    ccIds.push(m.attributes.course_internalid);
                }
            });
   			// example: ccIds = "54345,23432,2845";
   			var ccIds = ccIds.join();
			if (ccIds) {
				
				/*
					The system tries to programmatically determine the top-level domain by examining the "home" touchpoint.
					The adoption search results suffix ("/adoption-search-results?ccid=") is then appended to the top-level domain
					to help the customer shop for their course items.  As a backup mechanism in case the system has trouble
					determining the top-level domain, there is an override "adoption search host" field in Custom Prefernces
					that can be used instead. (Note: I'm not sure if this last sentence is true anymore).  I don't think
					Backbone navigation can be used instead, since I've only seen triggers work within the same SSP
				*/ 
  				
				/*
					Programmatically determine the adoption search URL by taking the "home" touchpoint, stripping off everything but the customer's top level domain, and appending the adoption search results directory.
	  				However, seems like the home touchpoint varies unpredictably.  Sometimes it has the customer's top-level domain in it, other times it looks like this:
	   				"/app/site/backend/bridgedomains.nl?btrgt=http%3A%2F%2Fcssca-r2-dev.production.na1.netsuitestaging.com&c=1766172&n=2"
   				*/
   				var touchpointHome = SC.ENVIRONMENT.siteSettings.touchpoints.home;
   				var homeDomain = touchpointHome.substr(touchpointHome.indexOf('http'), touchpointHome.indexOf('&'));
   				//console.log("StudentManager: homeDomain = " + homeDomain);
   				var homeDomainDecoded = decodeURIComponent(homeDomain);
   				//console.log("StudentManager: homeDomainDecoded = " + homeDomainDecoded);
   				var homeDomainStripped = homeDomainDecoded.substr(0, homeDomainDecoded.indexOf('&'));
				//console.log("StudentManager: Adoption Search Results prefix = " + homeDomainStripped);
				   
				if (homeDomainStripped == "") {
					homeDomainStripped = homeDomainDecoded.substr(0, homeDomainDecoded.indexOf('?'));
				}
				/*
					5/18/19 the new version of AdoptionSearch can't handle being passed ccIds only when
					displaying AdoptionSearchResults for given ccIds.  Now, an AdoptionSearchCollection must be used
					to fetch the ID of the first item in the first course ID.  Note this requires AdoptionSearch to be
					installed on the account and requires AdoptionSearch module to exist locally if debugging locally
				*/
				if (this.environment.getConfig('adoptionsearchEnabled') === true) {
					try {
						var AdoptionSearchCollection = require('AdoptionSearch.Collection');
						var collectionAdoptionSearch = new AdoptionSearchCollection();
						var adoptionSearchResultsUrl;
						collectionAdoptionSearch.fetch({
							data: {
								searchAdoptions: true,
								ccId: ccIds
							}
						}).done(function doneCollectionAdoptionSearch(adoptionList) {
							var item = {};
							_.each(adoptionList, function(adoption) {
								if (_.isEmpty(item) && !_.isEmpty(adoption.items)) {
									item = adoption.items[0];
								}
							});
			
							if (!_.isEmpty(item)) {
								adoptionSearchResultsUrl = homeDomainStripped + '/adoption-search-results?ccid=' + ccIds + '&itemid=' + item.itemId;
								console.log("Preparing to request this Adoption Search Results URL: " + adoptionSearchResultsUrl);
								window.location.href = adoptionSearchResultsUrl;
							} else {
								self.noAdoptionItems = true;
								self.adoptionItemsErrorMessage = self.environment.getConfig('adoptionsearchNoItemsInSelectedAdoptionsMessage');
								self.render();
							}
						}).fail(function failCollectionAdoptionSearch(error) {
							console.log('StudentManager: Adoption Search Collection fetch failed: ', error);
						});
					} catch (error) {
						console.log('Failed to require AdoptionSearchCollection in StudentManager.List.View: ', error);
					}
				}
   			} 
   		},
   		
   		printBookList: function (e)
   		{
   			// retrieve PDF via POST request to ERP Suitelet, passing student ID and term ID as parameters
   			var models = this.collection.models;
   			// we only need to look at 1 to get the term ID and student ID
			var model = JSON.stringify(models[0]);
			if (models.length > 0) // make this button do nothing - and not throw console error - if just showing empty template
			{   
				modelsParsed = JSON.parse(model);
				//console.log('StudentManager PDF: model = ' + model);
				var studentId = modelsParsed.customer_id;
				//console.log('StudentManager PDF: model.studentId = ' + studentId);
				var termId = modelsParsed.term_id;
				//console.log('StudentManager PDF: model.termId = ' + termId);
				// Uncomment this to do GET request to ERP suitelet for Print Booklist button.  Not ideal because it brings up form to choose term
				//window.open("/app/site/hosting/scriptlet.nl?script=463&deploy=1&compid=1766172&studentId=" + studentId, 'adjust', 'resizable=0,scrollbars=0,menubar=0,location=0,status=0,toolbar=0,width=600,height=850');
				
				// hardocded for r2 DEV
				//this.doPost("/app/site/hosting/scriptlet.nl?script=463&deploy=1", { custpage_student: studentId, custpage_term: termId } );
				// hardocded for r2 QA
				//this.doPost("/app/site/hosting/scriptlet.nl?script=466&deploy=1", { custpage_student: studentId, custpage_term: termId } );
				// there's a function in the back end model that automatically determines the URL of the Booklist PDF suitelet.  I've boostrapped the execution of that function to the environment variable
				var suiteletURL = SC.ENVIRONMENT.StudentManager.pdfUrl;
				console.log("StudentManager PDF: preparing to request PDF via this suiteletURL path: " + suiteletURL);
				this.doPost(suiteletURL, { custpage_student: studentId, custpage_term: termId } );
			}
   		},
		doPost: function(path, params, method) {
		    method = method || "post"; // Set method to post by default if not specified.
    		    // comments were an attempt to get this to open in a new window instead of current window
    		    // wasn't able to write to the document of the new window correctly for some reason
    		
    		    //var new_window = window.open();
		    //var form = new_window.document.createElement("form");
		    var form = document.createElement("form");
		    form.setAttribute("method", method);
		    form.setAttribute("action", path);
		    for(var key in params) {
		        if(params.hasOwnProperty(key)) {
		            //var hiddenField = new_window.document.createElement("input");
		            var hiddenField = document.createElement("input");
		            hiddenField.setAttribute("type", "hidden");
		            hiddenField.setAttribute("name", key);
		            hiddenField.setAttribute("value", params[key]);
		            form.appendChild(hiddenField);
		        }
		    }
		    //new_window.document.body.appendChild(form);
		    document.body.appendChild(form);
		    form.submit();
		},
		
		getSelectedMenu: function(options) {
			var termId = this.collection.models && this.collection.models[0] && this.collection.models[0].attributes.term_id || '';
			return "term" + termId;
        },
		getContext: function getContext() {
			return {
				noAdoptionItems: this.noAdoptionItems,
				adoptionItemsErrorMessage: this.adoptionItemsErrorMessage
			};
		}
   });
});
define('StudentManager.Model',
  [
  'Backbone',
  'underscore',
  'Utils'
  ],
  function (Backbone, _, utils) {
    return Backbone.Model.extend({
      urlRoot: _.getAbsoluteUrl(getExtensionAssetsPath('services/StudentManager.Service.ss'))
    });
  }
);
define('StudentManager.Router', [
  'Backbone',
  'StudentManager.List.View',
  'StudentManager.Model',
  'StudentManager.Collection'
  ], function(Backbone, ListView, Model, Collection) {
  return Backbone.Router.extend({
    
  	initialize: function(application) {
  		this.application = application;
  	},
    routes: {
      'StudentManager/:termId': 'StudentManagerDetails'
    },
    StudentManagerDetails: function(termId) {
      //console.log('Executing StudentManagerDetails(id) route function');
      //console.log('termId = ' + termId);
      var collection = new Collection();
      var view = new ListView({application: this.application, collection: collection});
      collection.fetch({ data: { termId: termId } }).done(function() {
        view.showContent();
      });
    }
  });
});
define(
	'CampusStores.StudentManagerExtension.StudentManager.MyAccount'
,   [
	'StudentManager.Router',
	'StudentManager.Model',
	'StudentManager.Collection',
	'Header.Menu.MyAccount.View.StudentManager'
]
,   function (
	StudentManagerRouter,
	StudentManagerModel,
	StudentManagerCollection,
	HeaderMenuMyAccountViewStudentManager
)
{
	'use strict';
	/*
		This file uses the MyAccountMenu SCA component to add the top level "My Curriculum" link to the left navigation menu
		with a clickable child subitem for each valid academic term the student is registered for.  First "My Curriculum"
		parent is created, then children are pushed to the object, then the whole object is pushed to the MyAccount menu.
		I wasn't able to push My Curriculum first, then add children using the MyAccountMenu component.
		
		A valid term means today is between the term start and end date, term show on web option is enabled, and
		student has not dropped the course.  Clicking a term loads the valid registered courses on the right,
		with buttons to show course materials and print a PDF of course materials.
	*/
	// only write My Curriculum if you're in My Account, because otherwise the myaccount header gets called
	// from the main top header and will show there but no terms will be there.  Plus the FRD for Student
	// Manager indicates My Curriculum should be accessed from My Account.
	
	//if (window.location.href.indexOf("my_account") > 0)
	//{
		return {
			mountToApp: function mountToApp(application) {
				var collection = new StudentManagerCollection();
				collection.fetch({ data: { bootstrapTermsAndPdfurl: true } }).done(function(result) {
				
					//console.log("Stu Mgr: fetch bootstrapVars: ", result);
					SC.ENVIRONMENT.StudentManager = {
						studentTerms: result.studentTerms,
						pdfUrl: result.pdfUrl
					};		
					// only add MyCurriculum to MyAccount menu if student has valid registered terms, otherwise don't show My Curriculum at all
					if (result.studentTerms && result.studentTerms.length) {
						var MyAccountMenu = application.getComponent("MyAccountMenu");
						MyAccountMenu.addGroup({
							id: "StudentManagerList",
							name: "My Curriculum",
							index: 1
						});
						// Add each term entry in MyCurriculum Menu Group
						_.each(result.studentTerms, function addMyCurriculumMenuGroupEntry(term) {
							MyAccountMenu.addGroupEntry({
								groupid: 'StudentManagerList',
								id: "term" + term.term_id,
								name: term.term_name,
								url: "StudentManager/" + term.term_id
							});
						});
					}
					// for diagnostic purposes, if no valid registered terms, log to console that Student Manager will be hidden for this reason
					else {
						console.log("No valid registered academic terms found for customer, so hiding Student Manager");
					}
				})
				.fail(function studentManagerServiceFailure() {
					// the service file couldn't run to retrieve academic term information necessary to add the My Curriculum navigation menu
					console.error("Student Manager was unable to initialize.  Verify its service file permissions.");
				});
				return new StudentManagerRouter(application);
			}
		};
	//}
});
};
extensions['CampusStores.TermsAndConditionsExtension.1.2.1'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/TermsAndConditionsExtension/1.2.1/' + asset;
};
define('Cart.AddToCart.Button.View.TermsAndConditions', [
    'Cart.AddToCart.Button.View',
    'underscore'
], function CartAddToCartButtonViewRentals(
    CartAddToCartButtonView,
    _
) {
    'use strict';
    _.extend(CartAddToCartButtonView.prototype, {
        getTermsAddToCartValidators: function getTermsAddToCartValidators(termsAndConditionsView) {
            var self = this;
            return {
                custcol_nsts_csic_docs_accepted: {
                    fn: function validateDocumentsAccepted() {
                        if (termsAndConditionsView.getRequiredDocuments().length && self.model.get('custcol_nsts_csic_docs_accepted') !== 'T') {
                            return _.translate('Please accept the Terms and Conditions');
                        }
                    }
                }
            };
        },
        addToCart: _.wrap(CartAddToCartButtonView.prototype.addToCart, function addToCart(fn) {
            var productOptionsView = this.parentView && this.parentView.getChildViewInstance('Product.Options');
            var termsAndConditionsView = productOptionsView && productOptionsView.getChildViewInstance('Options.Collection', 'TermsAndConditions.View');
            if (termsAndConditionsView) {
                if (!this.model.areAttributesValid(['custcol_nsts_csic_docs_accepted'], this.getTermsAddToCartValidators(termsAndConditionsView))) {
                    return false;
                }
            }
            return fn.apply(this, _.toArray(arguments).slice(1));;
        })
    });
});
define('TermsAndConditions.Modal.View', [
    'Backbone',
    'underscore',
    'terms_and_conditions_modal_view.tpl'
], function TermsAndConditionsModalView(
    Backbone,
    _,
    termsAndConditionsModalViewTpl
) {
    'use strict';
    return Backbone.View.extend({
        template: termsAndConditionsModalViewTpl,
        title: _('Terms And Conditions').translate(),
        modalClass: 'terms-and-conditions-modal',
        initialize: function initialize(options) {            
            // this.pdp = options.pdp;
            // this.container = options.container;
            // this.parentView = options.parentView;
            // this.isQuickView = this.pdp._getViewIdentifier(this.parentView) === this.pdp.PDP_QUICK_VIEW;
            this.requiredDocuments = options.requiredDocuments;
            // TODO: Show PDP quick view modal after closing required documents modal.
            // May be show new bootstrap modal and have PDP quick view model opended in background?
            // if (this.isQuickView) {
                // this.container.getLayout().once('afterAppendView', function previousModal() {
                //     var termsModal = jQuery('.terms-and-conditions-modal');
                //     var url = self.parentView.model.generateURL();
                //     // var itemOptions = this.options.item && this.options.item.itemOptions;
                //     // var mappedOptions = [];
                //     // if (itemOptions) {
                //     //     mappedOptions = _.map(_(itemOptions).keys(), function mapItemOptions(option) {
                //     //         return option + '=' + itemOptions[option].internalid;
                //     //     });
                //     //     url += '?' + mappedOptions.join('&');
                //     // }
                //     termsModal.find('.global-views-modal-content-header-close').hide();
                //     termsModal.find('.global-views-modal-content-header-close').after('<a href="' + url + '"  data-toggle="show-in-modal" class="tac-header-close">&times;</a>');
                // });
            // }
        },
        getContext: function getContext() {
            return {
                requiredDocuments: this.requiredDocuments
            };
        }
    });
});
// @module CampusStores.TermsAndConditionsExtension.TermsAndConditions
define('TermsAndConditions.View', [
    'TermsAndConditions.Modal.View',
    'terms_and_conditions_view.tpl',
    'Utils',
    'Backbone',
    'jQuery',
    'underscore'
], function(
    TermsAndConditionsModalView,
    termsAndConditionsViewTpl,
    Utils,
    Backbone,
    jQuery,
    _
) {
    'use strict';
    // @class CampusStores.TermsAndConditionsExtension.TermsAndConditions.View @extends Backbone.View
    return Backbone.View.extend({
        template: termsAndConditionsViewTpl,
        termsOptionId: 'custcol_nsts_csic_docs_accepted',
        events: {
            'click [data-toggle="set-option"]': 'setOption',
            'click .read-terms-and-conditions': 'showRequiredDocuments'
        },
        initialize: function(options) {
            this.container = options.container;
            this.pdp = options.pdp;
            this.layout = options.layout;
            this.requiredDocs = [];
            this.currentView = this.container.getLayout().getCurrentView();
        },
        setOption: function setOption(e) {
            var self = this;
            var $target = jQuery(e.currentTarget) && jQuery(e.currentTarget)[0];
            var value;
            
            if ($target.id === self.termsOptionId) {
                value = $target.checked === true ? 'T' : 'F';
                jQuery($target).val(value);
                self.pdp.cancelableDisable('afterOptionSelection');
                self.pdp.setOption(self.termsOptionId, value);
                self.pdp.cancelableEnable('afterOptionSelection'); 
            }
        },
        getRequiredDocuments: function getRequiredDocuments() {
            var requiredDocs = [];
            var item = this.pdp.getItemInfo().item;
            var selectedMatrixChilds = this.pdp.getSelectedMatrixChilds();
            var document;
            var allScaDocuments = SC.ENVIRONMENT.published.scaDocuments && SC.ENVIRONMENT.published.scaDocuments.length ? Utils.deepCopy(SC.ENVIRONMENT.published.scaDocuments) : [];
        
            if (selectedMatrixChilds.length === 0) {
                // Get required documents from item itself if non-matrix regular item without options
                requiredDocs = item.custitem_nsts_csic_reqd_docs !== '&nbsp;' ? item.custitem_nsts_csic_reqd_docs.split(', ') : [];
            } else if (selectedMatrixChilds.length === 1) {// If item option selection is complete
                requiredDocs = selectedMatrixChilds[0].custitem_nsts_csic_reqd_docs !== '&nbsp;' ? selectedMatrixChilds[0].custitem_nsts_csic_reqd_docs.split(', ') : [];
            }
            requiredDocs = _.map(requiredDocs, function requiredDocuments(documentName) {
                document = _.findWhere(allScaDocuments, {'documentName': documentName});
                if (document) {
                    if (document.documentText) {
                        document.documentText =  document.documentText.replace(/&lt;item&gt;/gi, item.displayname || item.itemid);
                    }
                    return document;
                }
            });
            return requiredDocs;
        },
        showRequiredDocuments: function showRequiredDocuments(e) {
            var termsAndConditionsModalView = new TermsAndConditionsModalView({
                requiredDocuments: this.getRequiredDocuments(),
                pdp: this.pdp,
                parentView: this.currentView,
                container: this.container,
                layout: this.layout
            });
            e.preventDefault();
            this.container.getLayout().showInModal(termsAndConditionsModalView);
        },
        //@method getContext @return CampusStores.TermsAndConditionsExtension.TermsAndConditions.View.Context
        getContext: function getContext() {
            var self =  this;
            self.requiredDocs = self.getRequiredDocuments();
            // Get current custcol_nsts_csic_docs_accepted selected option value
            var itemInfo = self.pdp.getItemInfo();
            var termsOption = _.findWhere(itemInfo.options, {'cartOptionId': self.termsOptionId});
            var termsOptionValue = termsOption && termsOption.value ? termsOption.value.internalid : null;
            return {
                showTermsAndConditions: self.requiredDocs.length,
                termsAccepted: termsOptionValue === 'T',
                label: termsOption && termsOption.label,
                cartOptionId: self.termsOptionId
            };
        }
    });
});
define('Transaction.Line.Model.TermsAndConditions', [
    'Transaction.Line.Model',
    'underscore'
], function TransactionLineModelRentals(
    TransactionLineModel,
    _
) {
    'use strict';
    _.extend(TransactionLineModel.prototype, {
        getVisibleOptions: _.wrap(TransactionLineModel.prototype.getVisibleOptions, function getVisibleOptions(fn) {
            var visibleOptions = fn.apply(this, _.toArray(arguments).slice(1));
            var application = SC.ENVIRONMENT.SCTouchpoint;
            // Only show custcol_nsts_csic_docs_accepted transaction line field value in Checkout application.
            if (application === 'myaccount' || application === 'shopping') {
                visibleOptions = _.reject(visibleOptions, function(option) {
                    return option.get('cartOptionId') === 'custcol_nsts_csic_docs_accepted';
                });
            }
            return _.sortBy(visibleOptions, function sortBy(option) {
                return option.get('index');
            });
        })
    });
});
define('CampusStores.TermsAndConditions.Shopping', [
    'TermsAndConditions.View',
    'Cart.AddToCart.Button.View.TermsAndConditions',
    'Transaction.Line.Model.TermsAndConditions'
], function(
    TermsAndConditionsView
) {
    'use strict';
    return {
        mountToApp: function mountToApp(container) {
            var self = this;
            var pdp = container.getComponent('PDP');
            var layout = container.getComponent('Layout');
            var environment = container.getComponent('Environment');
            if (environment.getConfig('termsandconditionEnabled') === true) {
                try {
                    // NOTE: All item options are child views of Options.Collection in original PDP view.
                    // Make sure terms and conditions checkbox is also child view of Options.Collection to get it working with PDP mobile view.
                    var termsAndConditionChildView = this.getTermsChildView({
                        container: container,
                        pdp: pdp,
                        layout: layout
                    });
        
                    pdp.addChildViews(pdp.PDP_FULL_VIEW, termsAndConditionChildView);
                    pdp.addChildViews(pdp.PDP_QUICK_VIEW, termsAndConditionChildView);
                    this.registerAfterOptionSelection(pdp);
                } catch (error) {
                    console.log('Failed adding Terms and Conditions as a child view of PDP_FULL_VIEW and PDP_QUICK_VIEW: ', error);
                }
                container.on('afterStart', function afterStartApplication(application) {
                    if (environment.getConfig('adoptionsearchEnabled') === true) {
                        try {
                            var pdp = application.getComponent('PDP');
                            var layout = application.getComponent('Layout');
                            var termsAdoptionChildView = self.getTermsChildView({
                                container: application,
                                pdp: pdp,
                                layout: layout
                            });
                            pdp.addChildViews(pdp.PDP_ADOPTION_SEARCH_VIEW, termsAdoptionChildView);
                            self.registerAfterOptionSelection(pdp);
                        } catch (error) {
                            console.log('Failed adding Terms and Conditions as a child view of PDP_ADOPTION_SEARCH_VIEW: ', error);
                        }
                    }
                });
            }
        },
        getTermsChildView: function getTermsChildView(options) {
            var self = this;
            var termsChildView = {
                'Options.Collection': {
                    'TermsAndConditions.View': {
                        childViewIndex: 12,
                        childViewConstructor: function childViewConstructor() {
                            var termsAndConditionsView = new TermsAndConditionsView({
                                container: options.container,
                                pdp: options.pdp,
                                layout: options.layout
                            });
                            self.termsAndConditionsView = termsAndConditionsView;
                            return termsAndConditionsView;
                        }
                    }
                }
            }
            return termsChildView;
        },
        registerAfterOptionSelection: function registerAfterOptionSelection(pdp) {
            var self = this;
            pdp.on('afterOptionSelection', function afterOptionSelection(option) {
                self.termsAndConditionsView.render();
            });
        }
    };
});
};
extensions['CampusStores.VerbaCompareExtension.1.2.1'] = function(){
function getExtensionAssetsPath(asset){
return 'extensions/CampusStores/VerbaCompareExtension/1.2.1/' + asset;
};
define('VerbaCompare.Collection', [
    'Backbone',
    'VerbaCompare.Model',
    'Utils',
    'jQuery',
    'underscore'
], function (
    Backbone,
    VerbaCompareModel,
    Utils,
    $,
    _) {
    return Backbone.Collection.extend({
        model: VerbaCompareModel,
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/VerbaCompare.Service.ss')),
        getPrices: function (options) {
            var self = this;
            var deferred = $.Deferred();
            $.ajax({
                url: self.url,
                data: {
                    isbn: options && options.isbn,
                    timestamp: options && options.timestamp
                },
                async: false,
                dataType: 'xml'
            }).done(function (response) {
                // Clear models, parse xml data
                self.reset();
                self.parseVerbaCompareResponse(response);
                deferred.resolve(); // pass in anything you want in promise
            });
            return deferred.promise();         
        },
        // Convert the xml to Backbone Models
        parseVerbaCompareResponse: function (xmlResponse) {
            var self = this;
            $(xmlResponse).find('Offer').each(function () {
                var isbn = $(this).find('Isbn').text();
                var merchant = $(this).find('Merchant').text();
                var price = $(this).find('Price').text();
                var shipping = $(this).find('Shipping').text();
                var currency = $(this).find('Currency').text();
                var condition = $(this).find('Condition').text();
                var sellerRating = $(this).find('SellerRating').text();
                var sellerFeedbackCount = $(this).find('SellerFeedbackCount').text();
                var description = $(this).find('Description').text();
                var link = $(this).find('Link').text();
                var offer = new VerbaCompareModel({
                    isbn: isbn,
                    merchant: merchant,
                    price: Utils.formatCurrency(price),
                    shipping: shipping,
                    currency: currency,
                    condition: condition,
                    sellerRating: sellerRating,
                    sellerFeedbackCount: sellerFeedbackCount,
                    link: link,
                    description: description
                });
                self.push(offer);
            });
        }
    });
});
define('VerbaCompare.Model', [
    'Backbone',
    'underscore'
], function (Backbone, _) {
    return Backbone.Model.extend({
        url: _.getAbsoluteUrl(getExtensionAssetsPath('services/VerbaCompare.Service.ss'))
    });
});
define('VerbaCompare.Router', [
    'Backbone'
], function (
    Backbone
) {
    return Backbone.Router.extend({
        initialize: function (container) {
            this.container = container;
        }
    });
});
// @module CampusStores.VerbaCompareExtension.VerbaCompare
define('VerbaCompare.View',
	[
        'VerbaCompare.Collection',
		'campusstores_verbacompareextension_verbacompare.tpl',
		'Utils',
		'Backbone',
		'jQuery',
		'underscore'
	]
,	function (
        VerbaCompareCollection,
		verbaCompareListTemplate,
		Utils,
		Backbone,
		jQuery,
		_
	)
{
	'use strict';
	// @class CampusStores.VerbaCompareExtension.VerbaCompare.View @extends Backbone.View
	return Backbone.View.extend({
		template: verbaCompareListTemplate,
		events: {
			'click [data-action="show-more"]': 'showMore',
            'click [data-action="sort-by-all"]': 'sortByField',
            'click [data-action="sort-by-new"]': 'sortByField',
            'click [data-action="sort-by-used"]': 'sortByField',
            'click [data-action="sort-by-rental"]': 'sortByField',
            'click [data-action="sort-by-digital"]': 'sortByField',
            'click [data-toggle="set-option"]': 'setOption'
		},
		initialize: function initialize(options) {
            var self = this;
            // self.environment = options.environment;
            self.pdp = options.pdp;
            self.collection = [];
            self.pdp.getSelectedAdoptionItemInfo()
            .done(function doneGetSelectedAdoptionItemInfo(selectedAdoption) {
                self.collection =  new VerbaCompareCollection();
                var isbn = selectedAdoption.isbn;
                var timestamp = (Date.now() / 1000);
                self.collection.getPrices({isbn: isbn, timestamp: timestamp});
                self.collection.on('reset', self.render, self);
            })
            .fail(function failGetSelectedAdoptionItemInfo(error) {
                console.log('Failed getSelectedAdoptionItemInfo: ', error);
            });
		},
		render: function render() {
            this.$el.empty();
            //TODO: m.get('s') is coming as undefined, look into refactoring below code
            this.collection.each(function(m) {
                this.$el.append('<p>' + m.get('s') + '</p>');
            }, this);
            Backbone.View.prototype.render.apply(this);
            this.$('.verba-compare-offer').slice(0, 4).css('display', 'table-row');
		},
		sortByField: function(e) {
            this.sort_key = jQuery(e)[0].target.id;
            this.render();
        },
        	
		setOption: function (e) {
            var id = '#' + jQuery(e)[0].target.id;
            e.preventDefault();
            this.$el.find('.verba-compare-filter-button.active').removeClass('active');
            this.$el.find(id).addClass("active");
		},
		
		showMore: function (e) {
            var scrollHeight = this.$el.find('.verba-compare-offer:hidden').slice(0, 4).height() + 'px';
            e.preventDefault();
            this.$el.find('.verba-compare-offer:hidden').slice(0, 4).slideDown();
            if (this.$el.find('.verba-compare-offer:hidden').length === 0) {
                this.$el.find('#showMoreBtn').fadeOut('slow');
            }
            this.$el.find('html,body').animate({
                scrollTop: this.$el.find('#showMoreBtn').offset().top
            }, scrollHeight);
        },
		//@method getContext @return CampusStores.VerbaCompareExtension.VerbaCompare.View.Context
		getContext: function getContext()
		{
			var self = this;
            var offers = [];
            var noOffersMessage = "NO OFFERS FOUND! TRY VIEWING ALL OPTIONS.";
            if (!(self.collection.length == 1 && _.isUndefined(self.collection.models[0].get("merchant")))) {
                offers = self.collection.map(function (offer) {
                    return {
                        isbn: offer.get('isbn'),
                        merchant: offer.get('merchant'),
                        price: offer.get('price'),
                        shipping: offer.get('shipping'),
                        currency: offer.get('currency'),
                        condition: offer.get('condition'),
                        sellerRating: offer.get('sellerRating'),
                        sellerFeedbackCount: offer.get('sellerFeedbackCount'),
                        link: offer.get('link'),
                        description: offer.get('description')
                    }
                });
            }
            switch (self.sort_key) {
                case 'all':
                    if (offers.length < 1) {
                        noOffersMessage = 'NO OFFERS FOUND!';
                    }
                    break;
                case 'new':
                    offers = _.filter(offers, function(book) {
                        return book.condition === 'New';
                    });
                    break;
                case 'used':
                    offers = _.filter(offers, function(book) {
                        return book.condition !== 'New' && book.condition !== 'Rental' && book.condition !== 'Digital' && book.condition !== 'E Book';
                    });
                    break;
                case 'rental':
                    offers = _.filter(offers, function(book) {
                        return book.condition === 'Rental';
                    });
                    break;
                case 'digital':
                    offers = _.filter(offers, function(book) {
                        return book.condition === 'Digital' || book.condition === 'E Book';
                    });
                    break;
                default:
                    if (offers.length < 1) {
                        noOffersMessage = 'NO OFFERS FOUND!';
                    }
			}
			
			return {
                offers: offers,
                hasOffer: offers.length > 0,
                needsMoreButton: offers.length > 4,
                noOffersMessage: noOffersMessage
            };
		}
	});
});
define(
	'CampusStores.VerbaCompareExtension.VerbaCompare'
,   [
		'VerbaCompare.Router',
		'VerbaCompare.View'
	]
,   function (
		VerbaCompareRouter,
		VerbaCompareView
	)
{
	'use strict';
	return  {
		mountToApp: function mountToApp (container){	
			container.on('afterStart', function afterStartApplication(application) {
				var pdp = application.getComponent('PDP');
				var environment = application.getComponent('Environment');
				
				if (environment.getConfig('adoptionsearchEnabled') === true && environment.getConfig('verbacompareEnabled') === true) {
					try {
						var verbaChildView = {
							'VerbaCompare.Placeholder.View': {
								'VerbaCompare.View': {
									childViewIndex: 10,
									childViewConstructor: function childViewConstructor() {
										return new VerbaCompareView({
											container: application,
											environment: environment,
											pdp: pdp
										});
									}
								}
							}
						}
						pdp.addChildViews(pdp.PDP_ADOPTION_SEARCH_VIEW, verbaChildView);
	
					} catch (error) {
						/**
						 * NOTE: It's possible for the CDN cache to keep the verbacompareEnabled environment variable set to true for a certain amount of time
						 * after the Verba Compare Extension has been deactivated. This try/catch is added to catch the error where verbacompareEnabled is still
						 * true according to the CDN cache, but Verba Compare Extension is deactivated.
						 */
						console.log('Failed adding VerbaCompareView as a child view of PDP_ADOPTION_SEARCH_VIEW: ', error);
					}
				}
			});
			
			return new VerbaCompareRouter(container);
		}
	};
});
};
try{
	extensions['CampusStores.AdoptionSearchExtension.1.2.6']();
	SC.addExtensionModule('CampusStores.AdoptionSearch.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.BuybackExtension.1.2.0']();
	SC.addExtensionModule('CampusStores.BuybackExtension.Buyback');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['NetSuite.Columns.1.1.0']();
	SC.addExtensionModule('SuiteCommerce.Columns.EntryPoint');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CXExtensibility.CoreContent.1.0.5']();
	SC.addExtensionModule('CXExtensibility.CoreContent.CoreContentModule');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.CustomFields.1.1.4']();
	SC.addExtensionModule('SuiteCommerce.CustomFields.PDP.Main');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.DepartmentChargeExtension.1.2.5']();
	SC.addExtensionModule('CampusStores.DepartmentCharge.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.GiftCertificateValueCheck.1.2.5']();
	SC.addExtensionModule('SuiteCommerce.GiftCertificate.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.InfiniteScrollExtension.1.1.4']();
	SC.addExtensionModule('SuiteCommerce.InfiniteScroll.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.InventoryLookupExtension.1.2.4']();
	SC.addExtensionModule('CampusStores.InventoryLookup.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.ItemBadges.1.1.4']();
	SC.addExtensionModule('SuiteCommerce.ItemBadges.EntryPoint');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['NetSuite.LogoList.1.1.0']();
	SC.addExtensionModule('NetSuite.LogoList.LogoListModule');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SC.ManorThemeExtension.3.4.0']();
	SC.addExtensionModule('SC.ManorThemeExtension.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.NewsletterSignUp.1.1.2']();
	SC.addExtensionModule('SuiteCommerce.Newsletter.Main.Module');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.OrderStatus.1.0.3']();
	SC.addExtensionModule('SuiteCommerce.OrderStatus.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['NSeComm.Punchout2Go.1.0.2']();
	SC.addExtensionModule('NSeComm.Punchout2Go.Main');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.RentalsExtension.1.2.3']();
	SC.addExtensionModule('CampusStores.Rentals.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.SchoolAffiliationExtension.1.2.4']();
	SC.addExtensionModule('CampusStores.SchoolAffiliationExtension.SchoolAffiliation.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['SuiteCommerce.SizeChart.1.0.4']();
	SC.addExtensionModule('SuiteCommerce.SizeChart.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.StudentManagerExtension.1.2.1']();
	SC.addExtensionModule('CampusStores.StudentManagerExtension.StudentManager.MyAccount');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.TermsAndConditionsExtension.1.2.1']();
	SC.addExtensionModule('CampusStores.TermsAndConditions.Shopping');
}
catch(error)
{
	console.error(error)
}
try{
	extensions['CampusStores.VerbaCompareExtension.1.2.1']();
	SC.addExtensionModule('CampusStores.VerbaCompareExtension.VerbaCompare');
}
catch(error)
{
	console.error(error)
}
SC.ENVIRONMENT.EXTENSIONS_JS_MODULE_NAMES = ["AdoptionSearch.Collection","AdoptionSearch.Edit.View","AdoptionSearch.Model","AdoptionSearch.Product.Model","AdoptionSearch.ProductDetails.Base.View","AdoptionSearch.ProductDetails.Component","AdoptionSearch.ProductDetails.View","CampusStores.AdoptionSearch.Shopping","RecentlyViewedItems.AdoptionSearch","Buyback.AddedISBNs.View","Buyback.Collection","Buyback.Detail.View","Buyback.List.View","Buyback.Model","Buyback.Router","Buyback.View","CampusStores.BuybackExtension.Buyback","SuiteCommerce.Columns.Column.Collection","SuiteCommerce.Columns.Column.Model","SuiteCommerce.Columns.Column.View","SuiteCommerce.Columns.ColumnsCCT.Model","SuiteCommerce.Columns.ColumnsCCT.View","SuiteCommerce.Columns.ColumnsCCT","SuiteCommerce.Columns.ColumnsCCT.Configuration","SuiteCommerce.Columns.Common.InstrumentationHelper","SuiteCommerce.Columns.Instrumentation.FallbackLogger","SuiteCommerce.Columns.Instrumentation.Log","SuiteCommerce.Columns.Instrumentation.Logger","SuiteCommerce.Columns.Instrumentation.MockAppender","SuiteCommerce.Columns.Instrumentation","SuiteCommerce.Columns.EntryPoint","CXExtensibility.CoreContent.CMSMerchzoneCCT.View","CXExtensibility.CoreContent.CMSMerchzoneCCT","CXExtensibility.CoreContent.CoreContentModule","SuiteCommerce.CustomFields.Instrumentation.Helper","SuiteCommerce.CustomFields.JavaScript.Utils","SuiteCommerce.CustomFields.Instrumentation.Log","SuiteCommerce.CustomFields.Instrumentation.Logger","SuiteCommerce.CustomFields.Instrumentation.MockAppender","SuiteCommerce.CustomFields.Instrumentation","SuiteCommerce.CustomFields.PDP.Main","SuiteCommerce.CustomFields.Utils","SuiteCommerce.CustomFields.PDP.Configuration","SuiteCommerce.CustomFields.PDP.Main.View","SuiteCommerce.CustomFields.PDP.Model","SuiteCommerce.CustomFields.PDP","CampusStores.DepartmentCharge.Shopping","Cart.Summary.View.DepartmentCharge","DepartmentCharge.Helper","DepartmentCharge.MiniCart.Child.View","DepartmentCharge.Model","Product.Model.DepartmentCharge","Rentals.View.DepartmentCharge","Transaction.Line.Model.DepartmentCharge","SuiteCommerce.GiftCertificate.Utils.Configuration","SuiteCommerce.GiftCertificate.Currency.Model","SuiteCommerce.GiftCertificate.Customer.Model","SuiteCommerce.GiftCertificate.Common.DependencyProvider","SuiteCommerce.GiftCertificate.Common.FeedbackMessageManager","SuiteCommerce.GiftCertificates.Collection","SuiteCommerce.GiftCertificate.Model","SuiteCommerce.GiftCertificate.Common.InstrumentationHelper","SuiteCommerce.GiftCertificate.Common.Utils","SuiteCommerce.GiftCertificate.GiftCertificateMessage.Model","SuiteCommerce.GiftCertificate.GiftCertificateMessage.View","SuiteCommerce.GiftCertificate.GiftCertificatesList.Button.View","SuiteCommerce.GiftCertificate.Group.Collection","SuiteCommerce.GiftCertificate.Group.Model","SuiteCommerce.GiftCertificate.Instrumentation.Log","SuiteCommerce.GiftCertificate.Instrumentation.Logger","SuiteCommerce.GiftCertificate.Instrumentation.MockAppender","SuiteCommerce.GiftCertificate.Instrumentation","SuiteCommerce.GiftCertificate.Item.Model","SuiteCommerce.GiftCertificate.LandingPage.Configuration","SuiteCommerce.GiftCertificate.LandingPage.Router","SuiteCommerce.GiftCertificate.LandingPage.View","SuiteCommerce.GiftCertificate.Main.Configuration","SuiteCommerce.GiftCertificate.Shopping","SuiteCommerce.GiftCertificate.Utils","SuiteCommerce.GiftCertificate.OptionTiles.Configuration","SuiteCommerce.GiftCertificate.OptionTiles.Tile.Collection","SuiteCommerce.GiftCertificate.OptionTiles.Tile.CollectionView","SuiteCommerce.GiftCertificate.OptionTiles.Tile.Model","SuiteCommerce.GiftCertificate.OptionTiles.Tile.View","SuiteCommerce.GiftCertificate.OptionTiles.TilesContainer.View","SuiteCommerce.GiftCertificate.OptionTiles","SuiteCommerce.GiftCertificate.PDP","SuiteCommerce.GiftCertificate.PLP.Group.View","SuiteCommerce.GiftCertificate.PLP","SuiteCommerce.GiftCertificate.ValueCheck.Configuration","SuiteCommerce.GiftCertificate.ValueCheck.Form.View","SuiteCommerce.GiftCertificate.ValueCheck.Model","SuiteCommerce.GiftCertificate.ValueCheck.Result.View","SuiteCommerce.GiftCertificate.ValueCheck.View","SuiteCommerce.InfiniteScroll.Configuration","SuiteCommerce.InfiniteScroll.Common.InstrumentationHelper","SuiteCommerce.InfiniteScroll.BottomControlView","SuiteCommerce.InfiniteScroll.ControlConfiguration","SuiteCommerce.InfiniteScroll.ControlModel","SuiteCommerce.InfiniteScroll.ControlView","SuiteCommerce.InfiniteScroll.TopControlView","SuiteCommerce.InfiniteScroll.GoToTop.View","SuiteCommerce.InfiniteScroll.InfiniteScroll","SuiteCommerce.InfiniteScroll.ItemsHandler","SuiteCommerce.InfiniteScroll.URLHelper","SuiteCommerce.InfiniteScroll.Instrumentation.Log","SuiteCommerce.InfiniteScroll.Instrumentation.Logger","SuiteCommerce.InfiniteScroll.Instrumentation.MockAppender","SuiteCommerce.InfiniteScroll.Instrumentation","SuiteCommerce.InfiniteScroll.Shopping","SuiteCommerce.InfiniteScroll.Pagination","CampusStores.InventoryLookup.Shopping","Cart.AddToCart.Button.View.InventoryLookup","Cart.Detailed.View.InventoryLookup","Cart.Summary.View.InventoryLookup","Header.MiniCart.View.InventoryLookup","LiveOrder.Model.InventoryLookup","PickupInStore.View.InventoryLookup","Product.Model.InventoryLookup","SuiteCommerce.ItemBadges.Configuration","SuiteCommerce.ItemBadges.Instrumentation.FallbackLogger","SuiteCommerce.ItemBadges.Instrumentation.MockAppender","SuiteCommerce.ItemBadges.Instrumentation.Collection","SuiteCommerce.ItemBadges.Instrumentation.Model","SuiteCommerce.ItemBadges.Instrumentation.InstrumentationHelper","SuiteCommerce.ItemBadges.Instrumentation.Logger","SuiteCommerce.ItemBadges.BadgesList.View","SuiteCommerce.ItemBadges.Collection","SuiteCommerce.ItemBadges.GlobalViews","SuiteCommerce.ItemBadges.Model","SuiteCommerce.ItemBadges.ProductDetail","SuiteCommerce.ItemBadges.ProductList","SuiteCommerce.ItemBadges.View","SuiteCommerce.ItemBadges.EntryPoint","jQuery.bxSlider@4.2.14","NetSuite.LogoList.Common.Instrumentation.Helper","NetSuite.LogoList.Common.Utils","NetSuite.LogoList.Instrumentation.Fallback.Logger","NetSuite.LogoList.Instrumentation.Log","NetSuite.LogoList.Instrumentation.Logger","NetSuite.LogoList.Instrumentation.MockAppender","NetSuite.LogoList.Instrumentation","NetSuite.LogoList.LogoListCCT.Logo.View","NetSuite.LogoListCCT.Utils","NetSuite.LogoList.LogoListCCT.View","NetSuite.LogoList.LogoListCCT","NetSuite.LogoList.LogoListModule","SC.ManorThemeExtension.ApplicationSkeleton.Layout","SC.ManorThemeExtension.Categories.Thumbnail","SC.ManorThemeExtension.Common.Configuration","SC.ManorThemeExtension.Common.LayoutHelper","SC.ManorThemeExtension.Common.UtilitiesHelper","SC.ManorThemeExtension.ErrorManagement.PageNotFound.View","SC.ManorThemeExtension.Footer","SC.ManorThemeExtension.Header","SC.ManorThemeExtension.Home","SC.ManorThemeExtension.HomeCMS","SC.ManorThemeExtension.ItemRelations.SC.Configuration","SC.ManorThemeExtension.Shopping","SC.ManorThemeExtension.LoadWebFont","SuiteCommerce.Newsletter.Instrumentation.Helper","SuiteCommerce.Newsletter.ExtMessage.Model","SuiteCommerce.Newsletter.ExtMessage.View","SuiteCommerce.Newsletter.Instrumentation.Log","SuiteCommerce.Newsletter.Instrumentation.Logger","SuiteCommerce.Newsletter.Instrumentation.MockAppender","SuiteCommerce.Newsletter.Instrumentation","SuiteCommerce.Newsletter.Main.Module","SuiteCommerce.Newsletter.NewsletterCCT.Model","SuiteCommerce.Newsletter.NewsletterCCT.View","SuiteCommerce.Newsletter.NewsletterCCT","SuiteCommerce.OrderStatus.Configuration","SuiteCommerce.OrderStatus.Common.DependencyProvider","SuiteCommerce.OrderStatus.Instrumentation.FallbackLogger","SuiteCommerce.OrderStatus.Instrumentation.MockAppender","SuiteCommerce.OrderStatus.Instrumentation.Collection","SuiteCommerce.OrderStatus.Instrumentation.Model","SuiteCommerce.OrderStatus.Instrumentation.InstrumentationHelper","SuiteCommerce.OrderStatus.Instrumentation.Logger","SuiteCommerce.OrderStatus.Shopping","SuiteCommerce.OrderStatus.Utils","SuiteCommerce.OrderStatus.OrderFinder.Help.View","SuiteCommerce.OrderStatus.OrderFinder.ItemDetails.View","SuiteCommerce.OrderStatus.OrderFinder.Order.Model","SuiteCommerce.OrderStatus.OrderFinder.OrderPaymentInfo.View","SuiteCommerce.OrderStatus.OrderFinder.OrderSummary.View","SuiteCommerce.OrderStatus.OrderFinder.Router","SuiteCommerce.OrderStatus.OrderFinder.SearchForm.View","SuiteCommerce.OrderStatus.OrderFinder.SearchResults.View","NSeComm.Punchout2Go.Main","NSeComm.Punchout2Go.NotShopping","Punchout2Go.DynamicCSS","Punchout2Go.OrderMinimumAmount","Punchout2Go.TransferCart.Button.View","Punchout2Go.TransferCart.Model","AcademicTerm.Collection","AcademicTerm.Model","CampusStores.Rentals.Shopping","Cart.AddToCart.Button.View.Rentals","Cart.Item.Summary.View.Rentals","Header.MiniCartItemCell.View.Rentals","Item.KeyMapping.Rentals","Product.Model.Rentals","ProductViews.Price.View.Rentals","RentalDefaultCC.Model","RentalDuration.Collection","RentalDuration.Model","RentalIneligibility.Model","Rentals.Helper","Rentals.View","TermsAndConditions.View.Rentals","Transaction.Line.Model.Rentals","Transaction.Line.Views.Price.View.Rentals","CampusStores.SchoolAffiliationExtension.SchoolAffiliation.Shopping","Cart.AddToCart.Button.View.SchoolAffiliation","Header.Menu.MyAccount.View.SchoolAffiliation","LoginRegister.Register.View.SchoolAffiliation","SchoolAffiliation.ListProvider","SuiteCommerce.SizeChart.Chart.Collection","SuiteCommerce.SizeChart.Chart.Model","SuiteCommerce.SizeChart.Chart.Page.Model","SuiteCommerce.SizeChart.Chart.Page.View","SuiteCommerce.SizeChart.Chart.Router","SuiteCommerce.SizeChart.Chart.View","SuiteCommerce.SizeChart.Common.Configuration","SuiteCommerce.SizeChart.Common.DependencyProvider","SuiteCommerce.SizeChart.Common.InstrumentationHelper","SuiteCommerce.SizeChart.Common.Utils","SuiteCommerce.SizeChart.Instrumentation.Log","SuiteCommerce.SizeChart.Instrumentation.Logger","SuiteCommerce.SizeChart.Instrumentation.MockAppender","SuiteCommerce.SizeChart.Instrumentation","SuiteCommerce.SizeChart.Shopping","SuiteCommerce.SizeChart.NotFoundPage.View","SuiteCommerce.SizeChart.PDP.Configuration","SuiteCommerce.SizeChart.PDP.Item.Model","SuiteCommerce.SizeChart.PDP.View","SuiteCommerce.SizeChart.PDP","CampusStores.StudentManagerExtension.StudentManager.MyAccount","Header.Menu.MyAccount.View.StudentManager","StudentManager.Collection","StudentManager.Details.View","StudentManager.List.View","StudentManager.Model","StudentManager.Router","CampusStores.TermsAndConditions.Shopping","Cart.AddToCart.Button.View.TermsAndConditions","TermsAndConditions.Modal.View","TermsAndConditions.View","Transaction.Line.Model.TermsAndConditions","CampusStores.VerbaCompareExtension.VerbaCompare","VerbaCompare.Collection","VerbaCompare.Model","VerbaCompare.Router","VerbaCompare.View"];
