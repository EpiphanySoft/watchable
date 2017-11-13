'use strict';

const { Empty, getDescriptors, symbols } = require('./common.js');

const actualSym   = symbols.actual;
const firingSym   = symbols.firing;
const relayersSym = symbols.relayers;
const watchersSym = symbols.watchers;
const STOP        = symbols.STOP;

//----------------------------------------

class Token {
    constructor (instance) {
        this.instance = instance;
        this.listeners = [];
    }

    close () {
        this.destroy();
    }

    destroy () {
        let instance = this.instance;
        let watcherMap = instance[watchersSym];
        let listener, index, name, watchers;

        if (watcherMap) {
            for (listener of this.listeners) {
                watchers = watcherMap[name = listener[3]];

                if (watchers && firingSym in watchers) {
                    if ((index = watchers.indexOf(listener)) > -1) {
                        if (watchers[firingSym]) {
                            watcherMap[name] = watchers = watchers.slice();
                            watchers[firingSym] = 0;
                        }

                        if (watchers.length > 1) {
                            watchers.splice(index, 1);
                        }
                        else {
                            watcherMap[name] = null;
                        }
                    }
                }
                else if (watchers === listener) {
                    watcherMap[name] = null;
                }

                if (instance.onEventUnwatch && !watcherMap[name]) {
                    instance.onEventUnwatch(name);
                }
            }
        }
    }
}

function invoke (instance, listener, args) {
    let [ fn, scope, resolve ] = listener;
    let it = resolve ? instance.resolveListenerScope(scope, fn, listener) : scope;
    let isStr = fn.charAt, x = args[0], y = args[1], z = args[2];

    // fn.apply() and fn(...args) are notably slower then fn() and fn.call()
    switch (args.length) {
    case 0:
        return isStr ? it[fn]() : (it ? fn.call(it) : fn());
    case 1:
        return isStr ? it[fn](x) : (it ? fn.call(it, x) : fn(x));
    case 2:
        return isStr ? it[fn](x, y) : (it ? fn.call(it, x, y) : fn(x, y));
    case 3:
        return isStr ? it[fn](x, y, z) : (it ? fn.call(it, x, y, z) : fn(x, y, z));
    }

    return (isStr ? it[fn] : fn).apply(it, args);
}

function listen (instance, fn, scope) {
    let listener = [ fn, scope ];

    if (typeof scope === 'string' || (fn.charAt && !scope)) {
        if (!instance.resolveListenerScope) {
            throw new Error('Watchable instance does not support scope resolution');
        }

        listener[2] = true;
    }

    return listener;
}

function match (listener, fn, scope) {
    let [ lfn, lsc ] = listener[0][actualSym] || listener;
    return fn === lfn && (scope ? lsc === scope : !lsc);
}

function on (instance, watcherMap, name, fn, scope, token) {
    let watchers = watcherMap[name];
    let listener = listen(instance, fn, scope);
    let candidate;

    if (watchers && firingSym in watchers) {
        // Ignore duplicate registrations
        for (candidate of watchers) {
            if (match(candidate, fn, scope)) {
                return;
            }
        }

        if (watchers[firingSym]) {
            watcherMap[name] = watchers = watchers.slice();
            watchers[firingSym] = 0;
        }

        watchers.push(listener);
    }
    else if (watchers) {
        if (match(watchers, fn, scope)) {
            return;
        }

        watcherMap[name] = watchers = [watchers, listener];
        watchers[firingSym] = 0;
    }
    else {
        watcherMap[name] = listener;

        if (instance.onEventWatch) {
            instance.onEventWatch(name);
        }
    }

    if (token) {
        token.listeners.push(listener);
        listener[3] = name;
    }
}

function un (instance, watcherMap, name, fn, scope) {
    let watchers = watcherMap[name];
    let i;

    if (watchers) {
        if (firingSym in watchers) {
            if (watchers[firingSym]) {
                watcherMap[name] = watchers = watchers.slice();
                watchers[firingSym] = 0;
            }

            for (i = watchers.length; i-- > 0;) {
                if (match(watchers[i], fn, scope)) {
                    if (watchers.length > 1) {
                        watchers.splice(i, 1);
                    }
                    else {
                        watcherMap[name] = null;
                    }

                    break;  // duplicates are prevents by on()
                }
            }
        }
        else if (match(watchers, fn, scope)) {
            watcherMap[name] = null;
        }

        if (instance.onEventUnwatch && !watcherMap[name]) {
            instance.onEventUnwatch(name);
        }
    }
}

function update (instance, updater, name, fn, scope) {
    let watcherMap = instance[watchersSym];
    let add = updater === on;
    let token = null;

    if (!watcherMap) {
        if (!add) {
            return this;
        }

        instance[watchersSym] = watcherMap = new Empty();
    }

    scope = scope || null;

    if (typeof name === 'string') {
        updater(instance, watcherMap, name, fn, scope);
    }
    else {
        // "name" is a manifest object of watchers

        token = add && new Token(instance);
        scope = name.this;

        for (let s of Object.keys(name)) {
            if (!Watchable.options[s]) {
                updater(instance, watcherMap, s, name[s], scope, token);
            }
        }
    }

    return token || this;
}

//----------------------------------------

class Watchable {
    emit (event, ...args) {
        return this.fire(event, ...args);
    }

    fire (event, ...args) {
        let watcherMap = this[watchersSym];
        let watchers = watcherMap && watcherMap[event];
        let R, relayers, ret;

        if (watchers && firingSym in watchers) {
            ++watchers[firingSym];

            for (let listener of watchers) {
                if (invoke(this, listener, args) === STOP) {
                    ret = STOP;
                    break;
                }
            }

            --watchers[firingSym];
        }
        else if (watchers) {
            if (invoke(this, watchers, args) === STOP) {
                ret = STOP;
            }
        }

        R = (relayers = ret !== STOP && this[relayersSym]) && Watchable.Relayer;
        if (R) {
            ret = R.relay(relayers, event, args);
        }

        return ret;
    }

    hasListeners (event) {
        let watcherMap = this[watchersSym];
        return !!(watcherMap && watcherMap[event]);
    }

    on (name, fn, scope) {
        return update(this, on, name, fn, scope);
    }

    once (name, fn, scope) {
        let actual = listen(this, fn, scope);
        let onceFn = (...args) => {
            update(this, un, name, fn, scope);
            invoke(this, actual, args);
        };

        onceFn[actualSym] = actual;

        return update(this, on, name, onceFn);
    }

    off (name, fn, scope) {
        return update(this, un, name, fn, scope);
    }

    relayEvents (target, options) {
        return Watchable.Relayer.create(this, target, options);
    }

    un (name, fn, scope) {
        return update(this, un, name, fn, scope);
    }

    unAll (event) {
        let watcherMap = this[watchersSym];

        if (!event) {
            for (let key of watcherMap) {
                watcherMap[key] = null;
            }
        }
        else if (watcherMap[event]) {
            watcherMap[event] = null;
        }

        return this;
    }
}

const proto = Watchable.prototype;
const descriptors = getDescriptors(proto);

proto[watchersSym] = null;

Watchable.options = new Empty({
    this: true
});

function morph (target) {
    Object.defineProperties(target, descriptors);
    target[watchersSym] = null;
}

morph.STOP = STOP;
morph.Watchable = Watchable;
morph.symbols = symbols;

morph.hasListeners = (instance, event) => {
    return proto.hasListeners.call(instance, event);
};

morph.is = (instance) => {
    return instance && instance[watchersSym] !== undefined;
};

morph.unAll = (instance, event) => {
    proto.unAll.call(instance, event);
};

module.exports = morph;
