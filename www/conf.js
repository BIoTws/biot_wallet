/*jslint node: true */
"use strict";
exports.port = null;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = true;

exports.storage = 'sqlite';

// TOR is recommended. Uncomment the next two lines to enable it
//exports.socksHost = '127.0.0.1';
//exports.socksPort = 9050;

exports.hub = 'byteball.org/bb-test';
exports.deviceName = 'Bot example';
exports.permanent_pairing_secret = '*'; // * allows to pair with any code, the code is passed as 2nd param to the pairing event handler
exports.control_addresses = [''];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';

exports.bIgnoreUnpairRequests = true;
exports.bSingleAddress = false;
exports.bStaticChangeAddress = true;
exports.KEYS_FILENAME = 'keys.json';


exports.minChannelTimeoutInSecond = 600;
exports.maxChannelTimeoutInSecond = 1000;
exports.defaultTimeoutInSecond = 600;

exports.unconfirmedAmountsLimitsByAssetOrChannel = {
	"base" : {
		max_unconfirmed_by_asset : 50000,
		max_unconfirmed_by_channel : 50000,
		minimum_time_in_second : 1
	}
}

exports.enabledReceivers = ['obyte-messenger'];
