"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitUntil = waitUntil;
exports.waitUtilAsync = waitUtilAsync;
function waitUntil(condition, callback, interval = 100, timeout = 10000) {
    const start = Date.now();
    const intervalId = setInterval(() => {
        if (condition()) {
            clearInterval(intervalId);
            callback();
        }
        else if (Date.now() - start > timeout) {
            clearInterval(intervalId);
        }
    }, interval);
}
function waitUtilAsync(condition, interval = 100, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const _condition = () => {
            try {
                return condition();
            }
            catch (e) {
                ztoolkit.log(e);
                return false;
            }
        };
        const intervalId = setInterval(() => {
            if (_condition()) {
                clearInterval(intervalId);
                resolve();
            }
            else if (Date.now() - start > timeout) {
                clearInterval(intervalId);
                reject();
            }
        }, interval);
    });
}
