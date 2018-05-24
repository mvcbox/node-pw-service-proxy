'use strict';

const net = require('net');
const packetParserStreamFactory = require('./packet-parser-stream-factory');
const handlersStreamFactory = require('./handlers-stream-factory');

/**
 * @property {Object} _options
 * @property {Object} [_handlers]
 * @property {Object} [_handlers.client]
 * @property {Array} [_handlers.client._list]
 * @property {Object} [_handlers.server]
 * @property {Array} [_handlers.server._list]
 */
class PwServiceProxy {
    /**
     * @param {Object} options
     */
    constructor(options) {
        this._options = Object.assign({}, {
            bufferSize: 10485760,
            bufferFreeSpaceGc: 1048576,
            noDelay: true,
            consoleLog: false
        }, options || {});

        this._handlers = {
            client: {
                _list: []
            },
            server: {
                _list: []
            }
        };
    }

    /**
     * @private
     */
    _consoleLog() {
        if (this._options.consoleLog) {
            console.log.apply(console, arguments);
        }
    }

    /**
     * @param {Array} handlers
     * @returns {Array}
     * @private
     */
    _prepareHandlersList(handlers) {
        let result = [];

        for (let i = 0; i < handlers.length; ++i) {
            if (Array.isArray(handlers[i])) {
                result = result.concat(this._prepareHandlersList(handlers[i]));
            } else {
                result.push(handlers[i]);
            }
        }

        return result;
    }

    /**
     * @param {Object} options
     * @returns {PwServiceProxy}
     */
    start(options) {
        let _this = this;

        net.createServer(function (clientSocket) {
            if (
                Array.isArray(options.allowedIp) && options.allowedIp.length && options.allowedIp.indexOf(clientSocket.remoteAddress) === -1 ||
                typeof options.allowedIp === 'string' && options.allowedIp && options.allowedIp !== clientSocket.remoteAddress ||
                typeof options.allowedIp === 'function' && !options.allowedIp(clientSocket)
            ) {
                return clientSocket.end().unref();
            }

            let remoteAddr = clientSocket.remoteAddress + ':' + clientSocket.remotePort;
            let alreadyClosed = false;
            let serverSocket = net.createConnection(options.connect, function () {
                clientSocket
                    .pipe(packetParserStreamFactory(_this._options))
                    .pipe(handlersStreamFactory(_this._handlers.client, clientSocket, serverSocket))
                    .pipe(serverSocket)
                    .pipe(packetParserStreamFactory(_this._options))
                    .pipe(handlersStreamFactory(_this._handlers.server, serverSocket, clientSocket))
                    .pipe(clientSocket);
            });

            function closeConnection() {
                if (!alreadyClosed) {
                    alreadyClosed = true;
                    clientSocket.end().unref();
                    serverSocket.end().unref();
                    _this._consoleLog('---------------------------------------------------------------------------');
                    _this._consoleLog('[' + new Date().toLocaleString() + ']: Client disconnected [' + remoteAddr + ']');
                }
            }

            serverSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(_this._options.noDelay);
            clientSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(_this._options.noDelay);
            _this._consoleLog('---------------------------------------------------------------------------');
            _this._consoleLog('[' + new Date().toLocaleString() + ']: Client connected [' + remoteAddr + ']');
        }).listen(options.listen, function () {
            _this._consoleLog('---------------------------------------------------------------------------');
            _this._consoleLog('[' + new Date().toLocaleString() + ']: Proxy start');
        }).on('error', function (err) {
            console.error('---------------------------------------------------------------------------');
            console.error('[' + new Date().toLocaleString() + ']: Proxy error');
            console.error(JSON.stringify(options, null, 2));
            console.error(err.stack);
            console.error('---------------------------------------------------------------------------');
        });

        return this;
    }

    /**
     * @param {Array} handlers
     * @returns {PwServiceProxy}
     */
    setClientHandlers(handlers) {
        this._handlers.client._list = this._prepareHandlersList(handlers);
        return this;
    }

    /**
     * @param {Array} handlers
     * @returns {PwServiceProxy}
     */
    setServerHandlers(handlers) {
        this._handlers.server._list = this._prepareHandlersList(handlers);
        return this;
    }
}

module.exports = PwServiceProxy;
