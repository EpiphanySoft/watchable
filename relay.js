'use strict';

const { Watchable } = require('./Watchable.js');
const { Empty, indexOf, symbols } = require('./common.js');

const firingSym = symbols.firing;
const relayersSym = symbols.relayers;

class Relayer {
    static create (source, target, options) {
        let relay = target;

        if (!target || !target.isEventRelayer) {
            relay = new this(options);
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
                for (let event of Object.keys(config)) {
                    let val = config[event];

                    if (event !== '*' && val === true) {
                        val = event;
                    }

                    this.map[event] = val;
                }
            }
        }
    }

    destroy () {
        this.close();
    }

    close () {
        let source = this.source;
        let relayers = source[relayersSym];
        let index = indexOf(relayers, this);

        if (index > -1) {
            if (relayers[firingSym]) {
                source[relayersSym] = relayers = relayers.slice();
                relayers[firingSym] = 0;
            }

            relayers.splice(index, 1);
        }
    }

    doRelay (event, args) {
        this.target.fire(event, ...args);
    }

    relay (event, args) {
        let map = this.map;
        let entry, ret;

        if (!map) {
            ret = this.doRelay(event, args);
        }
        else {
            entry = (event in map) ? map[event] : map['*'];

            if (entry) {
                if (typeof entry === 'function') {
                    ret = entry.call(this, event, args);
                }
                else {
                    ret = this.doRelay((entry === true) ? event : entry, args);
                }
            }
        }

        return ret;
    }
}

Relayer.prototype.isEventRelayer = true;

Watchable.Relayer = Relayer;

function relayEvents (watchable1, watchable2, options) {
    return Relayer.create(watchable1, watchable2, options);
}

relayEvents.Relayer = Relayer;
relayEvents.relayEvents = relayEvents;

module.exports = relayEvents;
