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

export {
    db_basic_setup,
    db_then,
    db_index,
    db_define_dataset_steps,
    db_promise_factory,
    db_fetch,
    db_format
}