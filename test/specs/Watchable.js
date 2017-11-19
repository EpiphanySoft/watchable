'use strict';

const expect = require('assertly').expect;

const makeWatchable = require('../../Watchable.js');

const Watchable = makeWatchable.Watchable;

const defineSuite = require('../suite');

describe('Watchable', function () {
    defineSuite(Watchable);

    describe('configured instance', function () {
        it('should allow resolveScope', function () {
            let calls = [];

            let watcher = {
                onFoo (x) {
                    calls.push('a=' + x);
                }
            };

            let obj = new Watchable({
                resolveScope (scope, fn) {
                    calls.push(`${scope || 'NIL'}#${fn}`);
                    return watcher;
                }
            });

            obj.on('foo', 'onFoo');

            obj.fire('foo', 42);

            expect(calls).to.equal([ 'NIL#onFoo', 'a=42' ]);
        });

        it('should inform listener transitions', function () {
            let calls = [];
            let fn = () => {};

            let obj = new Watchable({
                onWatch (event) {
                    calls.push(`watch(${event})`);
                },
                onUnwatch (event) {
                    calls.push(`unwatch(${event})`);
                }
            });

            obj.on('foo', fn);
            expect(calls).to.equal([ 'watch(foo)' ]);

            obj.un('foo', fn);
            expect(calls).to.equal([ 'watch(foo)', 'unwatch(foo)' ]);
        });
    });
});

describe('extends Watchable', function () {
    class Foo extends Watchable {
        constructor () {
            super();
        }
    }

    makeWatchable(Foo.prototype);

    defineSuite(Foo);
});

describe('Watchable.applyTo', function () {
    class Foo {}

    makeWatchable(Foo.prototype);

    defineSuite(Foo);
});
