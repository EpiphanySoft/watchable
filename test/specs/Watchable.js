'use strict';

const expect = require('assertly').expect;
const Watchable = require('../../Watchable.js');

const STOP = Watchable.STOP;

function defineSuite (T) {
    let K = 0;

    beforeEach(function () {
        this.obj = new T();
        this.K = ++K;
    });

    describe('basics', function () {
        it('should be recognized by Watchable.is()', function () {
            expect(Watchable.is(this.obj)).to.be(true);
        });

        it('should fire event to no listeners', function () {
            this.obj.fire('foo', 42);
        });

        it('should fire event to one listener', function () {
            let scope = { woot: 'yey' };
            let arg, that;

            this.obj.on('foo', function (a) {
                arg = a;
                that = this;
            }, scope);

            this.obj.fire('foo', 42);

            expect(arg).to.be(42);
            expect(that).to.be(scope);
        });

        it('should fire event to named listener', function () {
            let arg, that;

            let scope = {
                woot: 'yey',
                fn (a) {
                    arg = a;
                    that = this;
                }
            };

            this.obj.on('foo', 'fn', scope);

            this.obj.fire('foo', 42);

            expect(arg).to.be(42);
            expect(that).to.be(scope);
        });

        it('should fire event to one listener w/o scope', function () {
            let arg;
            let that = -1;

            this.obj.on('foo', function (a) {
                arg = a;
                that = this;
            });

            this.obj.fire('foo', 42);

            expect(arg).to.be(42);
            expect(that == null).to.be(true);
        });

        it('should fire event to two listeners', function () {
            let scope1 = { woot: 'yey' };
            let scope2 = { boot: 'jazz' };
            let args = [];
            let that1, that2;

            this.obj.on('foo', function (a) {
                args.push('a=' + a);
                that1 = this;
            }, scope1);

            this.obj.on('foo', function (a) {
                args.push('b=' + a);
                that2 = this;
            }, scope2);

            let ret = this.obj.fire('foo', 42);

            expect(ret).to.be(undefined);
            expect(args).to.equal([ 'a=42', 'b=42' ]);
            expect(that1).to.be(scope1);
            expect(that2).to.be(scope2);
        });

        it('should respect STOP from first of two listeners', function () {
            let args = [];

            this.obj.on('foo', function (a) {
                args.push('a=' + a);
                return STOP;
            });

            this.obj.on('foo', function (a) {
                args.push('b=' + a);
            });

            let ret = this.obj.fire('foo', 42);

            expect(ret === STOP).to.be(true);
        });

        it('should fire event twice to one listener', function () {
            let scope = { woot: 'yey' };
            let args = [];
            let that = [];

            this.obj.on('foo', function (a) {
                args.push('a=' + a);
                that.push(this);
            }, scope);

            this.obj.fire('foo', 42);
            this.obj.fire('foo', 427);

            expect(args).to.equal([ 'a=42', 'a=427' ]);
            expect(that).to.have.length(2);
            expect(that[0]).to.be(scope);
            expect(that[1]).to.be(scope);
        });

        it('should fire event twice to two listeners', function () {
            let scope1 = { woot: 'yey' };
            let scope2 = { boot: 'jazz' };
            let args = [];
            let that = [];

            this.obj.on('foo', function (a) {
                args.push('a=' + a);
                that.push(this);
            }, scope1);

            this.obj.on('foo', function (a) {
                args.push('b=' + a);
                that.push(this);
            }, scope2);

            this.obj.fire('foo', 42);
            this.obj.fire('foo', 427);

            expect(args).to.equal([ 'a=42', 'b=42', 'a=427', 'b=427' ]);
            expect(that.length).to.be(4);
            expect(that[0]).to.be(scope1);
            expect(that[1]).to.be(scope2);
            expect(that[2]).to.be(scope1);
            expect(that[3]).to.be(scope2);
        });

        it('should inform of watcher transitions', function () {
            let unwatching = [];
            let watching = [];
            let f = () => {};
            let f2 = () => {};

            this.obj.onEventWatch = name => watching.push(name);
            this.obj.onEventUnwatch = name => unwatching.push(name);

            expect(this.obj.hasListeners('foo')).to.be(false);

            // 0 --> 1 --> 0
            this.obj.on('foo', f);
            expect(unwatching).to.equal([ ]);
            expect(watching).to.equal([ 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            this.obj.un('foo', f);
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(false);

            // 0 --> 1 --> 2
            this.obj.on('foo', f);
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            this.obj.on('foo', f2);
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            // 2 --> 1 --> 0
            this.obj.un('foo', f);
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            this.obj.un('foo', f2);
            expect(unwatching).to.equal([ 'foo', 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(false);

            // 2 --> 1 --> 0 --> 1
            this.obj.on('foo', f);
            expect(unwatching).to.equal([ 'foo', 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);
        });
    });

    describe('un', function () {
        it('should remove one listener', function () {
            let called = false;

            function fn () {
                called = true;
            }

            this.obj.on('foo', fn);

            this.obj.un('foo', fn, {});  // listener has no scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;

            this.obj.un('foo', fn);
            this.obj.fire('foo');
            expect(called).to.be(false);
        });

        it('should remove a named listener', function () {
            let called = false;

            let scope = {
                fn () {
                    called = true;
                }
            };

            this.obj.on('foo', 'fn', scope);

            this.obj.un('foo', 'fn', {});  // listener has no scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;

            this.obj.un('foo', 'fn');
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;

            this.obj.un('foo', scope.fn);
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;

            this.obj.un('foo', 'fn', scope);
            this.obj.fire('foo');
            expect(called).to.be(false);
        });

        it('should manage multiple listeners', function () {
            let calledA = false;
            let calledB = false;

            function a () {
                calledA = true;
            }
            function b () {
                calledB = true;
            }

            this.obj.on('foo', a);
            this.obj.on('foo', b);

            this.obj.un('foo', a, {});  // listener has no scope
            this.obj.un('foo', b, {});  // listener has no scope
            this.obj.fire('foo');
            expect(calledA).to.be(true);
            expect(calledB).to.be(true);

            calledA = calledB = false;

            this.obj.un('foo', a);
            this.obj.fire('foo');
            expect(calledA).to.be(false);
            expect(calledB).to.be(true);

            calledA = calledB = false;

            this.obj.un('foo', b);
            this.obj.fire('foo');
            expect(calledA).to.be(false);
            expect(calledB).to.be(false);

            calledA = calledB = false;

            this.obj.on('foo', a);
            this.obj.fire('foo');
            expect(calledA).to.be(true);
            expect(calledB).to.be(false);

            calledA = calledB = false;

            this.obj.on('foo', b);
            this.obj.fire('foo');
            expect(calledA).to.be(true);
            expect(calledB).to.be(true);
        });

        it('should remove one listener w/scope', function () {
            let scope = { woot: 'yey' };
            let called = false;

            function fn () {
                called = true;
            }

            this.obj.on('foo', fn, scope);

            this.obj.un('foo', fn, scope);

            this.obj.fire('foo');

            expect(called).to.be(false);
        });

        it('should remove one listener only if scope matches', function () {
            let scope = { woot: 'yey' };
            let called = false;

            function fn () {
                called = true;
            }

            this.obj.on('foo', fn, scope);

            this.obj.un('foo', fn, {});  // wrong scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;

            this.obj.un('foo', fn);  // no scope
            this.obj.fire('foo');
            expect(called).to.be(true);
        });
    });

    describe('once', function () {
        it('should cleanup a once listener', function () {
            let scope = { woot: 'yey' };
            let args = [];
            let that = [];

            this.obj.once('foo', function (a) {
                args.push('a=' + a);
                that.push(this);
            }, scope);

            this.obj.fire('foo', 42);
            this.obj.fire('foo', 427);

            expect(args).to.equal([ 'a=42' ]);
            expect(that.length).to.be(1);
            expect(that[0]).to.be(scope);
        });

        it('should remove one listener', function () {
            let called = false;

            function fn () {
                called = true;
            }

            this.obj.once('foo', fn);
            this.obj.un('foo', fn, {});  // listener has no scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;
            this.obj.once('foo', fn);

            this.obj.un('foo', fn);
            this.obj.fire('foo');
            expect(called).to.be(false);
        });

        it('should remove one listener w/scope', function () {
            let scope = { woot: 'yey' };
            let called = false;

            function fn () {
                called = true;
            }

            this.obj.once('foo', fn, scope);
            this.obj.un('foo', fn, {});  // wrong scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;
            this.obj.once('foo', fn, scope);

            this.obj.un('foo', fn);  // listener has a scope
            this.obj.fire('foo');
            expect(called).to.be(true);

            called = false;
            this.obj.once('foo', fn, scope);

            this.obj.un('foo', fn, scope);
            this.obj.fire('foo');
            expect(called).to.be(false);
        });
    });

    describe('listener manifest', function () {
        it('should fire event to one listener', function () {
            let scope = { woot: 'yey' };
            let arg;

            this.obj.on({
                foo (a) {
                    expect(this).to.be(scope);
                    arg = a;
                },

                scope: scope
            });

            this.obj.fire('foo', 42);

            expect(arg).to.be(42);
        });

        it('should listen for multiple events', function () {
            let scope = { woot: 'yey' };
            let foo = [];
            let bar = [];

            this.obj.on({
                foo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },
                bar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                },

                scope: scope
            });

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 42 ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 427);
            expect(foo).to.equal([ 42 ]);
            expect(bar).to.equal([ 427 ]);
        });

        it('should listen for multiple named events', function () {
            let foo = [];
            let bar = [];

            let scope = {
                woot: 'yey',

                onFoo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },

                onBar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                }
            };

            this.obj.on({
                foo: 'onFoo',
                bar: 'onBar',
                scope: scope
            });

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 42 ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 427);
            expect(foo).to.equal([ 42 ]);
            expect(bar).to.equal([ 427 ]);
        });

        it('should be able un() for one of many evens', function () {
            let scope = { woot: 'yey' };
            let foo = [];
            let bar = [];

            let manifest = {
                foo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },
                bar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                },

                scope: scope
            };

            this.obj.on(manifest);

            this.obj.un('foo', manifest.foo, {}); // wrong scope

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 42 ]);
            expect(bar).to.equal([ ]);

            this.obj.un('foo', manifest.foo); // missing scope

            this.obj.fire('foo', 427);
            expect(foo).to.equal([ 42, 427 ]);
            expect(bar).to.equal([ ]);

            this.obj.un('foo', manifest.foo, scope);

            this.obj.fire('foo', 321);
            expect(foo).to.equal([ 42, 427 ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 123);
            expect(foo).to.equal([ 42, 427 ]);
            expect(bar).to.equal([ 123 ]);
        });

        it('should be able to un() for one named event of many', function () {
            let foo = [];
            let bar = [];

            let scope = {
                woot: 'yey',

                onFoo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },

                onBar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                }
            };

            this.obj.on({
                foo: 'onFoo',
                bar: 'onBar',
                scope: scope
            });

            this.obj.on('foo', v => foo.push('a=' + v));

            this.obj.un('foo', 'onFoo', {}); // wrong scope

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 42, 'a=42' ]);
            expect(bar).to.equal([ ]);

            this.obj.un('foo', 'onFoo'); // missing scope

            this.obj.fire('foo', 427);
            expect(foo).to.equal([ 42, 'a=42', 427, 'a=427' ]);
            expect(bar).to.equal([ ]);

            this.obj.un('foo', 'onFoo', scope);

            this.obj.fire('foo', 321);
            expect(foo).to.equal([ 42, 'a=42', 427, 'a=427', 'a=321' ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 123);
            expect(foo).to.equal([ 42, 'a=42', 427, 'a=427', 'a=321' ]);
            expect(bar).to.equal([ 123 ]);

            this.obj.un('bar', 'onBar', scope);

            this.obj.fire('bar', 123);
            expect(foo).to.equal([ 42, 'a=42', 427, 'a=427', 'a=321' ]);
            expect(bar).to.equal([ 123 ]);
        });

        it('should be able to un() for all named events', function () {
            let foo = [];
            let bar = [];

            let scope = {
                woot: 'yey',

                onFoo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },

                onBar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                }
            };

            this.obj.on({
                foo: 'onFoo',
                bar: 'onBar',
                scope: scope
            });

            this.obj.un({
                foo: 'onFoo',
                bar: 'onBar',
                scope: scope
            });

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 427);
            expect(foo).to.equal([ ]);
            expect(bar).to.equal([ ]);
        });

        it('should remove all listeners on destroy', function () {
            let foo = [];
            let bar = [];

            let token = this.obj.on({
                foo (a) {
                    foo.push(a);
                },
                bar (a) {
                    bar.push(a);
                }
            });

            this.obj.on('foo', v => foo.push('a=' + v));

            token.destroy();

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 'a=42' ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 427);
            expect(foo).to.equal([ 'a=42' ]);
            expect(bar).to.equal([ ]);
        });

        it('should remove all listeners w/scope on destroy', function () {
            let scope = { woot: 'yey' };
            let foo = [];
            let bar = [];

            let token = this.obj.on({
                foo (a) {
                    expect(this).to.be(scope);
                    foo.push(a);
                },
                bar (a) {
                    expect(this).to.be(scope);
                    bar.push(a);
                },

                scope: scope
            });

            this.obj.on('foo', v => foo.push('a=' + v));

            token.destroy();

            this.obj.fire('foo', 42);
            expect(foo).to.equal([ 'a=42' ]);
            expect(bar).to.equal([ ]);

            this.obj.fire('bar', 427);
            expect(foo).to.equal([ 'a=42' ]);
            expect(bar).to.equal([ ]);
        });

        it('should inform of watcher transitions', function () {
            let unwatching = [];
            let watching = [];
            let f = () => {};
            let f2 = () => {};
            let token, token2;

            this.obj.onEventWatch = name => watching.push(name);
            this.obj.onEventUnwatch = name => unwatching.push(name);

            expect(this.obj.hasListeners('foo')).to.be(false);

            // 0 --> 1 --> 0
            token = this.obj.on({ foo: f });
            expect(unwatching).to.equal([ ]);
            expect(watching).to.equal([ 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            token.destroy();
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(false);

            // 0 --> 1 --> 2
            token = this.obj.on({ foo: f });
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            token2 = this.obj.on({ foo: f2 });
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            // 2 --> 1 --> 0
            token.destroy();
            expect(unwatching).to.equal([ 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);

            token2.destroy();
            expect(unwatching).to.equal([ 'foo', 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(false);

            // 2 --> 1 --> 0 --> 1
            this.obj.on({ foo: f });
            expect(unwatching).to.equal([ 'foo', 'foo' ]);
            expect(watching).to.equal([ 'foo', 'foo', 'foo' ]);
            expect(this.obj.hasListeners('foo')).to.be(true);
        });
    }); // listener manifest

    describe('while firing', function () {
        describe('on', function () {
            it('should only fire event to first solo listener', function () {
                let calledA = false;
                let calledB = false;

                this.obj.on('foo', v => {
                    calledA = v;

                    this.obj.on('foo', v2 => {
                        calledB = v2;
                    });
                });

                this.obj.fire('foo', 42);

                expect(calledA).to.be(42);
                expect(calledB).to.be(false);

                this.obj.fire('foo', 123);

                expect(calledA).to.be(123);
                expect(calledB).to.be(123);
            });

            it('should only fire for initial set of listeners', function () {
                let called = [];

                this.obj.on('foo', v => {
                    called.push('a=' + v);

                    this.obj.on('foo', v2 => {
                        called.push('b=' + v2);
                    });
                });

                this.obj.on('foo', v => {
                    called.push('c=' + v);
                });

                this.obj.fire('foo', 42);

                expect(called).to.equal([ 'a=42', 'c=42' ]);

                this.obj.fire('foo', 123);

                expect(called).to.equal([ 'a=42', 'c=42', 'a=123', 'c=123', 'b=123' ]);
            });
        });

        describe('un', function () {
            it('should be able to remove solo listener', function () {
                let called = false;

                let fn = () => {
                    called = true;
                    this.obj.un('foo', fn);
                };

                this.obj.on('foo', fn);

                this.obj.fire('foo');
                expect(called).to.be(true);

                called = false;

                this.obj.fire('foo');
                expect(called).to.be(false);
            });

            it('should be able to remove first listener of multiple', function () {
                let calledA = false;
                let calledB = false;

                let fnA = () => {
                    calledA = true;
                    this.obj.un('foo', fnA);
                };
                let fnB = () => {
                    calledB = true;
                };

                this.obj.on('foo', fnA);
                this.obj.on('foo', fnB);

                this.obj.fire('foo');
                expect(calledA).to.be(true);
                expect(calledB).to.be(true);

                calledA = calledB = false;

                this.obj.fire('foo');
                expect(calledA).to.be(false);
                expect(calledB).to.be(true);
            });

            it('should be able to remove second listener of multiple', function () {
                let calledA = false;
                let calledB = false;
                let calledC = false;

                let fnA = () => {
                    calledA = true;
                };
                let fnB = () => {
                    calledB = true;
                    this.obj.un('foo', fnB);
                };
                let fnC = () => {
                    calledC = true;
                };

                this.obj.on('foo', fnA);
                this.obj.on('foo', fnB);
                this.obj.on('foo', fnC);

                this.obj.fire('foo');
                expect(calledA).to.be(true);
                expect(calledB).to.be(true);
                expect(calledC).to.be(true);

                calledA = calledB = calledC = false;

                this.obj.fire('foo');
                expect(calledA).to.be(true);
                expect(calledB).to.be(false);
                expect(calledC).to.be(true);
            });

            it('should be able to remove next listener for next firing', function () {
                let calledA = false;
                let calledB = false;
                let calledC = false;

                let fnA = () => {
                    calledA = true;
                };
                let fnB = () => {
                    calledB = true;
                    this.obj.un('foo', fnC);
                };
                let fnC = () => {
                    calledC = true;
                };

                this.obj.on('foo', fnA);
                this.obj.on('foo', fnB);
                this.obj.on('foo', fnC);

                this.obj.fire('foo');
                expect(calledA).to.be(true);
                expect(calledB).to.be(true);
                expect(calledC).to.be(true);

                calledA = calledB = calledC = false;

                this.obj.fire('foo');
                expect(calledA).to.be(true);
                expect(calledB).to.be(true);
                expect(calledC).to.be(false);
            });
        });

        describe('destroy token', function () {
            it('should destroy current listener token', function () {
                let scope = { woot: 'yey' };
                let called = [];

                let token = this.obj.on({
                    foo (v) {
                        token.destroy();

                        expect(this).to.be(scope);
                        called.push('a=' + v);
                    },

                    scope: scope
                });

                this.obj.fire('foo', 42);

                expect(called).to.equal([ 'a=42' ]);

                this.obj.fire('foo', 321);

                expect(called).to.equal([ 'a=42' ]);
            });

            it('should destroy current listener token with multiple', function () {
                let scope1 = { woot: 'yey' };
                let scope2 = { zoot: 'zoot' };
                let called = [];

                let token = this.obj.on({
                    foo (v) {
                        token.destroy();

                        expect(this).to.be(scope1);
                        called.push('a=' + v);
                    },

                    scope: scope1
                });

                this.obj.on({
                    foo (v) {
                        expect(this).to.be(scope2);
                        called.push('b=' + v);
                    },

                    scope: scope2
                });

                this.obj.fire('foo', 42);

                expect(called).to.equal([ 'a=42', 'b=42' ]);

                this.obj.fire('foo', 321);

                expect(called).to.equal([ 'a=42', 'b=42', 'b=321' ]);
            });

            it('should destroy next listener token for next firing', function () {
                let scope1 = { woot: 'yey' };
                let scope2 = { zoot: 'zoot' };
                let called = [];
                let token;

                this.obj.on({
                    foo (v) {
                        token.destroy();

                        expect(this).to.be(scope1);
                        called.push('a=' + v);
                    },

                    scope: scope1
                });

                token = this.obj.on({
                    foo (v) {
                        expect(this).to.be(scope2);
                        called.push('b=' + v);
                    },

                    scope: scope2
                });

                this.obj.fire('foo', 42);

                expect(called).to.equal([ 'a=42', 'b=42' ]);

                this.obj.fire('foo', 321);

                expect(called).to.equal([ 'a=42', 'b=42', 'a=321' ]);
            });
        });
    });  // while firing

    describe('unify', function () {
        let calls;

        beforeEach(function () {
            this.obj2 = new T();
            calls = [];

            this.obj.on('o-z', this.f1a = () => { calls.push('f1a') });
            this.obj.on('o-o', this.f1b = () => { calls.push('f1b') });
            this.obj.on('o-m', this.f1c = () => { calls.push('f1c') });

            this.obj.on('m-z', this.f1d = () => { calls.push('f1d') });
            this.obj.on('m-z', this.f1e = () => { calls.push('f1e') });
            this.obj.on('m-o', this.f1f = () => { calls.push('f1f') });
            this.obj.on('m-o', this.f1g = () => { calls.push('f1g') });
            this.obj.on('m-m', this.f1h = () => { calls.push('f1h') });
            this.obj.on('m-m', this.f1i = () => { calls.push('f1i') });

            this.obj2.on('z-o', this.f2a = () => { calls.push('f2a') });
            this.obj2.on('z-m', this.f2b = () => { calls.push('f2b') });
            this.obj2.on('z-m', this.f2c = () => { calls.push('f2c') });

            this.obj2.on('o-o', this.f2d = () => { calls.push('f2d') });
            this.obj2.on('o-m', this.f2e = () => { calls.push('f2e') });
            this.obj2.on('o-m', this.f2f = () => { calls.push('f2f') });

            this.obj2.on('m-o', this.f2g = () => { calls.push('f2g') });
            this.obj2.on('m-m', this.f2h = () => { calls.push('f2h') });
            this.obj2.on('m-m', this.f2i = () => { calls.push('f2i') });

            Watchable.unify(this.obj, this.obj2);
        });

        describe('from zero listeners', function () {
            describe('add one listener', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('z-o')).to.be(true);
                    expect(this.obj2.hasListeners('z-o')).to.be(true);

                    expect(this.obj[Watchable.symbols.watchers] ===
                           this.obj2[Watchable.symbols.watchers]).to.be(true);

                    this.obj.fire('z-o');
                    expect(calls).to.equal([ 'f2a' ]);

                    this.obj2.fire('z-o');
                    expect(calls).to.equal([ 'f2a', 'f2a' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('z-o', this.f2a);

                        expect(this.obj.hasListeners('z-o')).to.be(false);
                        expect(this.obj2.hasListeners('z-o')).to.be(false);

                        this.obj.fire('z-o');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('z-o');
                        expect(calls).to.equal([ ]);
                    });
                });
            });

            describe('add multiple listeners', function () {
                it('should merge', function () {
                    it('should merge', function () {
                        expect(this.obj.hasListeners('z-m')).to.be(true);
                        expect(this.obj2.hasListeners('z-m')).to.be(true);

                        this.obj.fire('z-m');
                        expect(calls).to.equal([ 'f2b', 'f2c' ]);

                        this.obj2.fire('z-m');
                        expect(calls).to.equal([ 'f2b', 'f2c', 'f2b', 'f2c' ]);
                    });
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('z-m', this.f2b);

                        expect(this.obj.hasListeners('z-m')).to.be(true);
                        expect(this.obj2.hasListeners('z-m')).to.be(true);

                        this.obj.fire('z-m');
                        expect(calls).to.equal([ 'f2c' ]);

                        this.obj2.fire('z-m');
                        expect(calls).to.equal([ 'f2c', 'f2c' ]);

                        calls = [];

                        this[name].un('z-m', this.f2c);
                        expect(this.obj.hasListeners('z-m')).to.be(false);
                        expect(this.obj2.hasListeners('z-m')).to.be(false);

                        this.obj.fire('z-m');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('z-m');
                        expect(calls).to.equal([ ]);
                    });
                });
            });
        }); // from zero listeners

        describe('from one listener', function () {
            describe('add no listeners', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('o-z')).to.be(true);
                    expect(this.obj2.hasListeners('o-z')).to.be(true);

                    this.obj.fire('o-z');
                    expect(calls).to.equal([ 'f1a' ]);

                    this.obj2.fire('o-z');
                    expect(calls).to.equal([ 'f1a', 'f1a' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('o-z', this.f1a);

                        expect(this.obj.hasListeners('o-z')).to.be(false);
                        expect(this.obj2.hasListeners('o-z')).to.be(false);

                        this.obj.fire('o-z');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('o-z');
                        expect(calls).to.equal([ ]);
                    });
                });
            });

            describe('add one listener', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('o-o')).to.be(true);
                    expect(this.obj2.hasListeners('o-o')).to.be(true);

                    this.obj.fire('o-o');
                    expect(calls).to.equal([ 'f1b', 'f2d' ]);

                    this.obj2.fire('o-o');
                    expect(calls).to.equal([ 'f1b', 'f2d', 'f1b', 'f2d' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('o-o', this.f1b);

                        expect(this.obj.hasListeners('o-o')).to.be(true);
                        expect(this.obj2.hasListeners('o-o')).to.be(true);

                        this.obj.fire('o-o');
                        expect(calls).to.equal([ 'f2d' ]);

                        this.obj2.fire('o-o');
                        expect(calls).to.equal([ 'f2d', 'f2d' ]);

                        calls = [];

                        this[name].un('o-o', this.f2d);
                        expect(this.obj.hasListeners('o-o')).to.be(false);
                        expect(this.obj2.hasListeners('o-o')).to.be(false);

                        this.obj.fire('o-o');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('o-o');
                        expect(calls).to.equal([ ]);
                    });
                });
            });

            describe('add multiple listeners', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('o-m')).to.be(true);
                    expect(this.obj2.hasListeners('o-m')).to.be(true);

                    this.obj.fire('o-m');
                    expect(calls).to.equal([ 'f1c', 'f2e', 'f2f' ]);

                    this.obj2.fire('o-m');
                    expect(calls).to.equal([ 'f1c', 'f2e', 'f2f', 'f1c', 'f2e', 'f2f' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('o-m', this.f1c);

                        expect(this.obj.hasListeners('o-m')).to.be(true);
                        expect(this.obj2.hasListeners('o-m')).to.be(true);

                        this.obj.fire('o-m');
                        expect(calls).to.equal([ 'f2e', 'f2f' ]);

                        this.obj2.fire('o-m');
                        expect(calls).to.equal([ 'f2e', 'f2f', 'f2e', 'f2f' ]);

                        calls = [];

                        this[name].un('o-m', this.f2e);
                        expect(this.obj.hasListeners('o-m')).to.be(true);
                        expect(this.obj2.hasListeners('o-m')).to.be(true);

                        this.obj.fire('o-m');
                        expect(calls).to.equal([ 'f2f' ]);

                        this.obj2.fire('o-m');
                        expect(calls).to.equal([ 'f2f', 'f2f' ]);

                        calls = [];

                        this[name].un('o-m', this.f2f);
                        expect(this.obj.hasListeners('o-m')).to.be(false);
                        expect(this.obj2.hasListeners('o-m')).to.be(false);

                        this.obj.fire('o-m');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('o-m');
                        expect(calls).to.equal([ ]);
                    });
                });
            });
        });  // from one listener

        describe('from multiple listeners', function () {
            describe('add no listeners', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('m-z')).to.be(true);
                    expect(this.obj2.hasListeners('m-z')).to.be(true);

                    this.obj.fire('m-z');
                    expect(calls).to.equal([ 'f1d', 'f1e' ]);

                    this.obj2.fire('m-z');
                    expect(calls).to.equal([ 'f1d', 'f1e', 'f1d', 'f1e' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('m-z', this.f1d);

                        expect(this.obj.hasListeners('m-z')).to.be(true);
                        expect(this.obj2.hasListeners('m-z')).to.be(true);

                        this.obj.fire('m-z');
                        expect(calls).to.equal([ 'f1e' ]);

                        this.obj2.fire('m-z');
                        expect(calls).to.equal([ 'f1e', 'f1e' ]);

                        calls = [];

                        this[name].un('m-z', this.f1e);
                        expect(this.obj.hasListeners('m-z')).to.be(false);
                        expect(this.obj2.hasListeners('m-z')).to.be(false);

                        this.obj.fire('m-z');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('m-z');
                        expect(calls).to.equal([ ]);
                    });
                });
            });

            describe('add one listener', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('m-o')).to.be(true);
                    expect(this.obj2.hasListeners('m-o')).to.be(true);

                    this.obj.fire('m-o');
                    expect(calls).to.equal([ 'f1f', 'f1g', 'f2g' ]);

                    this.obj2.fire('m-o');
                    expect(calls).to.equal([ 'f1f', 'f1g', 'f2g', 'f1f', 'f1g', 'f2g' ]);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('m-o', this.f1f);

                        expect(this.obj.hasListeners('m-o')).to.be(true);
                        expect(this.obj2.hasListeners('m-o')).to.be(true);

                        this.obj.fire('m-o');
                        expect(calls).to.equal([ 'f1g', 'f2g' ]);

                        this.obj2.fire('m-o');
                        expect(calls).to.equal([ 'f1g', 'f2g', 'f1g', 'f2g' ]);

                        calls = [];

                        this[name].un('m-o', this.f1g);
                        expect(this.obj.hasListeners('m-o')).to.be(true);
                        expect(this.obj2.hasListeners('m-o')).to.be(true);

                        this.obj.fire('m-o');
                        expect(calls).to.equal([ 'f2g' ]);

                        this.obj2.fire('m-o');
                        expect(calls).to.equal([ 'f2g', 'f2g' ]);

                        calls = [];

                        this[name].un('m-o', this.f2g);
                        expect(this.obj.hasListeners('m-o')).to.be(false);
                        expect(this.obj2.hasListeners('m-o')).to.be(false);

                        this.obj.fire('m-o');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('m-o');
                        expect(calls).to.equal([ ]);
                    });
                });
            });

            describe('add multiple listeners', function () {
                it('should merge', function () {
                    expect(this.obj.hasListeners('m-m')).to.be(true);
                    expect(this.obj2.hasListeners('m-m')).to.be(true);

                    this.obj.fire('m-m');
                    expect(calls).to.equal([ 'f1h', 'f1i', 'f2h', 'f2i' ]);

                    this.obj2.fire('m-m');
                    expect(calls).to.equal([ 'f1h', 'f1i', 'f2h', 'f2i',
                        'f1h', 'f1i', 'f2h', 'f2i']);
                });

                ['obj', 'obj2'].forEach(name => {
                    it(`should remove from ${name}`, function () {
                        this[name].un('m-m', this.f1h);

                        expect(this.obj.hasListeners('m-m')).to.be(true);
                        expect(this.obj2.hasListeners('m-m')).to.be(true);

                        this.obj.fire('m-m');
                        expect(calls).to.equal([ 'f1i', 'f2h', 'f2i' ]);

                        this.obj2.fire('m-m');
                        expect(calls).to.equal([ 'f1i', 'f2h', 'f2i', 'f1i', 'f2h', 'f2i' ]);

                        calls = [];

                        this[name].un('m-m', this.f1i);
                        expect(this.obj.hasListeners('m-m')).to.be(true);
                        expect(this.obj2.hasListeners('m-m')).to.be(true);

                        this.obj.fire('m-m');
                        expect(calls).to.equal([ 'f2h', 'f2i' ]);

                        this.obj2.fire('m-m');
                        expect(calls).to.equal([ 'f2h', 'f2i', 'f2h', 'f2i' ]);

                        calls = [];

                        this[name].un('m-m', this.f2h);
                        expect(this.obj.hasListeners('m-m')).to.be(true);
                        expect(this.obj2.hasListeners('m-m')).to.be(true);

                        this.obj.fire('m-m');
                        expect(calls).to.equal([ 'f2i' ]);

                        this.obj2.fire('m-m');
                        expect(calls).to.equal([ 'f2i', 'f2i' ]);

                        calls = [];

                        this[name].un('m-m', this.f2i);
                        expect(this.obj.hasListeners('m-m')).to.be(false);
                        expect(this.obj2.hasListeners('m-m')).to.be(false);

                        this.obj.fire('m-m');
                        expect(calls).to.equal([ ]);

                        this.obj2.fire('m-m');
                        expect(calls).to.equal([ ]);
                    });
                });
            });
        }); // from multiple listeners
    }); // unify

    describe('unify listener manifest', function () {
        let calls;

        beforeEach(function () {
            this.obj2 = new T();
            calls = [];

            this.token = this.obj2.on({
                foo () { calls.push('foo') },
                bar () { calls.push('bar') }
            });

            Watchable.unify(this.obj, this.obj2);
        });

        it('should merge', function () {
            expect(this.obj.hasListeners('foo')).to.be(true);
            expect(this.obj.hasListeners('bar')).to.be(true);

            expect(this.obj2.hasListeners('foo')).to.be(true);
            expect(this.obj2.hasListeners('bar')).to.be(true);

            this.obj.fire('foo');
            expect(calls).to.equal([ 'foo' ]);

            this.obj2.fire('foo');
            expect(calls).to.equal([ 'foo', 'foo' ]);

            this.obj.fire('bar');
            expect(calls).to.equal([ 'foo', 'foo', 'bar' ]);

            this.obj2.fire('bar');
            expect(calls).to.equal([ 'foo', 'foo', 'bar', 'bar' ]);
        });

        it('should cleanup on token destroy', function () {
            expect(this.obj.hasListeners('foo')).to.be(true);
            expect(this.obj.hasListeners('bar')).to.be(true);

            expect(this.obj2.hasListeners('foo')).to.be(true);
            expect(this.obj2.hasListeners('bar')).to.be(true);

            this.token.destroy();

            expect(this.obj.hasListeners('foo')).to.be(false);
            expect(this.obj.hasListeners('bar')).to.be(false);

            expect(this.obj2.hasListeners('foo')).to.be(false);
            expect(this.obj2.hasListeners('bar')).to.be(false);

            this.obj.fire('foo');
            expect(calls).to.equal([ ]);

            this.obj2.fire('foo');
            expect(calls).to.equal([ ]);

            this.obj.fire('bar');
            expect(calls).to.equal([ ]);

            this.obj2.fire('bar');
            expect(calls).to.equal([ ]);
        });
    });
}

describe('Watchable', function () {
    defineSuite(Watchable);
});

describe('Watchable.applyTo', function () {
    class Foo {}

    Watchable.applyTo(Foo.prototype);

    defineSuite(Foo);
});
