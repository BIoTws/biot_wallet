import * as React from 'react';

import "../styles/style.scss";
import { WalletsList } from "./WalletsList";
import { Wallet } from "./WalletPage";
import { ReceivePage } from "./ReceivePage";
import { SendPage } from "./SendPage";
import { Apps } from "./Apps";
import { Menu } from "./Menu";
import getBiot from "../getBiot";
import { EventEmitter } from './EventEmitter';

let events = new EventEmitter();

// @ts-ignore
let obEvents = window.eventBus;

interface IPage {
	page: string;
}

export class QRScanner extends React.Component<any, IPage> {

	componentDidMount () {
		obEvents.on('backbutton', this.backKeyClick);

		let self = this;
		// @ts-ignore
		getQR((err, text) => {
			console.error('text QR: ', text);
			if(err) {
				alert('Error');
				self.props.setPage('index');
			} else {
				let json;
				try {
					json = JSON.parse(text);
				} catch (e) {
					json = null;
				}

				if(text.indexOf('obyte:') !== -1 || text.indexOf('obyte-tn:') !== -1) {
					let r = text.match(/^obyte(|-tn):(.+)/);
					if(r && r[2]) {
						// @ts-ignore
						if(OBValidation.isValidAddress(r[2])) {
							let paramsObj = {};
							let resMatch = text.match(/[a-z]+=[0-9]+/);
							if(resMatch) {
								resMatch.forEach(v => {
									let splitV = v.split('=');
									paramsObj[splitV[0]] = parseInt(splitV[1]);
								});
							}
							self.props.setPage('setWallet', null, 'sendTransaction', {
								address: r[2],
								amount: paramsObj['amount'] || 0
							});
							// @ts-ignore
						} else {
							if(r[2]) {
								let matches = r[2].match(/^([\w\/+]+)@([\w.:\/-]+)#([\w\/+-]+)$/);
								if(matches) {
									getBiot(async biot => {
										try {
											await biot.core.addCorrespondent(r[2]);
											self.props.setPage('apps');
										} catch (e) {
											alert(e);
										}
									});
								}
							}
						}
					}
				} else if(json && json.app && json.app === 'biot') {
					if(json.type && json.type === 'channel') {
						if(json.step && json.step === 'init') {
							if(!json.pairingCode || !json.myAmount || !json.peerAmount || !json.age
								|| !json.channelType || (json.channelType && json.channelType !== 'pft')
								|| !json.rate || !json.count || !json.interval) {
								alert('Error_ch');
								self.props.setPage('index');
							}

							//@ts-ignore
							window.plugins.toast.showLongBottom('You were offered to open the channel');
							self.props.setPage('setWallet', null, 'reqChannel', {
								pairingCode: json.pairingCode,
								myAmount: json.peerAmount,
								peerAmount: json.myAmount,
								age: json.age,
								channelType: json.channelType,
								rate: json.rate,
								count: json.count,
								interval: json.interval,
								messageOnOpening: json.messageOnOpening || null
							});
						} else {
							alert('Error_ch');
							self.props.setPage('index');
						}
					} else {
						alert('Error');
						self.props.setPage('index');
					}
				} else {
					alert('Error');
					self.props.setPage('index');
				}
			}
		});
		// @ts-ignore
		document.body.style.backgroundColor = 'rgba(0,0,0,0)';
	}

	componentWillUnmount () {
		// @ts-ignore
		obEvents.removeListener('backbutton', this.backKeyClick);
		// @ts-ignore
		hideQR(function () {
			// @ts-ignore
			setTimeout(function () {
				document.body.style.backgroundColor = '';
			}, 50);
		});
	}

	backKeyClick = () => {
		this.props.setPage('index')
	};

	render () {
		return (
			<div className={'top-bar'}>
				<text className={'qrScanner-title'}>QR Scanner</text>
				<a onClick={() => this.props.setPage('index')} className={'back-button'}> </a>
			</div>
		)
	}
}

interface ISetWallet {
	nextPage: String,
	params: {},
	setPage: (page, walletId, nextPage?, params?) => void
}

export class SetWallet extends React.Component<ISetWallet, any> {

	state = {wallets: []};

	componentDidMount () {
		getBiot(async (biot: any) => {
			let wallets: any = [];
			let walletsInDb = await biot.core.getWallets();
			let lWN = localStorage.getItem('assocWalletToName');
			let assocWalletToName = {};
			if(lWN) assocWalletToName = JSON.parse(lWN);

			for (let i = 0; i < walletsInDb.length; i++) {
				let wallet = walletsInDb[i];
				let balance = await biot.core.getWalletBalance(wallet);
				wallets = [...wallets, {
					id: wallet,
					name: assocWalletToName[wallet] ? assocWalletToName[wallet] : wallet.substr(0, 25) + '...',
					coin: 'Byteball',
					balance: balance.base.stable + balance.base.pending
				}];
			}
			if(wallets.length === 1) {
				console.error(wallets[0]);
				this.props.setPage(this.props.nextPage, wallets[0].id, null, this.props.params)
			} else {
				this.setState({wallets: wallets});
			}
		});
	}

	render () {
		let wallets = this.state.wallets.map((wallet: {id: string, name: string, balance: number, coin: string}) => {
			return (
				<div onClick={() => {
					this.props.setPage(this.props.nextPage, wallet.id, null, this.props.params)
				}} key={wallet.id} className={'wallets-list-body'}>
					<div className={wallet.coin}>
					</div>
					<div className={'wallets-list-body-name'}>{wallet.name}</div>
					<div className={'wallets-list-body-balance'}>{wallet.balance} bytes</div>
				</div>
			);
		});
		return <div>
			<div className={'state-wallets'} style={{paddingTop: '45px'}}>
				{wallets}
			</div>
		</div>
	}
}

export class ReqChannel extends React.Component<{params: any, walletId: string, setPage: (page) => void},
	{wallets: any, profile: any, hiddenProfiles: boolean, profiles: any, hiddenWaiting: boolean}> {
	state = {
		wallets: [],
		profiles: [],
		profile: {address: '', unit: '', object: ''},
		hiddenProfiles: true,
		hiddenWaiting: true
	};

	componentDidMount () {
		this.getProfile = this.getProfile.bind(this);
		this.setProfile = this.setProfile.bind(this);
	}

	openChannel = async (biot, deviceAddress) => {
		// @ts-ignore
		let channelsManager = new ChannelsManager(this.props.walletId);
		console.error('chm', channelsManager);
		// @ts-ignore
		let myDeviceAddressW = window.myDeviceAddress;
		let params = {
			myDeviceAddress: myDeviceAddressW,
			peerDeviceAddress: deviceAddress,
			myAmount: this.props.params.myAmount,
			peerAmount: this.props.params.peerAmount,
			age: this.props.params.age
		};
		if(this.props.params.messageOnOpening) {
			params['messageOnOpening'] = this.props.params.messageOnOpening;
		}
		if(this.props.params.needProfile) {
			params['messageOnOpening'] = {
				address: this.state.profile.address,
				unit: this.state.profile.unit,
				profile: this.state.profile.object
			};
		}
		let channel = channelsManager.newChannel(params);
		let interval;
		channel.events.on('error', error => {
			if(error.type === 'reject') {
				alert('Channel rejected');
				this.props.setPage('index');
			}
			console.error('channelError', error, channel.id);
		});
		channel.events.on('start', async () => {
			this.setState({hiddenWaiting: true});
			console.error('channel start. id:', channel.id);
			let i = 1;
			interval = setInterval(async () => {
				await channel.transfer(this.props.params.rate);
				console.error('info', channel.info());
				i++;
				if(i >= this.props.params.count) {
					clearInterval(interval);
					setImmediate(async () => {
						await channel.closeMutually();
					});
					setTimeout(async () => {
						if(channel.step !== 'mutualClose') {
							await channel.closeOneSide();
						}
					}, 60000);
				}
			}, this.props.params.interval * 1000);
			alert('Channel opened');
			this.props.setPage('index');
			await channel.transfer(this.props.params.rate);
		});
		channel.events.on('changed_step', (step) => {
			if(step === 'mutualClose') clearInterval(interval);
			if(step === 'close') clearInterval(interval);
			console.error('changed_step: ', step, channel.id);
		});
		channel.events.on('new_transfer', async (amount) => {
			console.error('new_transfer: ', amount, channel.id);
		});
		this.setState({hiddenWaiting: false});
		try {
			let i = await channel.init();
			console.error('init', i);
		} catch (e) {
			console.error(e, JSON.stringify(e), e.message);
			if(e.message.indexOf('Insufficient funds') !== -1) {
				alert('Insufficient funds');
			} else {
				alert('Error');
			}
			this.props.setPage('index');
		}
	};

	approve = () => {
		if(this.props.params.needProfile && this.state.profile.address === '') return alert('Please choose profile');
		getBiot(async (biot: any) => {
			let pubKey = this.props.params.pairingCode.match(/^[A-Za-z0-9/=+\-]+/)[0];

			console.error('pubKey', pubKey, this.props.params.pairingCode);
			// @ts-ignore
			let peerDeviceAddress = objectHash.getDeviceAddress(pubKey);
			let listCorrespondents = await biot.core.listCorrespondents();
			console.error(listCorrespondents, peerDeviceAddress);
			if(listCorrespondents.length && listCorrespondents.filter(v => {
				return v.device_address === peerDeviceAddress
			}).length) {
				console.error('!add');
				await this.openChannel(biot, peerDeviceAddress);
			} else {
				console.error('add');
				await biot.core.addCorrespondent(this.props.params.pairingCode);
				console.error('adddd', peerDeviceAddress, '___', this.props.params.pairingCode);
				console.error(await biot.core.listCorrespondents());
				await this.openChannel(biot, peerDeviceAddress);
			}
		});
	};

	reject = () => {
		this.props.setPage('index');
	};

	async chooseProfile () {
		getBiot(async (biot: any) => {
			let profiles = await biot.core.getProfiles();
			this.setState({hiddenProfiles: false, profiles});
		});
	}

	setProfile (address, unit, object) {
		this.setState({profile: {address, unit, object}, hiddenProfiles: true});
		console.error('set', address, unit, object);
	}

	getProfile () {
		let wallets = this.state.profiles.map((profile: any) => {
			let prf = JSON.parse(profile.object);
			console.error('prf', prf);
			return (
				<div onClick={() => this.setProfile(profile.address, profile.unit, profile.object)} key={profile.unit}
				     className={'wallets-list-body'}>
					<div className={'profiles-list-body-name'}>{prf.name[0] + ' ' + prf.lname[0]}</div>
					<div className={'profiles-list-body-balance'}>{profile.address}</div>
				</div>
			);
		});
		return <div hidden={this.state.hiddenProfiles}>
			<div className={'state-wallets'}>{wallets}</div>
		</div>
	}

	render () {
		console.error('prps', this.props);
		return <div>
			<div className={'plsWaiting'} hidden={this.state.hiddenWaiting}>Please waiting</div>
			{this.getProfile()}
			<div hidden={!this.state.hiddenProfiles}>
				<div className={'top-bar'}>
					<text className={'qrScanner-title'}>Open channel</text>
					<a onClick={() => this.props.setPage('index')} className={'back-button'}> </a>
				</div>
				<div className={'listAddChannel'}>
					<div>You were offered to open the channel</div>
					<div>You will pay: {this.props.params.myAmount}</div>
					<div>Peer will pay: {this.props.params.peerAmount}</div>
					<div>Amount of one payment: {this.props.params.rate} bytes</div>
					<div>Number of payments: {this.props.params.count}</div>
					<div>Payment interval: {this.props.params.interval} sec</div>
					<div>
						<div>Channel closing timeout: {this.props.params.age}</div>
						<div>(longer is safer)</div>
					</div>
					<div>Peer will be added to the contacts list</div>
					<div hidden={!this.props.params.needProfile}>{this.props.params.needProfile ?
						<a id={'choosePr'} onClick={() => this.chooseProfile()}>Choose profile</a> : ''}</div>
					<div className={'chBtns'}>
						<div onClick={() => this.approve()} className={'chApprove'}><a>Approve</a></div>
						<div onClick={() => this.reject()} className={'chReject'}><a>Reject</a></div>
					</div>
				</div>
			</div>
		</div>
	}
}

export class App extends React.Component {
	state = {
		page: 'index',
		walletId: '',
		walletName: '',
		nextPage: '',
		params: {},
		name: '',
		seed: '',
		textSaveName: 'Save name'
	};

	constructor (props) {
		super(props);
		let self = this;

		this.messages = this.messages.bind(this);
		this.objMessages = this.objMessages.bind(this);

		obEvents.on('text', self.messages);
		obEvents.on('object', self.objMessages);
		obEvents.on('backbutton', this.backKeyClick);

		this.chInit();

		events.on('nfc_payment', obj => {
			this.setPage('setWallet', null, 'sendTransaction', {
				address: obj.address,
				amount: obj.amount
			});
		});

		events.on('openURL', url => {
			console.error('open url', url);
			let u = url.match(/^biot:\/\/([a-zA-Z]+)/);
			if(!u || u.length < 2) return;

			let action = u[1];
			let p = url.match(/([a-zA-Z0-9]+=[a-zA-Z0-9]+)/g).map((v) => v.split('='));
			let params = {};
			p.forEach(v => {
				params[v[0]] = v[1];
			});

			if(action === 'transfer') {
				// @ts-ignore
				if(OBValidation.isValidAddress(params['to'])) {
					this.setPage('setWallet', null, 'sendTransaction', {
						address: params['to'],
						amount: parseInt(params['amount']) || 0
					});
				} else {
					alert('Incorrect address');
				}
			}
		});
	}

	chInit = () => {
		//@ts-ignore
		let _stepInit = window.stepInit;
		if(_stepInit) {
			console.error('qweqweqwe', _stepInit);
			if(_stepInit === 'waiting') {
				return setTimeout(this.chInit, 100);
			} else if(_stepInit === 'errorDeviceName') {
				return this.setState({page: 'setName'});
			} else if(_stepInit === 'error') {
				return alert('error');
			}
			let isShownSeed = localStorage.getItem('isShownSeed');
			if(!isShownSeed) {
				localStorage.setItem('isShownSeed', '1');
				//@ts-ignore
				let seed = window.seed;
				this.setState({page: 'showSeed', seed});
			}

			//@ts-ignore
			delete window.seed;
		}
	};

	messages = (from_address, text) => {
		if(this.state.page !== 'apps') {
			let cm = localStorage.getItem('m_' + from_address);
			let messages = cm ? JSON.parse(cm) : [];
			messages.push({text, i: false});
			localStorage.setItem('m_' + from_address, JSON.stringify(messages));
		}
	};

	objMessages = (from_address, object) => {
		if(this.state.page !== 'apps') {
			if(object.type === 'imapp') {
				let ls = localStorage.getItem('listApps');
				let listApps = ls ? JSON.parse(ls) : {};
				listApps[from_address] = true;
				localStorage.setItem('listApps', JSON.stringify(listApps));
			}
		}
	};

	setPage = (page, walletId?, nextPage?, params?) => {
		let walletName = walletId;
		if(walletId) {
			let lWN = localStorage.getItem('assocWalletToName');
			let assocWalletToName = lWN ? JSON.parse(lWN) : {};
			if(assocWalletToName[walletId]) walletName = assocWalletToName[walletId];
		}
		this.setState({page: page, walletId: walletId, nextPage: nextPage || '', params: params || {}, walletName});
	};

	setName = (evt) => {
		this.setState({
			name: evt.target.value
		});
	};

	nowSaveName = false;
	saveName = () => {
		if(!this.nowSaveName) {
			this.nowSaveName = true;
			this.setState({textSaveName: 'Please wait'});
			getBiot(async (biot: any) => {
				await biot.core.setDeviceName(this.state.name);
				//@ts-ignore
				await window.InitializeBIoT();
				this.setState({page: 'index'});
				this.chInit();
			});
		}
	};

	copySeed = () => {
		//@ts-ignore
		window.cordova.plugins.clipboard.copy(this.state.seed);
		//@ts-ignore
		window.plugins.toast.showShortBottom('Seed successfully copied');
		this.setState({page: 'index'});
	};

	backKeyClick = () => {
		if(this.state.page === 'setWallet') {
			this.setState({page: 'index'})
		} else if(this.state.page == 'wallet') {
			this.setState({page: 'index'})
		} else if(this.state.page == 'sendTransaction') {
			this.setState({page: 'wallet'})
		} else if(this.state.page == 'receiveTransaction') {
			this.setState({page: 'wallet'})
		}
	};

	render () {
		if(this.state.page == 'index') {
			return <div className={'app-body'}>
				<WalletsList setPage={this.setPage}/>
				<Menu page={'index'} setPage={this.setPage}/>
			</div>
		} else if(this.state.page === 'setWallet') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Please select the wallet</text>
					<a onClick={() => this.setState({page: 'index'})} className={'back-button'}> </a>
				</div>
				<SetWallet setPage={this.setPage} nextPage={this.state.nextPage} params={this.state.params}/>
			</div>
		} else if(this.state.page === 'setName') {
			return <div className={'app-body'} style={{textAlign: 'center'}}>
				<div className={'name-title'}>What's your name?</div>
				<div><input type={'text'} className={'name-input'} placeholder={'Your name'} onChange={this.setName}/>
				</div>
				<div className={'button-block'}>
					<button onClick={() => this.saveName()} className={'button-send-submit'} type="submit">
						{this.state.textSaveName}
					</button>
				</div>
			</div>
		} else if(this.state.page === 'showSeed') {
			return <div className={'app-body'} style={{textAlign: 'center'}}>
				<div className={'name-title'}>Please save your seed</div>
				<div style={{color: '#fff'}}>{this.state.seed}</div>
				<div className={'button-block'}>
					<button onClick={() => this.copySeed()} className={'button-send-submit'} type="submit">
						Copy seed and close
					</button>
				</div>
			</div>
		} else if(this.state.page === 'reqChannel') {
			return <div><ReqChannel params={this.state.params} walletId={this.state.walletId} setPage={this.setPage}/>
			</div>
		} else if(this.state.page == 'qrScanner') {
			return <div>
				<QRScanner setPage={this.setPage}/>
			</div>
		} else if(this.state.page == 'wallet') {
			return <div>
				<div className={'top-bar'}>
					<text
						className={'wallet-title'}>{
						this.state.walletName.length > 25 ?
							this.state.walletName.substr(0, 25) + '...' :
							this.state.walletName}</text>
					<a onClick={() => this.setState({page: 'index'})} className={'back-button'}> </a>
				</div>
				<div className={'wallet-menu'}>
					<a onClick={() => this.setState({page: 'sendTransaction'})} className={'send-button'}> </a>
					<a onClick={() => this.setState({page: 'receiveTransaction'})} className={'receive-button'}> </a>
				</div>
				<Wallet walletId={this.state.walletId}/>
			</div>
		} else if(this.state.page == 'sendTransaction') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Send</text>
					<a onClick={() => this.setState({page: 'wallet'})} className={'back-button'}> </a>
				</div>
				<SendPage walletId={this.state.walletId} back={() => this.setState({page: 'wallet'})}
				          params={this.state.params}/>
			</div>
		} else if(this.state.page == 'receiveTransaction') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Receive</text>
					<a onClick={() => this.setState({page: 'wallet'})} className={'back-button'}> </a>
				</div>
				<ReceivePage walletId={this.state.walletId}/>
			</div>
		} else if(this.state.page == 'apps') {
			return <div>
				<Apps setPage={this.setPage}/>
			</div>
		}
	}
}

// @ts-ignore
nfc.addNdefListener(
	parseTag,
	function () {
		console.error('nfc ok');
	},
	function () {
		console.error('nfc error');
	}
);
// @ts-ignore
nfc.addMimeTypeListener("text/plain", parseTag,
	function () {
		console.error('nfc ok');
	},
	function () {
		console.error('nfc error');
	}
);

function parseTag (nfcEvent) {
	getBiot((biot: any) => {
		console.error('NFCCWA', nfcEvent);
		let records = nfcEvent.tag.ndefMessage;

		for (let i = 0; i < records.length; i++) {
			// @ts-ignore
			let text = nfc.bytesToString(records[i].payload).substr(3);
			console.error('text nfc', text);
			if(/^biot:/.test(text)) {
				let t = text.substr(5).split('|');
				let amount = parseInt(t[1]);
				// @ts-ignore
				if(OBValidation.isValidAddress(t[0]) && typeof amount === "number") {
					events.emit('nfc_payment', {
						address: t[0],
						amount: amount
					});
				}
			}
		}
	});
}


document.addEventListener("backbutton", onBackKeyDown, false);

function onBackKeyDown () {
	obEvents.emit('backbutton', {});
}

// @ts-ignore
window.handleOpenURL = function (url) {
	setTimeout(function () {
		events.emit('openURL', url);
	}, 0);
};
