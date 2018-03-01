var BrowserSyncPlugin = require('browser-sync-webpack-plugin');

module.exports = {
    entry: './src/main.ts',
    output: {
        path: __dirname + '/dict',
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js', '.ts', '.ts']
    },
    devtool: 'source-map', // if we want a source map 
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
        new BrowserSyncPlugin({
            host: 'localhost',
            port: 3000,
            server: { 
                baseDir: './'
            }
        })
    ]
};