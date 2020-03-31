var path = require('path');

module.exports = function (config, data) {
    var compareDir = path.resolve(data.nodeDir, 'compare-versions');

    config.module.rules.push({
        resource: {
            test: new RegExp(compareDir + '.*.js$'),
            include: [compareDir]
        },
        use: [
            {
                loader: 'babel-loader',
                options: {
                    presets: ['env']
                }
            }
        ]
    });

    return config;
};
