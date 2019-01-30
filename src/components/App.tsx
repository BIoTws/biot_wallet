import * as React from 'react';

import "../styles/style.scss";
import { WalletsList } from "./WalletsList";
import { Wallet } from "./WalletPage";
import { ReceivePage } from "./ReceivePage";
import { SendPage } from "./SendPage";
import getBiot from "../getBiot";

interface IPage {
	page: string;
}

export class Menu extends React.Component<any, IPage> {

	constructor (props: any) {
		super(props);
		this.state = { page: "qrScanner" };
	}

	render () {
		return (
			<div className={'menu'}>
				<a onClick={() => {
					this.props.setPage(this.state.page)
				}} className={'qr-scanner'}>
				</a>
			</div>
		)
	}
}

export class QRScanner extends React.Component<any, IPage> {

	componentDidMount () {
		let self = this;
		// @ts-ignore
		getQR(function (err, text) {
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

				if (text.indexOf('byteball:') !== -1 || text.indexOf('byteball-tn:') !== -1) {
					let r = text.match(/^byteball(|-tn):([A-Z0-9]+)/);
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
						}
					}
				} else if (json && json.app && json.app === 'biot') {
					if (json.type && json.type === 'channel') {
						if (json.step && json.step === 'init') {
							if (!json.pairingCode || !json.myAmount || !json.peerAmount || !json.age
								|| !json.channelType || (json.channelType && json.channelType !== 'pft')
								|| !json.rate || !json.count || !json.interval) {
								alert('Error_ch');
								self.props.setPage('index');
							}

							self.props.setPage('setWallet', null, 'reqChannel', {
								pairingCode: json.pairingCode,
								myAmount: json.peerAmount,
								peerAmount: json.myAmount,
								age: json.age,
								channelType: json.channelType,
								rate: json.rate,
								count: json.count,
								interval: json.interval
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
		hideQR(function () {
			// @ts-ignore
			setTimeout(function () {
				document.body.style.backgroundColor = '';
			}, 50);
		});
	}

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

	state = { wallets: [] };

	componentDidMount () {
		getBiot(async (biot: any) => {
			let wallets: any = [];
			let walletsInDb = await biot.core.getWallets();
			for (let i = 0; i < walletsInDb.length; i++) {
				let wallet = walletsInDb[i];
				let balance = await biot.core.getWalletBalance(wallet);
				wallets = [...wallets, {
					id: wallet,
					name: wallet.substr(0, 25) + '...',
					coin: 'Byteball',
					balance: balance.base.stable + balance.base.pending
				}];
			}
			this.setState({ wallets: wallets });
		});
	}

	render () {
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
			<div className={'state-wallets'}>{wallets}</div>
		</div>
	}
}

export class ReqChannel extends React.Component<{ params: any, walletId: string, setPage: (page) => void }, any> {

	state = { wallets: [] };

	openChannel = async (biot, deviceAddress) => {
		// @ts-ignore
		let channelsManager = new ChannelsManager(this.props.walletId);
		// @ts-ignore
		let myDeviceAddressW = window.myDeviceAddress;

		let channel = channelsManager.newChannel({
			myDeviceAddress: myDeviceAddressW,
			peerDeviceAddress: deviceAddress,
			myAmount: this.props.params.myAmount,
			peerAmount: this.props.params.peerAmount,
			age: this.props.params.age
		});
		channel.events.on('error', error => {
			console.error('channelError', error, channel.id);
		});
		channel.events.on('start', async () => {
			console.error('channel start. id:', channel.id);
			let i = 1;
			let interval = setInterval(async () => {
				await channel.transfer(this.props.params.rate);
				console.error('info', channel.info());
				i++;
				if (i >= this.props.params.count) {
					clearInterval(interval);
					await channel.closeMutually();
					setTimeout(async () => {
						if (channel.step !== 'mutualClose') {
							await channel.closeOneSide();
						}
					}, 60000);
				}
			}, this.props.params.interval * 1000);
			await channel.transfer(this.props.params.rate);
		});
		channel.events.on('changed_step', (step) => {
			console.error('changed_step: ', step, channel.id);
		});
		channel.events.on('new_transfer', async (amount) => {
			console.error('new_transfer: ', amount, channel.id);
		});
		console.error('init', await channel.init());
	};

	approve = () => {
		getBiot(async (biot: any) => {
			let pubKey = this.props.params.pairingCode.match(/^[A-Za-z0-9]+/)[0];

			// @ts-ignore
			let peerDeviceAddress = objectHash.getDeviceAddress(pubKey);

			let listCorrespondents = await biot.core.listCorrespondents();
			if (listCorrespondents.length && listCorrespondents.filter(v => {
				return v.device_address === peerDeviceAddress
			}).length) {
				await this.openChannel(biot, peerDeviceAddress);
			} else {
				await biot.core.addCorrespondent(this.props.params.pairingCode);
				await this.openChannel(biot, peerDeviceAddress);
			}

		});
	};

	reject = () => {
		this.props.setPage('index');
	};

	render () {
		return <div>
			<div className={'top-bar'}>
				<text className={'qrScanner-title'}>Open channel</text>
				<a onClick={() => this.props.setPage('index')} className={'back-button'}> </a>
			</div>
			<div className={'listAddChannel'}>
				<div>My amount: {this.props.params.myAmount}</div>
				<div>Peer amount: {this.props.params.peerAmount}</div>
				<div>Age: {this.props.params.age}</div>
				<div>Rate: {this.props.params.rate} bytes</div>
				<div>Number of Payments: {this.props.params.count}</div>
				<div>Interval: {this.props.params.interval} sec</div>
				<div className={'chBtns'}>
				<div className={'chApprove'}><a onClick={() => this.approve()}>Approve</a></div>
				<div className={'chReject'}><a onClick={() => this.reject()}>Reject</a></div>
				</div>
			</div>
		</div>
	}
}

export class App extends React.Component {
	state = {
		page: 'index',      //qrScanner , wallet
		walletId: '',
		nextPage: '',
		params: {}
	};

	setPage = (page, walletId?, nextPage?, params?) => {
		this.setState({ page: page, walletId: walletId, nextPage: nextPage || '', params: params || {} });
	};


	render () {
		if (this.state.page == 'index') {
			return <div className={'app-body'}>
				<WalletsList setPage={this.setPage}/>
				<Menu setPage={this.setPage}/>
			</div>
		} else if (this.state.page === 'setWallet') {
			return <div>
				<SetWallet setPage={this.setPage} nextPage={this.state.nextPage} params={this.state.params}/>
			</div>
		} else if (this.state.page === 'reqChannel') {
			return <div><ReqChannel params={this.state.params} walletId={this.state.walletId} setPage={this.setPage}/>
			</div>
		} else if (this.state.page == 'qrScanner') {
			return <div>
				<QRScanner setPage={this.setPage}/>
			</div>
		} else if (this.state.page == 'wallet') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>{this.state.walletId.substr(0, 25) + '...'}</text>
					<a onClick={() => this.setState({ page: 'index' })} className={'back-button'}> </a>
				</div>
				<div className={'wallet-menu'}>
					<a onClick={() => this.setState({ page: 'sendTransaction' })} className={'send-button'}> </a>
					<a onClick={() => this.setState({ page: 'receiveTransaction' })} className={'receive-button'}> </a>
				</div>
				<Wallet walletId={this.state.walletId}/>
			</div>
		} else if (this.state.page == 'sendTransaction') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Send</text>
					<a onClick={() => this.setState({ page: 'wallet' })} className={'back-button'}> </a>
				</div>
				<SendPage walletId={this.state.walletId} back={() => this.setState({ page: 'wallet' })}
				          params={this.state.params}/>
			</div>
		} else if (this.state.page == 'receiveTransaction') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Receive</text>
					<a onClick={() => this.setState({ page: 'wallet' })} className={'back-button'}> </a>
				</div>
				<ReceivePage walletId={this.state.walletId}/>
			</div>
		}
	}
}



