var webpack = require('webpack');


var version = '1.4';
var header = 
`// ==UserScript==
// @name         Blackboard Notes Downloader
// @namespace    nico
// @version      ${version}
// @description  Download notes
// @author       Nicolas
// @match        https://learn.polyu.edu.hk/webapps/blackboard/execute/modulepage/view?course_id=*
// ==/UserScript==
`;


module.exports = {
    entry: './src/main.ts',
    output: {
        path: __dirname + '/build',
        filename: 'blackboard-notes-downloader.plugin.js'
    },
    resolve: {
        extensions: ['.js', '.ts', '.ts']
    },
    module: {
        loaders: [
			{ 
				test: /\.ts$/, 
				loader: 'ts-loader' 
			}, {
                test: /\.html$/,
                exclude: /node_modules/,
                loader: "html-loader?exportAsEs6Default"
            }, {
                test: /\.css$/,
                exclude: /node_modules/,
                loader: "html-loader?exportAsEs6Default"
            }
        ]
	},

	plugins: [
		//new webpack.optimize.UglifyJsPlugin({ comments: false }),
		new webpack.BannerPlugin({
			banner: header,
			raw: true
		})
	]
};