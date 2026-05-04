const path = require('path');
const PugPlugin = require('pug-plugin');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    devtool: false,
    entry: './main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'vip-plugin.umd.js',
        clean: true,
    },
    resolve: {
        extensions: ['.js', '.pug'],
    },
    externals: {
        jquery: 'jQuery',
        underscore: '_',
        backbone: 'Backbone',
        moment: 'moment',
        girder: 'girder',
    },
    plugins: [
        new PugPlugin(),
        new webpack.ProvidePlugin({
            $: ['girder', '$'],
            jQuery: ['girder', '$'],
            _: ['girder', '_'],
            Backbone: ['girder', 'Backbone'],
            moment: ['girder', 'moment'],
        })
    ],
};