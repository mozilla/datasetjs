import {
    db_basic_setup,
    db_define_dataset_steps,
    db_then,
    db_promise_factory,
    db_fetch,
    db_format
} from './dataset-helpers.js';

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

export default datasetCollection;