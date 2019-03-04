const conf = require('ocore/conf');
const validation = require('ocore/validation_utils');
const objectHash = require('ocore/object_hash');
const eventBus = require('ocore/event_bus');
const lconf = require('./conf');
for (let k in lconf) {
	conf[k] = lconf[k];
}

document.addEventListener("deviceready", onDeviceReady, false);

async function onDeviceReady() {
	const core = require('biot-core');
	const ChannelsManager = require('biot-core/lib/ChannelsManager');
	
	console.error(await core.init('1029384756'));
	window.biot = {core};
	window.objectHash = objectHash;
	window.eventBus = eventBus;
	window.ChannelsManager = ChannelsManager;
	
	const device = require('ocore/device');
	window.myDeviceAddress = device.getMyDeviceAddress();
	
	function getQR(cb) {
		// @ts-ignore
		QRScanner.prepare(onDone); // show the prompt
		
		function onDone(err, status){
			if (err) {
				cb(true);
			}
			if (status.authorized) {
				// @ts-ignore
				QRScanner.scan(displayContents);
				
				function displayContents(err, text){
					if(err){
						cb(true)
					} else {
						cb(null, text);
					}
				}
				// @ts-ignore
				QRScanner.show();
			} else if (status.denied) {
			
			} else {
			
			}
		}
	}
	
	function hideQR(cb){
		QRScanner.destroy(function(status){
			cb();
		});
	}
	window.getQR = getQR;
	window.hideQR = hideQR;
	window.OBValidation = validation;
}