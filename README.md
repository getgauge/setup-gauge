# Setup Gauge

This github action allows for installation of the [Gauge CLI](gauge.org) to be used in your actions pipeline.

It has support for Linux, MacOS and Windows runners.


## Inputs

### `gauge-version`

**Required** The version needs to be installed.

Default: [`latest`](https://github.com/getgauge/gauge/releases/latest).

### `gauge-plugins`

**Required** The plugins needs to be installed.

Default: Nothing


## Example usage

### Install latest
```
uses: bugdiver/setup-gauge@master

```

### Install a particular version
```
uses: bugdiver/setup-gauge@master
with:
    gauge-version: '1.0.7'
```

### Install plugins with gauge

```
uses: bugdiver/setup-gauge@master
with:
    gauge-version: '1.0.7'
    gauge-plugins: java, html-report
```

### Install gauge from source

```
uses: bugdiver/setup-gauge@master
with:
    gauge-version: master
    gauge-plugins: java, html-report
```
