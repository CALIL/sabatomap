# Cordova Bluetooth status plugin

[![NPM](https://nodei.co/npm/cordova-plugin-bluetooth-status.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/cordova-plugin-bluetooth-status/)

Cordova Bluetooth status is a Cordova plugin allowing to check for Bluetooth adapter status.
The plugin currently offers the following features:

- check for Bluetooth capability
- check for Bluetooth LE capability
- check if use of Bluetooth is authorized (iOS only)
- monitor/check Bluetooth enabled/disabled state
- force Bluetooth activation (Android only)
- prompt the user to enable the Bluetooth (Android only)

# Currently supported platforms

- Android
- iOS

# Installation

    cordova plugin add cordova-plugin-bluetooth-status

# Usage 

Initialize the plugin with the `cordova.plugins.BluetoothStatus.initPlugin()` method. Otherwise, the BT adapter state may not be correctly populated until the next time adapter is switched off/on. 

# Documentation

This plugin exports its methods and properties on `cordova.plugins.BluetoothStatus`.

## Properties

### BluetoothStatus.hasBT (Boolean variable)

Variable storing the presence of a Bluetooth device

### BluetoothStatus.hasBTLE (Boolean variable)

Variable storing the presence of a Bluetooth LE device

### BluetoothStatus.BTenabled (Boolean variable)

Variable storing the state of the Bluetooth adapter (enabled or not)

### BluetoothStatus.iosAuthorized (Boolean variable) \[iOS only\]

Variable storing the authorization to use the Bluetooth adapter on iOS

## Methods

### BluetoothStatus.initPlugin()

Initialize the plugin and populate the initial state of the Bluetooth adapter

    cordova.plugins.BluetoothStatus.initPlugin();

### BluetoothStatus.enableBT() \[Android only\]

Activate the Bluetooth without prompting the user:

    cordova.plugins.BluetoothStatus.enableBT();

### BluetoothStatus.promptForBT() \[Android only\]

Prompt the user to activate the Bluetooth:

    cordova.plugins.BluetoothStatus.promptForBT();

## Events

These events are fired on the `window` object.

### 'BluetoothStatus.enabled'

This event is triggered when the Bluetooth adapter gets enabled.

    window.addEventListener('BluetoothStatus.enabled', function() {
        console.log('Bluetooth has been enabled');
    });

### 'BluetoothStatus.disabled'

This event is triggered when the Bluetooth adapter gets disabled.

    window.addEventListener('BluetoothStatus.disabled', function() {
        console.log('Bluetooth has been disabled');
    });

## Changelog

### v1.0.4: 
- correct bugs for iOS9+ where initial BT adapter state was not correctly gathered 

### v1.0.3:
- correct some build errors for older Android versions
