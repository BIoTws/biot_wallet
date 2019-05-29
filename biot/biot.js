const conf = require('ocore/conf');
const validation = require('ocore/validation_utils');
const objectHash = require('ocore/object_hash');
const eventBus = require('ocore/event_bus');
const db = require('ocore/db');
const storage = require('ocore/storage');
const lconf = require('./conf');
for (let k in lconf) {
	conf[k] = lconf[k];
}

window.stepInit = 'waiting';
window.objectHash = objectHash;
window.eventBus = eventBus;
document.addEventListener("deviceready", onDeviceReady, false);

async function onDeviceReady() {
	const core = require('biot-core');
	const ChannelsManager = require('biot-core/lib/ChannelsManager');
	
	window.InitializeBIoT = async function () {
		let init = await core.init('1029384756');
		if (init.split && init.split(' ').length % 3 === 0) {
			window.stepInit = 'ok';
			window.seed = init;
			const device = require('ocore/device');
			window.myDeviceAddress = device.getMyDeviceAddress();
		} else if (init === 'Please set device name') {
			window.stepInit = 'errorDeviceName';
		} else {
			window.stepInit = 'error';
		}
	};
	
	await InitializeBIoT();
	let network = require('ocore/network');
	let light_attestations = require('./light_attestations');
	window.biot = {core, db, storage, network, light_attestations};
	window.ChannelsManager = ChannelsManager;
	
	function getQR(cb) {
		// @ts-ignore
		QRScanner.prepare(onDone); // show the prompt
		
		function onDone(err, status) {
			if (err) {
				cb(true);
			}
			if (status.authorized) {
				// @ts-ignore
				QRScanner.scan(displayContents);
				
				function displayContents(err, text) {
					if (err) {
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
	
	function hideQR(cb) {
		QRScanner.destroy(function (status) {
			cb();
		});
	}
	
	window.getQR = getQR;
	window.hideQR = hideQR;
	window.OBValidation = validation;
}