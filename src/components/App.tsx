import * as React from 'react';

import "../styles/style.scss";
import {WalletsList} from "./WalletsList";
import {Wallet} from "./WalletPage";
import {ReceivePage} from "./ReceivePage";
import {SendPage} from "./SendPage";
import {Apps} from "./Apps";
import {Menu} from "./Menu";
import getBiot from "../getBiot";
import { EventEmitter } from './EventEmitter';
let events = new EventEmitter();

// @ts-ignore
let obEvents = window.eventBus;

interface IPage {
	page: string;
}

export class QRScanner extends React.Component<any, IPage> {

	componentDidMount() {
		obEvents.on('backbutton', this.backKeyClick);

		let self = this;
		// @ts-ignore
		getQR((err, text) => {
			console.error('text QR: ', text);
			if (err) {
				alert('Error');
				self.props.setPage('index');
			} else {
				let json;
				try {
					json = JSON.parse(text);
				} catch (e) {
					json = null;
				}
				if (text.indexOf('obyte:') !== -1 || text.indexOf('obyte-tn:') !== -1) {
					let r = text.match(/^obyte(|-tn):(.+)/);
					if (r && r[2]) {
						// @ts-ignore
						if (OBValidation.isValidAddress(r[2])) {
							let paramsObj = {};
							let resMatch = text.match(/[a-z]+=[0-9]+/);
							if (resMatch) {
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
							if (r[2]) {
								let matches = r[2].match(/^([\w\/+]+)@([\w.:\/-]+)#([\w\/+-]+)$/);
								if (matches) {
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
				} else if (json && json.app && json.app === 'oiot') {
					if (json.type && json.type === 'channel') {
						if (json.step && json.step === 'init') {
							if (!json.pairingCode || !json.deposit) {
								alert('Error_ch');
								self.props.setPage('wallet');
							}

							//@ts-ignore
							window.plugins.toast.showLongBottom('You were offered to open the channel');
							self.props.setPage('reqChannel', null, null, {
								pairingCode: json.pairingCode,
								deposit: json.deposit,
								message: json.message || null
							});
						} else {
							alert('Error_ch');
							self.props.setPage('wallet');
						}
					} else {
						alert('Error');
						self.props.setPage('wallet');
					}
				} else {
					alert('Error');
					self.props.setPage('wallet');
				}
			}
		});
		// @ts-ignore
		document.body.style.backgroundColor = 'rgba(0,0,0,0)';
	}

	componentWillUnmount() {
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
		this.props.setPage('wallet')
	};

	render() {
		return (
			// <div className={'top-bar'}>
			// 	<text className={'qrScanner-title'}>QR Scanner</text>
			// 	<a onClick={() => this.props.setPage('index')} className={'back-button'}> </a>
			// </div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "left",
					fontSize: "21px"
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						background: "#ffffff"
					}}
				>
					<div onClick={() => this.props.setPage('index')} className="topmenu_action">
						<div className="topmenu_action-arrow" />
					</div>
					<div style={{ paddingLeft: 20, width: "100%" }}>QR Scanner</div>
				</div>
				<div className="line" />
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

	componentDidMount() {
		getBiot(async (biot: any) => {
			let wallets: any = [];
			let walletsInDb = await biot.core.getWallets();
			let lWN = localStorage.getItem('assocWalletToName');
			let assocWalletToName = {};
			if (lWN) assocWalletToName = JSON.parse(lWN);

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
			if (wallets.length === 1) {
				console.error(wallets[0]);
				this.props.setPage(this.props.nextPage, wallets[0].id, null, this.props.params)
			} else {
				this.setState({wallets: wallets});
			}
		});
	}

	render() {
		let wallets = this.state.wallets.map((wallet: { id: string, name: string, balance: number, coin: string }) => {
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

export class ReqChannel extends React.Component<any, any> {
	state = {
		wallets: [],
		profiles: [],
		profile: {address: '', unit: '', object: ''},
		hiddenProfiles: true,
		hiddenWaiting: true,
		deviceAddress: ''
	};

	componentDidMount() {
		this.getProfile = this.getProfile.bind(this);
		this.setProfile = this.setProfile.bind(this);
		let pubKey = this.props.params.pairingCode.match(/^[A-Za-z0-9/=+\-]+/)[0];
		// @ts-ignore
		let peerDeviceAddress = objectHash.getDeviceAddress(pubKey);
		this.setState({deviceAddress: peerDeviceAddress})
	}

	openChannel = async () => {
		let self = this;
		let params = this.props.params;
		//@ts-ignore
		let channels = window.channels;
		let prms = {
			salt: true,
			timeout: 600
		};
		channels.createNewChannel(params.pairingCode, params.deposit, prms, function (error, aa_address, unit) {
			console.error('errererserasdfasdf', error, aa_address, unit);
			if (error) {
				alert(error);
				self.props.setPage('wallet');
				return;
			}
			if (params.message) {
				getBiot(biot => {
					biot.core.sendTechMessageToDevice(self.state.deviceAddress, {
						type: 'message_from_channel',
						aa_address: aa_address,
						message: params.message
					});
				});
			}
			localStorage.setItem('peer_' + aa_address, self.state.deviceAddress);
			localStorage.setItem('type_' + aa_address, 'pfr');
			//@ts-ignored
			window.plugins.toast.showLongBottom('Channel successfully opened');
			self.props.setPage('wallet');
		});
		// if (this.props.params.messageOnOpening) {
		// 	params['messageOnOpening'] = this.props.params.messageOnOpening;
		// }
		// if (this.props.params.needProfile) {
		// 	params['messageOnOpening'] = {
		// 		address: this.state.profile.address,
		// 		unit: this.state.profile.unit,
		// 		profile: this.state.profile.object
		// 	};
		// }

	};

	approve = async () => {
		if (this.props.params.needProfile && this.state.profile.address === '') return alert('Please choose profile');
		await this.openChannel();
	};

	reject = () => {
		this.props.setPage('wallet');
	};

	async chooseProfile() {
		getBiot(async (biot: any) => {
			let profiles = await biot.core.getProfiles();
			this.setState({hiddenProfiles: false, profiles});
		});
	}

	setProfile(address, unit, object) {
		this.setState({ profile: { address, unit, object }, hiddenProfiles: true });
		console.error('set', address, unit, object);
	}

	getProfile() {
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

		console.error('prps', this.props);
		return <div>
			<div className={'plsWaiting'} hidden={this.state.hiddenWaiting}>Please waiting</div>
			{this.getProfile()}
			<div hidden={!this.state.hiddenProfiles}>
				<div className={'top-bar'}>
					<text className={'qrScanner-title'}>Open channel</text>
					<a onClick={() => this.props.setPage('wallet')} className={'back-button'}> </a>
				</div>
				<div className={'listAddChannel'}>
					<div>You were offered to open the channel</div>
					<div>Device address: {this.state.deviceAddress}</div>
					<div>Deposit: {this.props.params.deposit}</div>
					<div>Type: pay for request</div>
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
		page: 'wallet',
		walletId: '',
		walletName: 'Your wallet',
		nextPage: '',
		params: {},
		name: '',
		seed: '',
		textSaveName: 'Save name',
		asset: 'base'
	};

	constructor(props) {
		super(props);
		let self = this;

		getBiot(async (biot) => {
			this.setState({walletId: (await biot.core.getWallets())[0]})
		});

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
			if (!u || u.length < 2) return;

			let action = u[1];
			let p = url.match(/([a-zA-Z0-9]+=[a-zA-Z0-9]+)/g).map((v) => v.split('='));
			let params = {};
			p.forEach(v => {
				params[v[0]] = v[1];
			});

			if (action === 'transfer') {
				// @ts-ignore
				if (OBValidation.isValidAddress(params['to'])) {
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
		if (_stepInit) {
			console.error('qweqweqwe', _stepInit);
			if (_stepInit === 'waiting') {
				return setTimeout(this.chInit, 100);
			} else if (_stepInit === 'errorDeviceName') {
				return this.setState({page: 'setName'});
			} else if (_stepInit === 'error') {
				return alert('error');
			}
			let isShownSeed = localStorage.getItem('isShownSeed');
			if (!isShownSeed) {
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
		if (this.state.page !== 'apps') {
			let cm = localStorage.getItem('m_' + from_address);
			let messages = cm ? JSON.parse(cm) : [];
			messages.push({text, i: false});
			localStorage.setItem('m_' + from_address, JSON.stringify(messages));
		}
	};

	objMessages = (from_address, object) => {
		if (this.state.page !== 'apps') {
			if (object.type === 'imapp') {
				let ls = localStorage.getItem('listApps');
				let listApps = ls ? JSON.parse(ls) : {};
				listApps[from_address] = true;
				localStorage.setItem('listApps', JSON.stringify(listApps));
			}
		}
	};

	setPage = (page, walletId?, nextPage?, params?) => {
		this.setState({page: page, nextPage: nextPage || '', params: params || {}});
	};

	setName = (evt) => {
		this.setState({
			name: evt.target.value
		});
	};

	setAsset = (asset) => {
		this.setState({asset: asset});
	};

	nowSaveName = false;
	saveName = () => {
		if (!this.nowSaveName) {
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
		this.setState({page: 'wallet'});
	};

	backKeyClick = () => {
		if (this.state.page === 'setWallet') {
			this.setState({page: 'index'})
		} else if (this.state.page == 'wallet') {
			this.setState({page: 'index'})
		} else if (this.state.page == 'sendTransaction') {
			this.setState({page: 'wallet'})
		} else if (this.state.page == 'receiveTransaction') {
			this.setState({page: 'wallet'})
		}
	};

	render() {
		if (this.state.page == 'index') {
			return <div className={'app-body'}>
				<WalletsList setPage={this.setPage} />
				<Menu page={'index'} setPage={this.setPage} />
			</div>
		} else if (this.state.page === 'setWallet') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Please select the wallet</text>
					<a onClick={() => this.setState({page: 'index'})} className={'back-button'}> </a>
				</div>
				<SetWallet setPage={this.setPage} nextPage={this.state.nextPage} params={this.state.params} />
			</div>
		} else if (this.state.page === 'setName') {
			return <div className={'app-body'} style={{ textAlign: 'center' }}>
				<div style={{ display: "flex", flexDirection: "column", textAlign: "left", paddingTop: 13, fontSize: "21px" }}>
					<div className="inner">
						<div style={{ marginBottom: 8 }}>What's your name?</div>
					</div>
					<div className="line" />
				</div>
				<div className="inner">
					<div className="iconsName" />
					<div>
						<input type={'text'} className={'name-input'} placeholder={'Your name'} onChange={this.setName} />
					</div>
					<div className={'button-block'}>
						<button onClick={() => this.saveName()} className={'button-send-submit'} type="submit">
							{this.state.textSaveName}
						</button>
					</div>
				</div>
			</div>
		} else if (this.state.page === 'showSeed') {
			return <div className={'app-body'} style={{ textAlign: 'center' }}>
				<div style={{ display: "flex", flexDirection: "column", textAlign: "left", paddingTop: 13, fontSize: "21px" }}>
					<div className="inner">
						<div style={{ marginBottom: 8 }}>Please save your seed</div>
					</div>
					<div className="line" />
				</div>
				<div className="iconsSeed" />
				<div className="seed-block">{this.state.seed}</div>
				<div className="inner">
					<div className={'button-block'}>
						<button onClick={() => this.copySeed()} className={'button-send-submit'} type="submit">
							Copy seed
						</button>
					</div>
				</div>
			</div>
		} else if (this.state.page === 'reqChannel') {
			return <div><ReqChannel params={this.state.params} walletId={this.state.walletId} setPage={this.setPage} />
			</div>
		} else if (this.state.page == 'qrScanner') {
			return <div>
				<QRScanner setPage={this.setPage} />
			</div>
		} else if (this.state.page == 'wallet' && this.state.walletId) {
			return <div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						textAlign: "left",
						fontSize: "21px"
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "#ffffff"
						}}
					>
						<div onClick={() => this.setState({ page: 'index' })} className="topmenu_action">
							<div className="topmenu_action-arrow" />
						</div>
						<div style={{ paddingLeft: 20, width: "100%" }}>
							<text>{
								this.state.walletName.length > 25 ?
									this.state.walletName.substr(0, 25) + '...' :
									this.state.walletName}
							</text>
						</div>
					</div>
					<div className="line" />
				</div>

				{/* <div className={'top-bar'}>
			<text
				className={'wallet-title'}>{
				this.state.walletName.length > 25 ?
					this.state.walletName.substr(0, 25) + '...' :
					this.state.walletName}</text>
			<a onClick={() => this.setState({ page: 'index' })} className={'back-button'}> </a>
		</div> */}

				<div className={'wallet-menu'}>
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
						<a onClick={() => this.setState({ page: 'sendTransaction' })} className={'send-button'}> </a>
						<div>Send</div>
					</div>
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
						<a onClick={() => this.setState({ page: 'receiveTransaction' })} className={'receive-button'}> </a>
						<div>Recive</div>
					</div>
				</div>
				<Wallet walletId={this.state.walletId} />
			</div>
		} else if (this.state.page == 'sendTransaction') {
			console.error('ASSET STATE', this.state.asset);
			return <div>
						display: "flex",
				</div>

				<SendPage walletId={this.state.walletId} back={() => this.setState({ page: 'wallet' })}
					params={this.state.params} />
			</div>
		} else if (this.state.page == 'receiveTransaction') {
			return <div>
				{/* <div className={'top-bar'}>
				<text className={'wallet-title'}>Receive</text>
				<a onClick={() => this.setState({ page: 'wallet' })} className={'back-button'}> </a>
			</div> */}
				<div style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "left",
					fontSize: "21px"
				}}>
					<div style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						background: "#ffffff"
					}}>
						<div onClick={() => this.setState({ page: 'wallet' })} className="topmenu_action">
							<div className="topmenu_action-arrow" />
						</div>
						<div style={{ paddingLeft: 20, width: "100%" }}>Receive</div>
					</div>
					<div className="line" />
				</div>
				<ReceivePage walletId={this.state.walletId} />
			</div>
		} else if (this.state.page == 'apps') {
			return <div>
				<Apps setPage={this.setPage} />
			</div>
		} else {
			return <div>Loading...</div>
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

function parseTag(nfcEvent) {
	getBiot((biot: any) => {
		console.error('NFCCWA', nfcEvent);
		let records = nfcEvent.tag.ndefMessage;

		for (let i = 0; i < records.length; i++) {
			// @ts-ignore
			let text = nfc.bytesToString(records[i].payload).substr(3);
			console.error('text nfc', text);
			if (/^biot:/.test(text)) {
				let t = text.substr(5).split('|');
				let amount = parseInt(t[1]);
				// @ts-ignore
				if (OBValidation.isValidAddress(t[0]) && typeof amount === "number") {
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

function onBackKeyDown() {
	obEvents.emit('backbutton', {});
}

// @ts-ignore
window.handleOpenURL = function (url) {
	setTimeout(function () {
		events.emit('openURL', url);
	}, 0);
};

obEvents.on('object', (device_address, object) => {
	if (object.type === 'reqPayment' && object.aa_address && object.amount) {
		let deviceAddressFromLS = localStorage.getItem('peer_' + object.aa_address);
		if (deviceAddressFromLS && device_address === deviceAddressFromLS) {
			//@ts-ignore
			let channels = window.channels;
			console.error('send', object);
			channels.sendMessageAndPay(object.aa_address, '', object.amount, (error, response) => {
				if (error) {
					//@ts-ignore
					window.plugins.toast.showLongBottom('An error occurred while sending payment through the channel');
					return console.error('error:::::',error, response);
				} else {
					//@ts-ignore
					window.plugins.toast.showLongBottom('Payment through channel sent successfully');
				}
			});
		}
	}
});