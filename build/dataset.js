(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
   typeof define === 'function' && define.amd ? define(['exports'], factory) :
   (factory((global.dataset = global.dataset || {})));
}(this, function (exports) { 'use strict';

   function db_basic_setup(db_obj, ns){
       db_obj.data[ns] = {indexed:false};
       db_obj.data[ns].namespace = ns;
       db_obj.data[ns].promise = Promise.resolve({'dataset':db_obj.data[ns], 'dashboard': db_obj});
       db_obj.last_ns = ns;
   }

   function db_index(features_to_index){
       return function(passed_obj){
           return new Promise(function(resolve, reject){
               if (!features_to_index){
                   // do something where we pull the features to index automatically.
               }
               passed_obj.dataset.data = crossfilter(passed_obj.dataset.data);
               passed_obj.dataset.dims = {};
               passed_obj.dataset.indexed = true;
               var feature;
               for (var i =0; i< features_to_index.length;i++){
                   feature = features_to_index[i];
                   passed_obj.dataset.dims[feature] = passed_obj.dataset.data.dimension(function(d){return d[feature]});
               }
               resolve(passed_obj);
           });
       }
   }

   function db_define_dataset_steps(db_obj, args){
       // This function sets a fetch function, a format function,
       // and then further contextualizes these functions as chain-points in the promise.
       if (typeof args == 'object') {
           var ns = args.namespace;
           var fetch_fcn = args.hasOwnProperty('csv') ? db_fetch(d3.csv, args.csv) : db_fetch(d3.json, args.json);
           var format_fcn = db_format(args.format);

           db_obj.data[ns].promise = db_obj.data[ns].promise
               .then(fetch_fcn).then(format_fcn);

           db_obj.data[ns].promise = args.hasOwnProperty('index')   ? 
               db_obj.data[ns].promise.then(db_index(args.index)) : 
               db_obj.data[ns].promise;
       }
   }


   function db_then(db_obj, fcn){
       db_obj.data[db_obj.last_ns].promise = db_obj.data[db_obj.last_ns].promise.then(fcn);
   }

   function db_promise_factory (fcn) {
       return function(passed_obj){
           return new Promise(function(resolve, reject) {
               fcn(passed_obj.dataset, passed_obj.dashboard);
               resolve(passed_obj);
           })
       }
   }

   function db_fetch (which_fcn, path){
       return function(passed_obj) {
           return new Promise(function(resolve, reject) {
               which_fcn(path, function(data) {
                   passed_obj.dataset.data = data;
                   passed_obj.dataset.path = path;
                   resolve(passed_obj);
               })
           })
       }
   }

   function db_format (fcn) {
       return function(passed_obj){
           return new Promise(function(resolve, reject) {
               passed_obj.dataset.data = fcn(passed_obj.dataset.data, passed_obj.dashboard);
               resolve(passed_obj);
           })
       }
   }

   function datasetCollection () {

       this.data = {};
       this.values = {};
       this.segments = {};
       var first_load = true;
       this.first_load_fcn = false;
       this.data_cuts = [];
       this.use_steps = [];

       this.with = function(ns, fcn){
           this.last_ns = ns;
           var _this = this;
           db_then(_this, db_promise_factory(fcn));
           
       }

       this.hasDataset = function (ds) {
           return this.data.hasOwnProperty(ds);
       }



       this.value = function () {
           //if (!arguments) return this.values;
           if (arguments.length == 1) {// get
               return this.values[arguments[0]];
           } else if (arguments.length == 2) { // set
               this.values[arguments[0]] = arguments[1];
               return this;
           }
           return this;
       }

       this.onFirstLoad = function(fcn){
           this.first_load_fcn = fcn;
           return this;
       }

       this.then = function(fcn){
           var _this = this;
           db_then(_this, db_promise_factory(fcn));
           return this;

       }

       this.fetchCSV = function(path){
           var _this = this;
           db_then(_this, db_fetch(d3.csv, path));
           return this;
       }

       this.fetchTSV = function(path){
           var _this = this;
           db_then(_this, db_fetch(d3.tsv, path))
           return this;
       }

       this.fetchJSON = function(path){
           var _this = this;
           db_then(_this, db_fetch(d3.json, path));
           return this;
       }

       this.fetchText = function(path){
           var _this = this;
           db_then(_this, db_fetch(d3.text, path));
           return this;
       }

       this.format = function (fcn) {
           var _this = this;
           db_then(_this, db_format(fcn));
           return this;
       }

       this.dataset = function(ns){
           var _this = this;
           var namespace;
           if (typeof ns === 'string'){
               namespace = ns;
           } else if (typeof ns === 'object') {
               namespace = ns.namespace;
           }
           db_basic_setup(_this, namespace);
           db_define_dataset_steps(_this, ns);
           return this;
       }

       this.waitFor = function(key){
           var that = this;
           var promise_to_wait_for = that.data[key].promise;
           that.data[that.last_ns].promise = Promise
                   .all([that.data[that.last_ns].promise, promise_to_wait_for])
                   .then(function(){return {'dataset': that.data[that.last_ns], 'dashboard': that} });
           return this;
       }

       this.waitForAllThen = function(fcn) {
           var that = this;
           var promises = Object.keys(that.data).map(function(d){
               return that.data[d].promise;
           });
           Promise.all(promises).then(function(){
               fcn(that);
           });
       }

       return this;
   }

   function db_indexed_datasets (dashboard){
       var indexed_datasets = {};
       Object.keys(dashboard.data).forEach(function(d){
           if (dashboard.data[d].indexed) indexed_datasets[dashboard.data[d].namespace] = dashboard.data[d];
       }) 
       return indexed_datasets;
   }

   function cutData (args){
       //if (!args) args = {};
       var that = this;
       //var current_cut_step = Promise
       that.args_for_this = args;
       this.current_cut_step = Promise
           .all(Object.keys(that.data).map(function(d){ return that.data[d].promise }))
           .then(function(){return args})
           .then(function(args){
               var dashboard = that;
               var trigger = 'actives';
               var dataset;

               var indexed_datasets = db_indexed_datasets(dashboard);
               var relevant_datasets = dashboard.segment('dataset');
               if (typeof args === 'object' && args !== null){
                   ///////// Figure out the segments; //////////////
                   Object.keys(dashboard.segments).forEach(function(f){
                       args[f] = args.hasOwnProperty(f) ? args[f] : dashboard.segments[f];
                   });
                   // Select the dataset. This is what this args.dataset key-value pair is all about.

                   dataset = args.dataset ? args.dataset : (dashboard.segment('dataset') ? dashboard.segment('dataset') : Object.keys(dashboard.data)
                                                               .filter(function(d){ return dashboard.data[d].indexed; })
                                                               .map(function(d){return dashboard.data[d].namespace;}));
               } else {
                   var args = {};
                   Object.keys(dashboard.segments).forEach(function(f){
                       args[f] = dashboard.segments[f];
                   });
                   dataset = dashboard.segment('dataset') ? dashboard.segment('dataset') : Object.keys(dashboard.data)
                                                               .filter(function(d){ return dashboard.data[d].indexed; })
                                                               .map(function(d){return dashboard.data[d].namespace;});
               }
               
               // turn dataset into an array and iterate
               var d = [], dd;
               if (!Array.isArray(dataset)){
                   dataset = [dataset];
               }
               dataset.forEach(function(ds){  
                   Object.keys(args).forEach(function(f){
                       if (f != 'dataset') indexed_datasets[ds].dims[f].filterAll();
                   });
                   Object.keys(args).forEach(function(f){
                       if (f != 'dataset') indexed_datasets[ds].dims[f].filter(args[f]);
                   });
                   dd = indexed_datasets[ds].dims[trigger].top(Infinity);
                   d.push(dd);
               })
               dashboard.datasets_for = dataset;

               dashboard.latest_data = d;
               return d;
       });
       return this;
   }

   function segment (seg) {
       // Defines segments for which indexed datasets are cut-up and used.
       // For context, you may have two different data sets with the same values -
       // Let's say, both reflecting polling data over time from two sources.
       // My typical approach is to have both of them have the same features, and define
       // which dimensions you want to split them on. 
       // At the moment this library only supports segmentation based on categorical values.
       // This will obviously have to change.
       var that = this;
       if (!seg) return that.segments;
       if (Array.isArray(seg)) {

           seg.forEach(function(s) {
               if (!that.segments.hasOwnProperty(s)) that.segments[s] = null;
           })
           return that;
       } else if ((typeof seg === 'object') && seg !== null) {
           Object.keys(seg).forEach(function(s){
               that.segments[s] = seg[s];
           });
           return that;
       } else { // single value. Set to null.
           if (arguments.length == 0){
               return this.segments;
           } else if (arguments.length == 1){
               return that.segments[arguments[0]];
           } else if (arguments.length == 2){
               that.segments[arguments[0]] = arguments[1];
               return that;
           }
       }
       return that;
   }

   function index(features){
       var _this = this;
       db_then(_this, db_index(features));
       return this;
   }

   function useData(fcn){
       var that = this;
       var us = that.current_cut_step
       .then(function(data){
           fcn(data, that);
       });
       return this;
   }

   datasetCollection.prototype.useData = useData;
   datasetCollection.prototype.index = index;
   datasetCollection.prototype.segment = segment;
   datasetCollection.prototype.cutData = cutData;

   var version = '0.1.0a'

   function collection() {
   	return new datasetCollection();
   }

   exports.collection = collection;
   exports.version = version;

   Object.defineProperty(exports, '__esModule', { value: true });

}));