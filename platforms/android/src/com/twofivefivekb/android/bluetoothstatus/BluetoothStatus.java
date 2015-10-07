package com.twofivefivekb.android.bluetoothstatus;

import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.util.Log;

public class BluetoothStatus extends CordovaPlugin {
    private static CordovaWebView mwebView;
    private static CordovaInterface mcordova;

    private static final String LOG_TAG = "BluetoothStatus";
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("enableBT")) {
            enableBT();
            return true;
        } else if (action.equals("promptForBT")) {
            promptForBT();
            return true;
        } else if(action.equals("initPlugin")) {
            initPlugin();
            return true;
        }
        return false;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        mcordova.getActivity().unregisterReceiver(mReceiver);
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        mwebView = super.webView;
        mcordova = cordova;

        bluetoothManager = (BluetoothManager) webView.getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        bluetoothAdapter = bluetoothManager.getAdapter();

        // Register for broadcasts on BluetoothAdapter state change
        IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        mcordova.getActivity().registerReceiver(mReceiver, filter);
    }

    private void enableBT() {
        //enable bluetooth without prompting
        if (bluetoothAdapter == null) {
            Log.e(LOG_TAG, "Bluetooth is not supported");
        } else if (!bluetoothAdapter.isEnabled()) {
            bluetoothAdapter.enable();
        }
    }

    private void promptForBT() {
        //prompt user for enabling bluetooth
        Intent enableBTIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
        mcordova.getActivity().startActivity(enableBTIntent);
    }

    private void initPlugin() {
        //test if B supported
        if (bluetoothAdapter == null) {
            Log.e(LOG_TAG, "Bluetooth is not supported");
        } else {
            Log.e(LOG_TAG, "Bluetooth is supported");

            sendJS("javascript:cordova.plugins.BluetoothStatus.hasBT = true;");

            //test if BLE supported
            if (!mcordova.getActivity().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
                Log.e(LOG_TAG, "BluetoothLE is not supported");
            } else {
                Log.e(LOG_TAG, "BluetoothLE is supported");
                sendJS("javascript:cordova.plugins.BluetoothStatus.hasBTLE = true;");
            }

            //test if BT enabled
            if (bluetoothAdapter.isEnabled()) {
                Log.e(LOG_TAG, "Bluetooth is enabled");

                sendJS("javascript:cordova.plugins.BluetoothStatus.BTenabled = true;");
                sendJS("javascript:cordova.fireWindowEvent('BluetoothStatus.enabled');");
            } else {
                Log.e(LOG_TAG, "Bluetooth is not enabled");
            }
        }
    }

    private void sendJS(final String js) {
        mcordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mwebView.loadUrl(js);
            }
        });
    }

    //broadcast receiver for BT intent changes
    private final BroadcastReceiver mReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();

            if (action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)) {
                final int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                switch (state) {
                    case BluetoothAdapter.STATE_OFF:
                        Log.e(LOG_TAG, "Bluetooth was disabled");

                        sendJS("javascript:cordova.plugins.BluetoothStatus.BTenabled = false;");
                        sendJS("javascript:cordova.fireWindowEvent('BluetoothStatus.disabled');");

                        break;
                    case BluetoothAdapter.STATE_ON:
                        Log.e(LOG_TAG, "Bluetooth was enabled");

                        sendJS("javascript:cordova.plugins.BluetoothStatus.BTenabled = true;");
                        sendJS("javascript:cordova.fireWindowEvent('BluetoothStatus.enabled');");

                        break;
                }
            }
        }
    };
}