import { getInput, setFailed } from '@actions/core';
import { Installer } from './installer';

try {
    const version = getInput('gauge-version');
    const plugins = getInput('gauge-plugins');
    let installer = new Installer(version, plugins);
    installer.install();
} catch (error) {
    setFailed(error.message);
}