'use strict';

const fs = require('fs');
const cp = require('child_process');

const MIN_INTERVAL = 1000;

function ScheduledScript(opts) {
    opts = opts || { };
    this.script = opts.script || null;
    this.period = opts.period || 10;
    this.args = opts.args || [ ];
    this.env = opts.env || { };
    this.timer = null;
    this.running = false;
    this.last = null;

    let stat = fs.statSync(this.script);

    if (!stat.isFile()) {
        throw new Error(`script is not a file: ${this.script}`);
    }
}

const stepDate = (date, period) => {
    const next = new Date(date);
    next.setSeconds(next.getSeconds() + period);
    next.setMilliseconds(0);
    next.setSeconds(Math.ceil(next.getSeconds() / period) * period);
    return next;
};

ScheduledScript.prototype.enqueue = function () {
    if (this.timer !== null || this.running) { return; }

    let next = stepDate(this.last || new Date(), this.period);
    this.last = next;

    if (isNaN(next)) {
        console.error('Calculating next execution time failed');
        return;
    }

    this.timer = setTimeout(() => {
        this.timer = null;
        this.running = true;
        this.execute();
    }, Math.max(MIN_INTERVAL, next.getTime() - Date.now()));
};

ScheduledScript.prototype.execute = function () {
    let timeout = null;

    const promise = new Promise((resolve, reject) => {
        const proc = cp.spawn(this.script, this.args, {
            env: this.env,
            stdio: 'pipe'
        });

        const cleanup = err => {
            proc.kill('SIGKILL');
            reject(err);
        };

        proc.on('error', cleanup);
        proc.on('exit', (code, signal) => {
            if (code === 0) { resolve(); }
            reject(new Error(`Process exited ${code} ${signal}`));
        });

        proc.stdout.on('data', chunk => {
            console.log('STDOUT:', chunk.toString());
        });
        proc.stderr.on('data', chunk => {
            console.log('STDERR:', chunk.toString());
        });

        timeout = setTimeout(() => {
            timeout = null;
            cleanup(new Error('Execution timeout'));
        }, 10000);
    });

    promise.catch(err => {
        console.log('Spawn error:');
        console.error(err);
    }).then(() => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        this.running = false;
        this.enqueue();
    });
};


module.exports = ScheduledScript;