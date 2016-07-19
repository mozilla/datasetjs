import datasetCollection from './dataset-core'
import {db_then, db_index} from './dataset-helpers'

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

export {
        useData,
        index, 
        segment, 
        cutData
};