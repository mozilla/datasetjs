import datasetCollection from '../src/core/dataset-core.js';

import {
   		useData,
        index, 
        segment, 
        cutData
} from '../src/core/dataset-indexible.js'

datasetCollection.prototype.useData = useData;
datasetCollection.prototype.index = index;
datasetCollection.prototype.segment = segment;
datasetCollection.prototype.cutData = cutData;

var version = '0.1.0a'

function collection() {
	return new datasetCollection();
}

export {collection, version};

//import {test} from './src/core/dataset-test.js';
