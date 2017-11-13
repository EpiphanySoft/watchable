'use strict';

const { Watchable } = require('./Watchable.js');
const { Empty, symbols } = require('./common.js');

const firingSym = symbols.firing;
const relayersSym = symbols.relayers;

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

    static relay (relayers, event, args) {
        ++relayers[firingSym];

        for (let relay of relayers) {
            relay.relay(event, args);
        }

        --relayers[firingSym];
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

Watchable.Relayer = Relayer;

function relay (watchable1, watchable2, options) {
    return Relayer.create(watchable1, watchable2, options);
}

relay.Relayer = Relayer;

module.exports = relay;
