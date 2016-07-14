
var ds = dataset.collection();


ds.dataset('something-else')
	.fetchCSV('data/marvel_power_grid.csv');

ds.dataset('by-type')
	.fetchCSV('data/by-type.csv')
	.format(function(data){
		data = data.map(function(d){
			d.date = new Date(d.date);
			d.count = +d.count;
			return d;
		})
		return data;
	})
	.waitFor('something-else')
	.then(function(dataset, collection){
		console.log(dataset.data, collection);
	})