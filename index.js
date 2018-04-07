'use strict';

const PATH = require('path');
const ScheduledScript = require('./scheduled_script');

let config_path = process.argv[2];
if (!/\//.test(config_path)) {
    config_path = PATH.join(__dirname, config_path);
}

if (!config_path) {
    console.error(`Usage: node ${__filename} CONFIG_FILE`);
    process.exit(1);
}

let config;
try {
    config = require(config_path);
} catch (e) {
    console.error(`Invalid config file: ${config_path}: ${e.message}`);
    process.exit(2);
}

for (let opts of config) {
    try {
        let inst = new ScheduledScript(opts);
        inst.enqueue();
    } catch (e) {
        console.error(`Failed to initialize script: ${e.message}`);
        console.error(e.stack);
    }
}
