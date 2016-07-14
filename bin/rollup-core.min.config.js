
import uglify from 'rollup-plugin-uglify';


export default {
    entry: './bin/rollup-core.js',
    format: 'umd',
    moduleName: 'dataset',
    plugins: [
        uglify()
    ],
    dest: './build/dataset.min.js'
}
