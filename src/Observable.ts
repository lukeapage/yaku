import _ from "./_";
import genIterator from "./genIterator";

export interface Emit {
    (value?: any): Promise<any> | any;
}

/**
 * Create a composable observable object.
 * Promise can't resolve multiple times, this function makes it possible, so
 * that you can easily map, filter and even back pressure events in a promise way.
 * For real world example: [Double Click Demo](https://jsbin.com/niwuti/edit?html,js,output).
 * @version_added v0.7.2
 * @param {Function} executor `(emit) ->` It's optional.
 * @return {Observable}
 * @example
 * ```js
 * var Observable = require("yaku/lib/Observable");
 * var linear = new Observable();
 *
 * var x = 0;
 * setInterval(linear.emit, 1000, x++);
 *
 * // Wait for a moment then emit the value.
 * var quad = linear.subscribe(async x => {
 *     await sleep(2000);
 *     return x * x;
 * });
 *
 * var another = linear.subscribe(x => -x);
 *
 * quad.subscribe(
 *     value => { console.log(value); },
 *     reason => { console.error(reason); }
 * );
 *
 * // Emit error
 * linear.emit(Promise.reject(new Error("reason")));
 *
 * // Unsubscribe a observable.
 * quad.unsubscribe();
 *
 * // Unsubscribe all subscribers.
 * linear.subscribers = [];
 * ```
 * @example
 * Use it with DOM.
 * ```js
 * var filter = fn => v => fn(v) ? v : new Promise(() => {});
 *
 * var keyup = new Observable((emit) => {
 *     document.querySelector('input').onkeyup = emit;
 * });
 *
 * var keyupText = keyup.subscribe(e => e.target.value);
 *
 * // Now we only get the input when the text length is greater than 3.
 * var keyupTextGT3 = keyupText.subscribe(filter(text => text.length > 3));
 *
 * keyupTextGT3.subscribe(v => console.log(v));
 * ```
 */
class Observable {

    constructor (executor?) {
        this.subscribers = [];
        executor && executor(this.emit.bind(this));
    };

    /**
     * Emit a value.
     * @param  {Any} value If you want to emit a plain error, you should
     * emit a rejected promise, such as `emit(Promise.reject(new Error('my error')))`,
     * so that the event will go to `onError` callback.
     */
    emit (val?) {
        let i = 0, len = this.subscribers.length, subscriber;
        while (i < len) {
            subscriber = this.subscribers[i++];
            _.Promise.resolve(val).then(
                subscriber._onEmit,
                subscriber._onError
            ).then(
                subscriber.emit,
                subscriber._nextErr
            );
        }
    }

    /**
     * The publisher observable of this.
     * @type {Observable}
     */
    publisher: Observable;

    /**
     * All the subscribers subscribed this observable.
     * @type {Array}
     */
    subscribers: Observable[];

    /**
     * It will create a new Observable, like promise.
     * @param  {Function} onEmit
     * @param  {Function} onError
     * @return {Observable}
     */
    subscribe (onEmit: Emit, onError: Emit) {
        let self = this, subscriber = new Observable();
        subscriber._onEmit = onEmit;
        subscriber._onError = onError;

        subscriber._nextErr = function (reason) {
            subscriber.emit(_.Promise.reject(reason));
        };

        subscriber.publisher = self;
        self.subscribers.push(subscriber);

        return subscriber;
    }

    /**
     * Unsubscribe this.
     */
    unsubscribe () {
        let publisher = this.publisher;
        publisher && publisher.subscribers.splice(publisher.subscribers.indexOf(this), 1);
    }

    _onEmit: Emit;
    _onError: Emit;
    _nextErr: Emit;

    /**
     * Merge multiple observables into one.
     * @version_added 0.9.6
     * @param  {Iterable} iterable
     * @return {Observable}
     * @example
     * ```js
     * var Observable = require("yaku/lib/Observable");
     * var sleep = require("yaku/lib/sleep");
     *
     * var src = new Observable(emit => setInterval(emit, 1000, 0));
     *
     * var a = src.subscribe(v => v + 1; });
     * var b = src.subscribe((v) => sleep(10, v + 2));
     *
     * var out = Observable.merge([a, b]);
     *
     * out.subscribe((v) => {
     *     console.log(v);
     * })
     * ```
     */
    static merge (iterable: Iterable<any> | any[]) {
        let iter = genIterator(iterable);
        return new Observable(function (emit) {
            let item;

            function onError (e) {
                emit(_.Promise.reject(e));
            }

            while (!(item = iter.next()).done) {
                item.value.subscribe(emit, onError);
            }
        });
    };

}

export default Observable;