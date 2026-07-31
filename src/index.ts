import { getInput, setFailed } from '@actions/core';
import { Installer } from './installer';

async function run() {
    const version = getInput('gauge-version');
    const plugins = getInput('gauge-plugins');
    const token = getInput('github-token');
    let installer = new Installer(version, plugins, token);
    await installer.install();
}

run().catch(error => setFailed(error.message));
