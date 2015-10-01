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
    //set bluetooth capable
    [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.hasBT = true;"];
    //set bluetoothLE capable
    [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.hasBTLE = true;"];
    
    // Create CoreBluetooth manager
    self.bluetoothManager = [[CBCentralManager alloc]
                             initWithDelegate: self
                             queue: dispatch_get_main_queue()
                             options: @{CBCentralManagerOptionShowPowerAlertKey: @(NO)}];
    
    // set the initial state
    [self centralManagerDidUpdateState: self.bluetoothManager];
}

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    if([central state] == CBCentralManagerStatePoweredOn) {
        NSLog(@"Bluetooth was enabled");
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.BTenabled = true;"];
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.fireWindowEvent('BluetoothStatus.enabled');"];
    } else if([central state] == CBCentralManagerStatePoweredOff) {
        NSLog(@"Bluetooth was disabled");
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.BTenabled = false;"];
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.fireWindowEvent('BluetoothStatus.disabled');"];
    } else if([central state] == CBCentralManagerStateUnsupported) {
        NSLog(@"Bluetooth LE is not supported");
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.hasBTLE = false;"];
    } else if([central state] == CBCentralManagerStateUnauthorized) {
        NSLog(@"use of Bluetooth is not authorized");
        [self.webView stringByEvaluatingJavaScriptFromString:@"cordova.plugins.BluetoothStatus.iosAuthorized = false;"];
    }
}


@end
