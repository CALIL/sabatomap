#import <Foundation/Foundation.h>
#import <Cordova/CDV.h>
#import <CoreBluetooth/CoreBluetooth.h>

@interface BluetoothStatus : CDVPlugin <CBCentralManagerDelegate> {
    
}

@property CBCentralManager* bluetoothManager;

- (void)initPlugin:(CDVInvokedUrlCommand*)command;
- (void)enableBT:(CDVInvokedUrlCommand*)command;
- (void)promptForBT:(CDVInvokedUrlCommand*)command;

@end

@implementation BluetoothStatus

- (void)initPlugin:(CDVInvokedUrlCommand*)command
{
    //set bluetooth capable
    [[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.hasBT = true;"]];
    //set bluetoothLE capable
    [[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.hasBTLE = true;"]];

    // set the initial state
    [self centralManagerDidUpdateState: self.bluetoothManager];
}

- (void)enableBT:(CDVInvokedUrlCommand*)command
{
    //not available for iOS
}

- (void)promptForBT:(CDVInvokedUrlCommand*)command
{
    //not available for iOS
}

- (void)pluginInitialize
{
    // Create CoreBluetooth manager
    self.bluetoothManager = [[CBCentralManager alloc]
                             initWithDelegate: self
                             queue: dispatch_get_main_queue()
                             options: @{CBCentralManagerOptionShowPowerAlertKey: @(NO)}];
}

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    if([central state] == CBCentralManagerStatePoweredOn) {
        NSLog(@"Bluetooth was enabled");
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.BTenabled = true;"]];
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.fireWindowEvent('BluetoothStatus.enabled');"]];
    } else if([central state] == CBCentralManagerStatePoweredOff) {
        NSLog(@"Bluetooth was disabled");
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.BTenabled = false;"]];
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.fireWindowEvent('BluetoothStatus.disabled');"]];
    } else if([central state] == CBCentralManagerStateUnsupported) {
        NSLog(@"Bluetooth LE is not supported");
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.hasBTLE = false;"]];
    } else if([central state] == CBCentralManagerStateUnauthorized) {
        NSLog(@"use of Bluetooth is not authorized");
    	[[self commandDelegate] evalJs:[NSString stringWithFormat:@"cordova.plugins.BluetoothStatus.iosAuthorized = false;"]];
    }
}


@end
