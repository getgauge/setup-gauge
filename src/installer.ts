import { addPath, debug } from "@actions/core";
import { exec } from "@actions/exec";
import { cacheDir, downloadTool, extractZip, find } from '@actions/tool-cache';
import { statSync, mkdirSync } from 'node:fs';
import { join, normalize } from 'node:path';
import process from 'node:process';
import { valid } from "semver";


export class Installer {
	private readonly _plugins: Array<string>;
	private readonly _version: string;
	private readonly _token: string;
	private readonly gauge_repo_url: string = 'https://github.com/getgauge/gauge';
	constructor(version: string, plugins: string, token: string) {
		this._version = version;
		this._plugins = this.getPlugins(plugins);
		this._token = token;
	}

	public async install() {
		if (this._version.trim() === 'master') {
			await this.installFromSource();
		} else {
			await this.installReleasedVersion();
		}
		await this.installPlugins();
	}

	private async installReleasedVersion() {
		debug('Downloading gauge from Github releases');
		const downloadInfo = await this.getDownloadInfo();
		let toolPath = find('gauge', downloadInfo.version);
		if (toolPath) {
			debug(`Tool found in cache ${toolPath}`);
		} else {
			debug(`Tool not found in cache. Download tool from url: ${downloadInfo.url}`);
			let gaugeBin = await downloadTool(downloadInfo.url);
			debug(`Downloaded file: ${gaugeBin}`);
			let tempDir: string = join(process.env['RUNNER_TEMP'] || '',
				'temp_' + Math.floor(Math.random() * 2000000000));
			await this.unzipGaugeDownload(gaugeBin, tempDir);
			debug(`gauge extracted to ${tempDir}`);
			debug(`caching directory containing version ${downloadInfo.version}`);
			toolPath = await cacheDir(tempDir, 'gauge', downloadInfo.version);
		}
		debug(`adding gauge to path: ${toolPath}`);
		addPath(toolPath);
	}

	private async installFromSource() {
		let gaugeDir: string = join(process.env['RUNNER_TEMP'] || '',
			'temp_' + Math.floor(Math.random() * 2000000000), 'gauge');
		await exec('git', ['clone', '--depth=1', this.gauge_repo_url, gaugeDir, ])
		process.chdir(gaugeDir);
		await exec('go', ['run', join('build', 'make.go')])
		let toolPath = await cacheDir(join(gaugeDir, 'bin', `${this.getPlatform()}_${this.getExecutableArchitecture()}`), 'gauge', 'master');
		addPath(toolPath);
	}

	private async installPlugins() {
		for (const plugin of this._plugins) {
			await exec('gauge', ['install', plugin]);
		}
	}

	private async unzipGaugeDownload(repoRoot: string, destinationFolder: string) {
		debug(`unzip download ${repoRoot}`);
		mkdirSync(destinationFolder, { recursive: true });

		const file = normalize(repoRoot);
		const stats = statSync(file);
		if (!stats) {
			throw new Error(`Failed to extract ${file} - it doesn't exist`);
		} else if (stats.isDirectory()) {
			throw new Error(`Failed to extract ${file} - it is a directory`);
		} if (stats.isFile()) {
			await extractZip(file, destinationFolder);
		} else {
			throw new Error(`file argument ${file} is not a file`);
		}
	}

	private async getDownloadInfo(): Promise<DownloadInfo> {
		let platform = this.getPlatform();
		let architecture = this.getDownloadArchitecture();
		if (this._version) {
			debug(`Download version = ${this._version}`);
			let validVersion = valid(this._version);
			if (!validVersion) {
				throw new Error(`No valid download found for version ${this._version}.` +
					`Check https://github.com/getgauge/gauge/releases for a list of valid releases`);
			}
			return {
				url: `${this.gauge_repo_url}/releases/download/v${this._version}/gauge-${this._version}-${platform}.${architecture}.zip`,
				version: this._version
			} as DownloadInfo;
		} else {
			debug('Downloading latest release because no version selected');
			let headers: { [key: string]: string } = { 'User-Agent': 'setup-gauge' };
			if (this._token) {
				headers['Authorization'] = `Bearer ${this._token}`;
			}
			let response = await fetch('https://api.github.com/repos/getgauge/gauge/releases/latest', { headers });
			if (!response.ok) {
				throw new Error(`Failed to fetch latest gauge release: ${response.status} ${response.statusText}`);
			}
			let releasesInfo = await response.json() as { tag_name: string };
			debug(`latest version = ${releasesInfo.tag_name}`);
			let latestVersion = releasesInfo.tag_name.substring(1);
			return {
				url: `${this.gauge_repo_url}/releases/download/v${latestVersion}/gauge-${latestVersion}-${platform}.${architecture}.zip`,
				version: latestVersion
			} as DownloadInfo;
		}
	}

	private getPlatform() {
		switch (process.platform) {
			case 'win32':
				return 'windows';
			case 'darwin':
				return 'darwin';
			default:
				return 'linux'
		}
	}

	private getExecutableArchitecture() {
		// Matches the GOARCH naming used by gauge's build output dir (bin/{os}_{arch}).
		switch (process.arch) {
			case 'x64':
				return 'amd64';
			case 'arm64':
				return 'arm64';
			default:
				throw new Error(`Unsupported architecture: ${process.arch}`);
		}
	}

	private getDownloadArchitecture() {
		// Matches the suffixes used by gauge release assets (gauge-<version>-<os>.<arch>.zip).
		switch (process.arch) {
			case 'x64':
				return 'x86_64';
			case 'arm64':
				return 'arm64';
			default:
				throw new Error(`Unsupported architecture: ${process.arch}`);
		}
	}

	private getPlugins(plugins: string): string[] {
		if (!plugins) {
			return [];
		}
		return plugins.split(",").map(p => p.trim());
	}
}


export interface DownloadInfo {
	url: string;
	version: string;
}
