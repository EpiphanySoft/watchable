'use strict';

const actualFnSym = Symbol('actualListener');
const firingSym = Symbol('eventFiring');
const watchersSym = Symbol('eventWatchers');
const STOP = Object.freeze({});

function Empty (props) {
    if (props) {
        Object.assign(this, props);
    }
}

Empty.prototype = Object.create(null);

//----------------------------------------

class Destroyer {
    constructor (instance) {
        this.watchable = instance;
        this.entries = [];
    }

    destroy () {
        let instance = this.watchable;
        let watcherMap = instance[watchersSym];
        let entry, index, name, watchers;

        if (watcherMap) {
            for (entry of this.entries) {
                watchers = watcherMap[name = entry[2]];

                if (watchers && firingSym in watchers) {
                    if ((index = watchers.indexOf(entry)) > -1) {
                        if (watchers[firingSym]) {
                            watcherMap[name] = watchers = watchers.slice();
                            watchers[firingSym] = 0;
                        }

                        watchers.splice(index, 1);
                    }
                }
                else if (watchers === entry) {
                    watcherMap[name] = null;
                }
            }
        }
    }
}

function call (fn, scope, args) {
    return scope ? (fn.charAt ? scope[fn](...args) : fn.call(scope, ...args)) : fn(...args);
}

function on (watcherMap, name, fn, scope, destroyer) {
    let watchers = watcherMap[name];
    let added = [fn, scope];
    let actualFn, entry;

    if (watchers && firingSym in watchers) {
        for (entry of watchers) {
            actualFn = entry[0];
            actualFn = actualFn[actualFnSym] || actualFn;

            if (actualFn === fn && (scope ? entry[1] === scope : !entry[1])) {
                return;
            }
        }

        if (watchers[firingSym]) {
            watcherMap[name] = watchers = watchers.slice();
            watchers[firingSym] = 0;
        }

        watchers.push(added);
    }
    else if (watchers) {
        actualFn = watchers[0];
        actualFn = actualFn[actualFnSym] || actualFn;

        if (actualFn === fn && (scope ? watchers[1] === scope : !watchers[1])) {
            return;
        }

        watcherMap[name] = watchers = [watchers, added];
        watchers[firingSym] = 0;
    }
    else {
        watcherMap[name] = added;
    }

    if (destroyer) {
        destroyer.entries.push(added);
        added.push(name);
    }
}

function un (watcherMap, name, fn, scope) {
    let watchers = watcherMap[name];
    let actualFn, entry, i;

    if (watchers && firingSym in watchers) {
        if (watchers[firingSym]) {
            watcherMap[name] = watchers = watchers.slice();
            watchers[firingSym] = 0;
        }

        for (i = watchers.length; i-- > 0; ) {
            entry = watchers[i];
            actualFn = entry[0];
            actualFn = actualFn[actualFnSym] || actualFn;

            if (actualFn === fn && (scope ? entry[1] === scope : !entry[1])) {
                watchers.splice(i, 1);
                break;  // duplicates are prevents by on()
            }
        }
    }
    else if (watchers) {
        actualFn = watchers[0];
        actualFn = actualFn[actualFnSym] || actualFn;

        if (actualFn === fn && (scope ? watchers[1] === scope : !watchers[1])) {
            watcherMap[name] = null;
        }
    }
}

function update (instance, updater, name, fn, scope) {
    let watcherMap = instance[watchersSym];
    let add = updater === on;
    let destroyer = null;

    if (!watcherMap) {
        if (!add) {
            return destroyer;
        }

        instance[watchersSym] = watcherMap = new Empty();
    }

    scope = scope || null;

    if (typeof name === 'string') {
        updater(watcherMap, name, fn, scope);
    }
    else {
        // "name" is a manifest object of watchers

        destroyer = add && new Destroyer(instance);
        scope = name.scope;

        for (let s of Object.keys(name)) {
            if (!Watchable.options[s]) {
                updater(watcherMap, s, name[s], scope, destroyer);
            }
        }
    }

    return destroyer;
}

//----------------------------------------

const descriptors = {};

class Watchable {
    static applyTo (target) {
        Object.defineProperties(target, descriptors);
        target[watchersSym] = null;
    }

    emit (event, ...args) {
        return this.fire(event, ...args);
    }

    fire (event, ...args) {
        let watcherMap = this[watchersSym];
        let watchers = watcherMap && watcherMap[event];
        let ret;

        if (watchers && firingSym in watchers) {
            ++watchers[firingSym];

            for (let entry of watchers) {
                if (call(entry[0], entry[1], args) === STOP) {
                    ret = STOP;
                    break;
                }
            }

            --watchers[firingSym];
        }
        else if (watchers) {
            if (call(watchers[0], watchers[1], args) === STOP) {
                ret = STOP;
            }
        }

        return ret;
    }

    on (name, fn, scope) {
        return update(this, on, name, fn, scope);
    }

    once (name, fn, scope) {
        const me = this;

        function onceFn (...args) {
            update(me, un, name, fn, scope);
            call(fn, scope, args);
        }

        onceFn[actualFnSym] = fn;

        return update(me, on, name, onceFn, scope);
    }

    off (name, fn, scope) {
        return update(this, un, name, fn, scope);
    }

    un (name, fn, scope) {
        return update(this, un, name, fn, scope);
    }
}

let proto = Watchable.prototype;

for (let name of Object.getOwnPropertyNames(proto)) {
    descriptors[name] = Object.getOwnPropertyDescriptor(proto, name);
}

Watchable.options = new Empty({
    scope: true
});

Watchable.STOP = STOP;

module.exports = Watchable;
