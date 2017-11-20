'use strict';

const net = require('net');
const async = require('async');
const transformStream = require('./transform-stream-factory');
const packetParserStream = require('./packet-parser-stream-factory');

class PwServiceProxy
{
    /**
     * @param {Object} options
     */
    constructor(options) {
        this._options = Object.assign({}, {
            bufferSize: 10485760,
            bufferFreeSpaceGc: 1048576,
            noDelay: true
        }, options || {});
        this._clientHandlers = [];
        this._serverHandlers = [];
    }

    /**
     * @param {Array} handlers
     * @param {Stream} input
     * @param {Stream} output
     * @return {Stream}
     * @private
     */
    _createHandlersStream(handlers, input, output) {
        return transformStream(function (packet, enc, streamDone) {
            let _thisStream = this;

            async.eachSeries(handlers, function (handler, next) {
                if (
                    handler.only && handler.only.indexOf(packet.opcode) === -1 ||
                    handler.except && handler.except.indexOf(packet.opcode) !== -1
                ) {
                    return next();
                }

                handler.handler(packet, input, output, next);
            }, function (err) {
                if (!err) {
                    packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true);
                    _thisStream.push(packet.payload.buffer);
                }

                streamDone();
            });
        });
    }

    /**
     * @param {Object} options
     * @return {PwServiceProxy}
     */
    start(options) {
        let _this = this;

        net.createServer(function (clientSocket) {
            let remoteAddr = clientSocket.remoteAddress + ':' + clientSocket.remotePort;
            let alreadyClosed = false;
            let serverSocket = net.createConnection(options.connect, function () {
                clientSocket
                    .pipe(packetParserStream(_this._options))
                    .pipe(_this._createHandlersStream(_this._clientHandlers, clientSocket, serverSocket))
                    .pipe(serverSocket)
                    .pipe(packetParserStream(_this._options))
                    .pipe(_this._createHandlersStream(_this._serverHandlers, serverSocket, clientSocket))
                    .pipe(clientSocket);
            });

            function closeConnection() {
                if (alreadyClosed) {
                    return;
                }

                alreadyClosed = true;
                clientSocket.destroy().unref();
                serverSocket.destroy().unref();
                console.info('---------------------------------------------------------------------------');
                console.info('[' + new Date().toLocaleString() + ']: Client disconnected [' + remoteAddr + ']');
            }

            serverSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(_this._options.noDelay);
            clientSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(_this._options.noDelay);
            console.info('---------------------------------------------------------------------------');
            console.info('[' + new Date().toLocaleString() + ']: Client connected [' + remoteAddr + ']');
        }).listen(options.listen, function () {
            console.info('---------------------------------------------------------------------------');
            console.info('[' + new Date().toLocaleString() + ']: Proxy start');
        }).on('error', function (err) {
            console.info('---------------------------------------------------------------------------');
            console.error('[' + new Date().toLocaleString() + ']: Proxy error');
            console.error(JSON.stringify(options, null, 2));
            console.error(err.stack);
        });

        return this;
    }

    /**
     * @param {Array} handlers
     * @return {PwServiceProxy}
     */
    setClientHandlers(handlers) {
        this._clientHandlers = handlers;
        return this;
    }

    /**
     * @param {Array} handlers
     * @return {PwServiceProxy}
     */
    setServerHandlers(handlers) {
        this._serverHandlers = handlers;
        return this;
    }
}

module.exports = PwServiceProxy;
