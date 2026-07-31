import { getInput, setFailed } from '@actions/core';
import { Installer } from './installer';

try {
    const version = getInput('gauge-version');
    const plugins = getInput('gauge-plugins');
    const token = getInput('github-token');
    let installer = new Installer(version, plugins, token);
    installer.install();
} catch (error) {
    setFailed(error.message);
}