import { addPath, info } from "@actions/core";
import { exec } from "@actions/exec";
import { mkdirP } from "@actions/io";
import { cacheDir, downloadTool, extractZip, find } from '@actions/tool-cache';
import { statSync } from 'fs';
import { join, normalize } from 'path';
import { valid } from "semver";
import { HttpClient } from 'typed-rest-client/HttpClient';


export class Installer {
	private readonly _plugins: Array<string>;
	private readonly _version: string;
	constructor(version: string, plugins: string) {
		this._version = version;
		this._plugins = this.getPlugins(plugins);
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
		info('Downloading gauge from Github releases');
		const downloadInfo = await this.getDownloadInfo();
		let toolPath = find('gauge', downloadInfo.version);
		if (toolPath) {
			info(`Tool found in cache ${toolPath}`);
		} else {
			info(`Tool not found in cache. Download tool from url: ${downloadInfo.url}`);
			let gaugeBin = await downloadTool(downloadInfo.url);
			info(`Downloaded file: ${gaugeBin}`);
			let tempDir: string = join(process.env['RUNNER_TEMP'] || '',
				'temp_' + Math.floor(Math.random() * 2000000000));
			await this.unzipGaugeDownload(gaugeBin, tempDir);
			info(`gauge extracted to ${tempDir}`);
			info(`caching directory containing version ${downloadInfo.version}`);
			toolPath = await cacheDir(tempDir, 'gauge', downloadInfo.version);
		}
		info(`adding gauge to path: ${toolPath}`);
		addPath(toolPath);
	}

	private async installFromSource() {
		let gaugeDir: string = join(process.env['RUNNER_TEMP'] || '',
			'temp_' + Math.floor(Math.random() * 2000000000), 'gauge');
		exec('git', ['clone', 'https://github.com/getgauge/gauge', gaugeDir])
		process.chdir(gaugeDir);
		exec('go', ['run', join('build', 'make.go')])
		let toolPath = await cacheDir(join(gaugeDir, 'deploy', 'gauge'), 'gauge', 'master');
		addPath(toolPath);
	}

	private async installPlugins() {
		for (const plugin of this._plugins) {
			try {
				await exec('gauge', ['install', plugin]);
			} catch (error) {
				error(`Failed to install gauge plugin ${plugin}. Reason: ${error}`)
			}
		}
	}

	private async unzipGaugeDownload(repoRoot: string, destinationFolder: string) {
		info(`unzip download ${repoRoot}`);
		await mkdirP(destinationFolder);

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
		if (this._version) {
			info(`Download version = ${this._version}`);
			let validVersion = valid(this._version);
			if (!validVersion) {
				throw new Error(`No valid download found for version ${this._version}. Check https://github.com/github/hub/releases for a list of valid releases`);
			}
			return {
				url: `https://github.com/getgauge/gauge/releases/download/v${this._version}/gauge-${this._version}-${platform}.x86_64.zip`,
				version: this._version
			} as DownloadInfo;
		} else {
			info('Downloading latest release because no version selected');
			let http: HttpClient = new HttpClient('setup-gauge');
			let releaseJson = await (await http.get('https://api.github.com/repos/getgauge/gauge/releases/latest')).readBody();
			let releasesInfo = JSON.parse(releaseJson);
			info(`latest version = ${releasesInfo.tag_name}`);
			let latestVersion = releasesInfo.tag_name.substring(1);
			return {
				url: `https://github.com/getgauge/gauge/releases/download/v${latestVersion}/gauge-${latestVersion}-${platform}.x86_64.zip`,
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