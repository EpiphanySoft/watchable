'use strict';

const Empty = require('./Empty.js');

const relayersSym = Symbol('eventRelayers');

class Relayer {
    static create (source, target, options) {
        let relay = target;

        if (target) {
            if (!target.isEventRelayer) {
                relay = new Relayer(options);
                relay.target = target;
            }

            relay.source = source;

            let relayers = source[relayersSym];

            if (!relayers) {
                source[relayersSym] = relayers = [ relay ];
                relayers[firingSym] = 0;
            }
            else if (!relayers.includes(relay)) {
                if (relayers[firingSym]) {
                    source[relayersSym] = relayers = relayers.slice();
                    relayers[firingSym] = 0;
                }

                relayers.push(relay);
            }
        }

        return relay;
    }

    constructor (config) {
        if (typeof config === 'function') {
            this.relay = config;
        }
        else if (config) {
            this.map = new Empty();

            if (Array.isArray(config)) {
                for (let event of config) {
                    this.map[event] = event;
                }
            }
            else {
                for (let event in Object.keys(config)) {
                    let val = config[event];

                    if (val === true) {
                        val = event;
                    }

                    this.map[event] = val;
                }
            }
        }
    }

    close () {
        this.destroy();
    }

    destroy () {
        let source = this.source;
        let relayers = source[relayersSym];
        let index = relayers ? relayers.indexOf(this) : -1;

        if (index > -1) {
            if (relayers[firingSym]) {
                source[relayersSym] = relayers = relayers.slice();
                relayers[firingSym] = 0;
            }

            relayers.splice(index, 1);
        }
    }

    relay (event, args) {
        let map = this.map;
        let entry, ret;

        if (!map) {
            ret = this.target.fire(event, ...args);
        }
        else {
            entry = map[event] || map['*'];

            if (entry) {
                if (typeof entry === 'function') {
                    ret = entry.call(this, event, args);
                }
                else {
                    ret = this.target.fire((entry === true) ? event : entry, ...args);
                }
            }
        }

        return ret;
    }
}

Relayer.prototype.isEventRelayer = true;

Relayer.SYMBOL = relayersSym;

module.exports = Relayer;
