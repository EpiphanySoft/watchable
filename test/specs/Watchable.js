'use strict';

const expect = require('assertly').expect;
const Watchable = require('../../Watchable.js');

describe('Watchable', function () {
    beforeEach(function () {
        this.obj = new Watchable();
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

            this.obj.fire('foo', 42);

            expect(args).to.equal([ 'a=42', 'b=42' ]);
            expect(that1).to.be(scope1);
            expect(that2).to.be(scope2);
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
    });
});
