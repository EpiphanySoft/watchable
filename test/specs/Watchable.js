'use strict';

const expect = require('assertly').expect;
const Watchable = require('../../Watchable.js');

const STOP = Watchable.STOP;

class Foo {}
Watchable.applyTo(Foo.prototype);

function defineSuite (T, name) {
    describe(name, function () {
        beforeEach(function () {
            this.obj = new T();
        });

        describe('basics', function () {
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
        });
    });
}

defineSuite(Watchable, 'Watchable');
defineSuite(Foo, 'Watchable.applyTo');
