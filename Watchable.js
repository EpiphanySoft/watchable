'use strict';

const Empty = require('./Empty.js');
const Relayer = require('./Relayer.js');

const actualFnSym = Symbol('actualListener');
const firingSym = Symbol('eventFiring');
const watchersSym = Symbol('eventWatchers');
const STOP = Symbol('stopFiring');

//----------------------------------------

class Token {
    constructor (instance) {
        this.watchable = instance;
        this.listeners = [];
    }

    close () {
        this.destroy();
    }

    destroy () {
        let instance = this.watchable;
        let inform = instance.onEventUnwatch;
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

    return fn.charAt ? it[fn](...args) : (it ? fn.apply(it, args) : fn(...args));
}

function match (listener, fn, scope) {
    let [ lfn, lsc ] = listener;
    return fn === (lfn[actualFnSym] || lfn) && (scope ? lsc === scope : !lsc);
}

function on (instance, watcherMap, name, fn, scope, token) {
    let watchers = watcherMap[name];
    let listener = [ fn, scope ];
    let candidate;

    if (typeof scope === 'string' || (fn.charAt && !scope)) {
        if (!instance.resolveListenerScope) {
            throw new Error('Watchable instance does not support scope resolution');
        }
        listener[2] = true;
    }

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
            return token;
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

    return token;
}

//----------------------------------------

const descriptors = {};

class Watchable {
    emit (event, ...args) {
        return this.fire(event, ...args);
    }

    fire (event, ...args) {
        let watcherMap = this[watchersSym];
        let watchers = watcherMap && watcherMap[event];
        let ret;

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

        if (ret !== STOP) {
            let relayers = this[Relayer.SYMBOL];

            if (relayers) {
                ++relayers[firingSym];

                for (let relay of relayers) {
                    relay.relay(event, args);
                }

                --relayers[firingSym];
            }
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
        const me = this;

        function onceFn (...args) {
            update(me, un, name, fn, scope);
            invoke(me, [fn, scope], args);
        }

        onceFn[actualFnSym] = fn;

        return update(me, on, name, onceFn, scope);
    }

    off (name, fn, scope) {
        return update(this, un, name, fn, scope);
    }

    relayEvents (target, options) {
        return Relayer.create(this, target, options);
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
    }
}

let proto = Watchable.prototype;

for (let name of Object.getOwnPropertyNames(proto)) {
    if (name !== 'constructor') {
        descriptors[name] = Object.getOwnPropertyDescriptor(proto, name);
    }
}

proto[watchersSym] = null;

Watchable.options = new Empty({
    this: true
});

function morph (target) {
    Object.defineProperties(target, descriptors);
    target[watchersSym] = null;
}

morph.Relayer = Relayer;
morph.STOP = STOP;
morph.Watchable = Watchable;

morph.hasListeners = (instance, event) => {
    return proto.hasListeners.call(instance, event);
};

morph.is = (instance) => {
    return instance && instance[watchersSym] !== undefined;
};

morph.unAll = (instance, event) => {
    proto.unAll.call(instance, event);
};

morph.pipe = (watchable1, watchable2) => {
    return watchable1.relayEvents(watchable2);
};

morph.symbols = {
    actualFn: actualFnSym,
    firing:   firingSym,
    watchers: watchersSym
};

module.exports = morph;
