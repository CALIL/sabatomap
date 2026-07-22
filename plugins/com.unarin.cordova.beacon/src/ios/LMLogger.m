/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

#import "LMLogger.h"
#import <UserNotifications/UserNotifications.h>

@class CDVLocationManager;
@class AppDelegate;

@implementation LMLogger

- (void) postLocalNotificationWithMessage: (NSString*) alertBody {
    UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
    content.body = alertBody;
    content.sound = [UNNotificationSound defaultSound];
    UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:[[NSUUID UUID] UUIDString]
                                                                          content:content
                                                                          trigger:nil];
    [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request withCompletionHandler:nil];
}

- (void) debugLog: (NSString*) format, ... {

    if (!self.debugLogEnabled) {
        return;
    }
    va_list args;
    va_start(args, format);
    NSString *msg = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);
    
    NSLog(@"%@", msg);
}


- (void) debugNotification: (NSString*) format, ... {
    
    if (!self.debugNotificationsEnabled) {
        return;
    }
    
    va_list args;
    va_start(args, format);
    NSString *alertBody = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);
    
    [self postLocalNotificationWithMessage:alertBody];
}

@end
