'use strict';

/**
 * @param {string} type
 * @param {boolean} showLogs
 * @returns {Function}
 */
module.exports = function (type, showLogs) {
    /**
     * @param {string} title
     * @param {Array} args
     */
    return function (title, ...args) {
        if (showLogs) {
            console[type]('---------------------------------------------------------------------------');
            console[type](`[${new Date().toLocaleString()}]: ${title}`);
            args.map(function (item) {
                console[type](item);
            });
            console[type]('---------------------------------------------------------------------------');
        }
    };
};
