# dashboard.js

__NOTE:__ This library is very alpha. Parts may change. 

__dependencies (at the moment)__: [d3](https://github.com/d3/d3)  or [d3-request](https://github.com/d3/d3-request), [crossfilter](https://github.com/crossfilter/crossfilter).

__dev dependencies__: [rollup](https://github.com/rollup/rollup)

Displaying data when your data sources come from a number of flat files quickly becomes an unmanageable task. This kind of task is a subset of what programmers have named "callback hell." Javascript is asyncronous in how it requests data, so when you want to pull a number of files and wait for them all to finish before doing something, you're left with two options: either nest your ajax requests, which can become cumbersome and difficult to read and manage, or; use javascript Promises, which - while very powerful - takes a while to wrap your head around if you're not a javascript native. The kind of people who need to display data in the browser are often not strong javascript programmers. Callback hell is especially more likely for programmers who are unfamiliar with javascript. dataset.js aims to mitigate this kind of task.

## example

    var DS = dataset.collection(); 

    DS.dataset('releaseData')                   
        .fetchJSON('/data/release-data.json')         
        .format(function(data){                        
            return data.map(function(d){ /* ... */ })
        });
    
    // Ok. Now let's load another dataset - a csv - and plot it using MetricsGraphics.js.
    // This other data set requires the 'release-data' json file we loaded before.
    
    DS.dataset('monthlyData')
        .fetchCSV('/data/monthly-downloads.csv')   
        .format(function(data){ /* ... */ })       
        .waitFor('releaseData')                    
        .then(function(data, collection) {
            MG.data_graphic( /* ... */ );
        })
    
    // broken down, these calls are as simple as this:
    
    DS.dataset('releaseData')
        .fetchJSON(releasePath)
        .format(releaseFormatFcn);
    
    DS.dataset('monthlyData')
        .fetchCSV(monthlyPath)
        .format(monthlyFormatter)
        .waitFor('releaseData')
        .then(plotTheData);
    
# API

Assuming you've created a collection object by declaring ```var DS = dataset.collection()```:

- ```DS.dataset('namespace')``` namespace __(string)__ - create a new namespace for the impending dataset. Doesn't actually load anything, so think of this as tagging the dataset so you can grab it later. Calling DB.dataset() does not actually retrieve the data - you will have to call something like db.fetchCSV() to pull the data.
- ```DS.hasDataset('namespace')``` namespace __(string)__ - returns true if the namespace has been declared.
- ```DS.fetchCSV('/path/to/data.csv')``` path __(string)__
    load a CSV. Expects a header row.
- ```DS.fetchJSON('/path/to/data.json')``` path __(string)___ load a JSON file.
- ```DS.fetchText('/path/to/data.txt')``` path __(string)__ load a  load a generic text file.
- ```format(function(data){ /* ... */})```</code> formatter __(function)__ Format the loaded data in some way. Expects you to return the data at the end.
- ```DB.waitFor('namespace')``` namespace __(string)_ waits for the chain of tasks in 'namespace' to resolve. Very useful if 'namespace' has a few asyncronous calls that might make it so the current namespace would otherwise finish before it.