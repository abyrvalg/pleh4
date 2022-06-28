const path = require('path');
const fs = require("fs");
var files = [
	path.resolve(__dirname, 'cartridges/base/client/main.js')
];
module.exports = {
	entry: files,
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'public/js')
	},
	optimization: {
		// We do not want to minimize our code.
		minimize: false
	}
};