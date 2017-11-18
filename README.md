# watchable
[![Coverage Status](https://coveralls.io/repos/github/EpiphanySoft/watchable/badge.svg?branch=master)](https://coveralls.io/github/EpiphanySoft/watchable?branch=master)

An enhanced event firing module similar to `event-emitter`. While `watchable` can be
(almost) a drop-in replacement for `event-emitter`, its goal is to provide a better API
for common tasks and doing more involved work.

For example:

```javascript
    // Listen to 'foo', 'bar' and 'zap' events:
    let token = watchable.on({
        foo () { /* ... */ },
        bar () { /* ... */ },
        zap () { /* ... */ }
    });
    
    // ...
    
    // Now remove all 3 listeners:
    token.destroy();
```

These are just a couple of the API improvements. There are many more... read on!

## Installing

You can install `watchable` from the Nuclear Pizza Machine:

    npm install @epiphanysoft/watchable --save

Or clone from GitHub.

# Usage

You can generally drop in `watchable` as an enhanced `event-emiiter` module:

```javascript
    const watchable = require('@epiphanysoft/watchable');
    
    function MyClass () { /* ... */ }
    
    watchable(MyClass.prototype);
    
    let inst = new MyClass();
    
    // ... use inst.on(), inst.off(), inst.once() and inst.emit()
```
There are some minor differences in how the extra utilities work (such as `pipe`,
`unify`, `all-off` and `has-listeners`).

The `event-emitter` API is based on ES5 "classes", but `watchable` exports a proper ES6
class. Also, as with `event-emitter`, you can just create instances and use them directly. 

## API Summary

A summary of the `Watchable` API:

 - ES6 base class
 - Configurable instances
 - Listener methods (not just functions)
 - Add/Remove multiple event listeners in one call
 - Dynamic scope resolution
 - Notification when adding first listener to an event
 - Notification when removing last listener to an event
 - Flexible event relaying

## Watchable Base Class

The `Watchable` class is a proper ES6 class from which you can derive:

```javascript
    const { Watchable } = require('@epiphanysoft/watchable');
    
    class MyClass extends Watchable {
        constructor () {
            super();
            //...
        }
    }
    
    let inst = new MyClass();
    let handler = x => console.log(x);
    
    inst.on('foo', handler);
    
    inst.fire('foo', 42);       // "emit" is an alias for "fire"
    
    inst.un('foo', handler);    // "off" is an alias for "un"
```
The use of `un()` instead of `off()` and `fire()` instead of `emit()` is a matter of
preference since both are supported. 

## Configurable Instance

The `Watchable` class can also be created and configured directly:

```javascript
    const { Watchable } = require('@epiphanysoft/watchable');
    
    let inst = new Watchable({
        // configs go here (see below)
    });

    let handler = x => console.log(x);
    
    inst.on('foo', handler);
    
    inst.fire('foo', 42);       // "emit" is an alias for "fire"
    
    inst.un('foo', handler);    // "off" is an alias for "un"
```

The config object passed to the `constructor` will be explained as the individual properties
are explored below.

## Listener Methods

When using classes, listener functions are inconvenient so `watchable` also supports
listener methods:

```javascript
    class MyClass extends Watchable {
        method () {
            //...
            this.fire('foo');
        }
    }
    
    class MyWatcher {
        constructor () {
            this.prefix = '[watcher]';
        }
        
        onFoo (a) {
            console.log(this.prefix, a);
        }
    }
    
    let watchable = new MyClass();
    let watcher = new MyWatcher();

    // NO:
    watchable.on('foo', watcher.onFoo.bind(watcher));

    // YES:
    watchable.on('foo', 'onFoo', watcher);
```
To remove a listener method you must supply the same instance:

```javascript
    watchable.un('foo', 'onFoo', watcher);
```

## Multiple Listeners

Listening to multiple events from an object is a common need, so `watchable` has made
this simple:

```javascript
    // listen to "foo" and "bar" events:
    watchable.on({
        foo () {
            //...
        },
        
        bar () {
            //...
        }
    });
```

The object passed to `on()` is called a "listener manifest". That same object can be
passed to `un()` to remove all of the listeners just added, but there is an easier way:

```javascript
    let token = watchable.on({
        foo () {
            //...
        },
        
        bar () {
            //...
        }
    });
    
    // ...
    
    token.destroy();
```

By destroying the returned token, all of the corresponding listeners will be removed.

The same applies to listener methods:

```javascript
    let token = watchable.on({
        foo: 'onFoo',
        bar: 'onBar',
        
        this: watcher
    });

    //...

    token.destroy();
```

The special key `this` in the listener manifest is understood to be the target object
of the listener methods.

A listener manifest can contain a mixture of method names and functions, but it is
generally best to use a consistent form (at least on a per-call basis).

There is also the `unAll` method which removes all listeners from a watchable instance:

```javascript
    watchable.unAll();
```

## Scope Resolution

When using listener methods, it can be convenient to have a default or named scope.

Consider these two cases:

```javascript
    watchable.on({
        foo: 'onFoo',
        bar: 'onBar'
    });

    watchable.on({
        foo: 'onFoo',
        bar: 'onBar',
        
        this: 'parent'
    });
```

To enable the above, the watchable instance must implement `resolveListenerScope`:

```javascript
    class MyClass extends Watchable {
        //...

        resolveListenerScope (scope) {
            return (scope === 'parent') ? this.parent : this;
        }
    }
    
    // Or using an instance:
    
    let watchable = new Watchable({
        resolveScope (scope) {
            //...
        }
    });
```

When using an instance in the second part above, the `resolveScope` property of the config
object is used to set the `resolveListenerScope` method on the watchable instance.

The full parameter list passed to `resolveListenerScope` is as below:

 - `scope`: The value of `this` on the listener manifest (if any).
 - `fn`: The handler function or method name (e.g., `'onFoo'`).
 - `listener`: The internal object tracking the `on()` request.

The `listener` argument is an `Array` that holds those values needed by the `watchable`
mechanism. The object can be useful to the `resolveListenerScope` method for holding
cached results on behalf of this particular listener. The `resolveListenerScope` method,
however, should not do any of the following with the `listeners` object:
 
 - Add or remove array elements.
 - Change any of the array element values.
 - Depend on any of the array element values.
 - Overwrite any of the array prototype methods.

Basically, `watchable` treats the `listeners` as the array it is and so long as that view
onto the object is preserved and handled as read-only, the `resolveListenerScope`
implementor is free to place expando properties on the same object for its own benefit.

## Listener Detection and Notification

Some expensive actions can be avoided using the `hasListeners` method:

```javascript
    if (watchable.hasListeners('change')) {
        //... expensive stuff

        watchable.fire('change');
    }
```

Setting up to fire some events (say file-system observations) can come at a cost. In
these cases it is helpful to know when listeners are added or removed so that these
expensive setups can be delayed or avoided as well as cleaned up when no longer needed.

```javascript
    // When using the base class:
    class MyClass extends Watchable {
        //...

        onEventWatch (event) {
            // ... event had no listeners and now has one ...
        }
        
        onEventUnwatch (event) {
            // ... event had one listener and now has none ...
        }
    }

    // When creating an instance:
    let watchable = new Watchable({
        onWatch (event) {
            // ... event had no listeners and now has one ...
        },
        
        onUnwatch (event) {
            // ... event had one listener and now has none ...
        }
    });
```

The `onEventWatch` and `onEventUnwatch` methods are optional and will be called if they
are implemented.

When configuring a `Watchable` instance, the `onWatch` and `onUnwatch` properties of the
config object set the `onEventWatch` and `onEventUnwatch` methods, respectively.

## Relaying Events

When relaying one event between watchable instances, there is always the manual solution:

```javascript
    let watchable1 = new Watchable();
    let watchable2 = new Watchable();
    
    watchable1.on({
        foo (...args) {
            watchable2.fire('foo', ...args);
        }
    });
```

To relay all events fired by `watchable1`, however, requires a different approach. The
solution provided by `watchable` is an event relayer:

```javascript
    const relayEvents = require('@epiphanysoft/watchable/relay');
```

The above `require` returns a function that can be used to create event relayers but it
also enables the latent `relayEvents` method which is already defined on all watchable
objects.

These are equivalent:

```javascript
    relayEvents(watchable1, watchable2);
    
    watchable1.relayEvents(watchable2);
```

They both create an event relayer and register it with `watchable1`. The second form is
generally preferred since most of the operations provided by `watchable` are instance
methods. Basically, as long as some module issues a `require('.../watchable/relay)` then
the `relayEvent` method on all watchable instance will work properly.

The valid arguments to `relayEvents` are:

```javascript
    watchable.relayEvents(target);            // relay all events 
    watchable.relayEvents(target, String...); // relay events in arguments
    watchable.relayEvents(target, String[]);  // relay all events in array
    watchable.relayEvents(target, Object);    // specify relay "options"
    watchable.relayEvents(target, Function);  // specify relay function
    watchable.relayEvents(relayer);           // add a relayer instance 
```

Removing a relayer is similar to removing a listener manifest:

```javascript
    let token = watchable1.relayEvents(watchable2);
    
    // ...
    
    token.destroy();
```

To relay multiple events, but not all events:

```javascript
    watchable1.relayEvents(watchable2, 'foo', 'bar');

    // Or
    watchable1.relayEvents(watchable2, [ 'foo', 'bar' ]);
```

The `options` object form accepts an object whose keys are event names. The following is
equivalent to the above:

```javascript
    watchable1.relayEvents(watchable2, {
        foo: true,
        bar: true
    });
```

To relay all events except `bar`:

```javascript
    watchable1.relayEvents(watchable2, {
        '*': true,
        bar: false
    });
```

The special `'*'` pseudo event is used to change the default mapping of events not given
in the `options` object.

The values in the `options` object can be used to rename or transform individual events.

To relay `foo` without modification but rename the `bar` event to `barish`:

```javascript
    watchable1.relayEvents(watchable2, {
        foo: true,
        bar: 'barish'
    });
```

To instead transform the `bar` event:

```javascript
    watchable1.relayEvents(watchable2, {
        foo: true,
        
        bar (event, args) {
            return watchable2.fire('barish', ...args);
        }
    });
```

To relay all events and only transform `bar`:

```javascript
    watchable1.relayEvents(watchable2, {
        '*': true,
        
        bar (event, args) {
            return watchable2.fire('barish', ...args);
        }
    });
```

To transform all fired events, you can specify a relay function:

```javascript
    watchable1.relayEvents(null, (event, args) => {
        return watchable2.fire(event, ...args);
    });
```

The `null` argument is required to differentiate this case from a watchable class (which
is just a constructor function). Further, the relayer function does not have to be an `=>`
function:

```javascript
    function relayer (event, args) {
        return this.target.fire(event, ...args);
    }
    
    watchable1.relayEvents(watchable2, relayer);
    watchable1.relayEvents(watchable3, relayer);
```

In this case, `this` in the `relayer` function refers to the relayer instance that is
created to hold the `target` of the relay.

For maximum flexibility, a custom relayer class can be written and an instance passed as
the first and only parameter to `relayEvents`:

```javascript
    const { Relayer } = require('@epiphanysoft/watchable/relay');

    class MyRelayer extends Relayer {
        constructor (target) {
            super();
            this.target = target;
        }
        
        relay (event, args) {
            //...
        }
    }

    watchable1.relayEvents(new MyRelayer(watchable2));
```

In this case, `watchable1` will call the `relay()` method for all events it fires. The
`relay` method can then decide the particulars. All of the features described above can
be leveraged by calling `super.relay()` as long as the `constructor` passes the `options`
object to its `super()`.

## Utility Methods

The `watchable` module provides several helper functions that are directly exported. These
are mostly to mimic the `event-emitter` API since many equivalent capabilities are available
as described above.

These methods are:

```javascript
    const { hasListeners, is, unAll } = require('@epiphanysoft/watchable');
    const pipe = require('@epiphanysoft/watchable/pipe');
    const unify = require('@epiphanysoft/watchable/unify');
```

The `hasListeners` and `unAll` methods are also available as instance methods of watchable
objects.

### hasListeners

```javascript
    hasListeners (watchable, event);
```

Returns `true` if the `watchable` instance has one ore more listeners for `event`.

### is

```javascript
    is (candidate);
```

Returns `true` if the `candidate` is a watchable object.

### pipe

```javascript
    pipe (watchable1, watchable2);
```

Relays all events fired on `watchable1` to `watchable2`. This is an `event-emitter` name
for the `relayEvents` method described above:

```javascript
    pipe (watchable1, watchable2) {
        return watchable1.relayEvents(watchable2);
    }
```

### unAll

```javascript
    unAll (watchable);
```

Removes all listeners on the `watchable` instance.

### unify

```javascript
    unify (watchable1, watchable2);
```

This (non-reversibly) connects the listeners of the two watchable instances. This is done
by sharing the listener registrations. This means that listeners registered on one
instance will be in fact be registered on both. This has the effect that which ever of
these instances is used to `fire()` an event, all listeners will be invoked, regardless of
the instance on which they appear to be registered.

To `unify()` multiple watchable instances, it is important to always pass one of the
current group members as the first argument:

```javascript
    // OK
    unify (watchable1, watchable2);
    unify (watchable1, watchable3);

    // BAD
    unify (watchable1, watchable2);
    unify (watchable3, watchable2);
```

This is because preference is given to the first watchable object when merging.

# Extending Watchable

For all of its features, `watchable` is rather small so there is room for enhancement by
other modules.

To facilitate such enhancements, the entire Mocha test suite is exported to allow such
modules to verify compliance with the full `watchable` interface contract:

```javascript
    const { Watchable } = require('@epiphanysoft/watchable');

    class MyWatchable extends Watchable {
    }

    //---

    const watchableTestSuite = require('@epiphanysoft/watchable/test/suite');

    describe('MyWatchable', function () {
        watchableTestSuite(MyWatchable);
    });
```

# License

[MIT](./LICENSE)
