# Setup Gauge

This github action allows for installation of the [Gauge CLI](https://gauge.org/) to be used in your actions pipeline.

It has support for Linux, MacOS and Windows runners.


## Inputs

### `gauge-version`

**Required** The version needs to be installed.

Default: [`latest`](https://github.com/getgauge/gauge/releases/latest).

### `gauge-plugins`

**Required** The plugins needs to be installed.

Default: Nothing

### `github-token`

**Optional** Token used to authenticate GitHub API requests when looking up gauge releases. Authenticating avoids the low unauthenticated API rate limit that can make release lookups fail intermittently.

The token is only used to read public release metadata from the [`getgauge/gauge`](https://github.com/getgauge/gauge) repository. It does **not** require any permissions or access to your own repositories — any valid token works, including the default one below, and no `permissions:` scopes need to be granted for this action.

Default: [`${{ github.token }}`](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) (the token GitHub Actions provides automatically).


## Example usage

### Install latest
```
uses: getgauge/setup-gauge@master

```

### Install a particular version
```
uses: getgauge/setup-gauge@master
with:
    gauge-version: '1.0.7'
```

### Install plugins with gauge

```
uses: getgauge/setup-gauge@master
with:
    gauge-version: '1.0.7'
    gauge-plugins: java, html-report
```

### Install gauge from source

```
uses: getgauge/setup-gauge@master
with:
    gauge-version: master
    gauge-plugins: java, html-report
```
