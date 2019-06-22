const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin');
const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({ path: './', logLevel: 0 });
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractTextPlugin = require('mini-css-extract-plugin');
const path = require('path');

const extensions = ['.js', '.jsx', '.json'];
module.exports = {
    target: 'electron-renderer',

    entry: ['./src/renderer.js'],

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },

    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/react']
                }
            },
            {
                test: /\.css$/,
                use: [
                    { 
                        loader: MiniCssExtractTextPlugin.loader 
                    },
                    'css-loader'
                ]
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'file-loader',
                query: {
                    name: '[name].[ext]?[hash]'
                }
            } 
        ]
    },

    plugins: [
        new MiniCssExtractTextPlugin({
            filename: 'bundle.css',
        }),
        new ElectronReloadWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: 'TorBot',
            template: 'src/index.html'

        })
    ],

    resolve: {
      extensions: extensions 
    }
};