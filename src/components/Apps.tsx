import * as React from 'react';
import "../styles/apps.scss";
import "../styles/style.scss";
import getBiot from "../getBiot";
import makeBlockie from 'ethereum-blockies-base64';
import { Menu } from "./Menu";

export class Apps extends React.Component<{ setPage: (page) => void }, any> {
	values: any = {};
	requirements: any = {};
	core: any = null;
	biot: any = null;
	biotInit: boolean = false;
	callbackW: any = (address: string) => {
	};

	state = {
		app: 'list',
		data: [],
		wallets: [],
		hiddenBlock: false,
		hiddenWallets: true,
		hiddenWaiting: true,
		page: '',
		message: '',
		correspondents: [],
		pairingCode: '',
		peerPairingCode: '',
		thisChat: { name: '', device_address: '' },
		currentText: '',
		messages: {},
		isShowBlockSendAddress: false,
		hiddenListAction: true,
		elementTapId: ''
	};

	private messages_scroll: React.RefObject<any>;
	private messages_height: React.RefObject<any>;

	constructor (props) {
		super(props);
		this.messages_scroll = React.createRef();
		this.messages_height = React.createRef();
	}

	componentDidMount () {
		this.messages = this.messages.bind(this);
		this.objMessages = this.objMessages.bind(this);
		this.changeValue = this.changeValue.bind(this);
		this.sendResponse = this.sendResponse.bind(this);
		this.setWallet = this.setWallet.bind(this);
		this.showWallets = this.showWallets.bind(this);
		this.onTStart = this.onTStart.bind(this);
		this.hideTapActionList = this.hideTapActionList.bind(this);
		this.delCor = this.delCor.bind(this);

		//@ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.on('text', this.messages);
		_eventBus.on('object', this.objMessages);

		getBiot(async (biot: any) => {
			this.core = biot.core;
			this.biot = biot;
			this.biotInit = true;
			let wallets: any = [];
			let listCors = await biot.core.listCorrespondents();
			let pairingCode = biot.core.getMyParingCode() + 'add';
			console.error('Pairing code: ', pairingCode);
			this.setState({ correspondents: listCors, pairingCode: pairingCode });
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


			setTimeout(async () => {
				let listCors = await biot.core.listCorrespondents();
				this.setState({ correspondents: listCors });
			}, 1000);
		});
	}

	componentWillUnmount () {
		// @ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.removeListener('text', this.messages);
		_eventBus.removeListener('object', this.objMessages);
	}

	goList () {
		this.setState({
			app: 'list',
			data: '',
			page: '',
			message: '',
			thisChat: { name: '', device_address: '' }
		});
		this.values = {};
		this.callbackW = (address) => {
		};
	}


	closeApp () {
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'close'
		});
		this.values = {};
		this.setState({ thisChat: { name: '', device_address: '' }, app: 'list', data: '', page: '', message: '' });
	}

	getElement (f) {
		if (f.type === 'input') {
			return this.tInput(f.title, f.id);
		} else if (f.type === 'address') {
			return <div style={{ textAlign: 'center' }}>
				<a onClick={() => this.showWallets()} className={'selectAddress'}>
					For choose address click here</a>
			</div>
		} else if (f.type === 'blank_line') {
			return <div><br/></div>
		} else if (f.type === 'submit') {
			return <div id={f.id} style={{ textAlign: 'center' }}>
				<input onClick={() => this.sendResponse()} className={'button-send-submit'} type={'submit'}
				       value={f.title}/>
			</div>
		} else if (f.type === 'h2') {
			return <div id={f.id} style={{ textAlign: 'center' }}><h2>{f.title}</h2>
			</div>
		} else if (f.type === 'h3') {
			return <div id={f.id} style={{ textAlign: 'center' }}><h3>{f.title}</h3>
			</div>
		} else if (f.type === 'text') {
			return <div id={f.id}>{f.title}</div>
		} else if (f.type === 'request') {
			return <div id={f.id} style={{ textAlign: 'center' }}>
				<input onClick={() => this.sendRequest(f.req)} className={'button-send-submit'} type={'button'}
				       value={f.title}/>
			</div>
		} else if (f.type === 'list-menu') {
			return <div onClick={() => this.sendRequest(f.req)} id={f.id} className={'list-menu'}>
				{f.title}
			</div>
		}
	}

	messages (from_address, text) {
		console.error('messages', from_address, text);
		let cm = this.state.messages;
		if (!cm[from_address]) {
			cm[from_address] = [];
		}
		cm[from_address].push({ text, i: false });
		localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
		this.setState({ messages: cm });
		setTimeout(() => {
			this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
		}, 100);
	}

	async checkProfile (attesters, address, unit, profile) {
		let db = this.biot.db;
		let storage = this.biot.storage;
		let network = this.biot.network;
		let light_attestations = this.biot.light_attestations;

		//@ts-ignore
		let _eventBus = window.eventBus;
		//@ts-ignore
		let _objectHash = window.objectHash;

		await light_attestations.updateAttestationsInLight(address);
		let rows: any = await new Promise(resolve => {
			db.query("SELECT 1 FROM attestations CROSS JOIN unit_authors USING(unit)\n\
		WHERE attestations.address=? AND unit_authors.address IN(?) AND unit=?",
				[address, attesters, unit], resolve);
		});
		if (rows.length) {
			return new Promise(resolve => {
				storage.readJoint(db, unit, {
					ifNotFound: function () {
						_eventBus.once('saved_unit-' + unit, (objJoint) => {
							handleJoint(objJoint, resolve)
						});
						network.requestHistoryFor([unit], []);
					},
					ifFound: (objJoint) => {
						handleJoint(objJoint, resolve)
					}
				});
			})
		} else {
			return false;
		}

		function handleJoint (objJoint, resolve) {
			let payload = objJoint.unit.messages.find(m => m.app === 'attestation').payload;
			if (payload && payload.address === address) {
				let hidden_profile = {};
				for (let field in profile) {
					let value = profile[field];
					hidden_profile[field] = _objectHash.getBase64Hash(value);
				}
				let profile_hash = _objectHash.getBase64Hash(hidden_profile);
				if (profile_hash === payload.profile.profile_hash) {
					return resolve(true);
				} else {
					return resolve(false);
				}
			} else {
				resolve(false);
			}
		}
	}

	async objMessages (from_address, object) {
		if (object.type === 'imapp') {
			let ls = localStorage.getItem('listApps');
			let listApps = ls ? JSON.parse(ls) : {};
			console.error('listapps', listApps);
			listApps[from_address] = true;
			localStorage.setItem('listApps', JSON.stringify(listApps));
			return;
		}

		this.setState({ hiddenWaiting: true });
		let blocks: any = [];
		if (object.type === 'render') {
			this.setState({ page: object.page });
			object.form.forEach(f => {
				if (f.required) this.requirements[f.id] = { type: f.type, title: f.title };
				blocks = [...blocks, this.getElement(f)];
			});
			this.setState({ data: blocks });
		} else if (object.type === 'addProfile') {
			// @ts-ignore
			let objV = OBValidation;
			if (objV.isValidAddress(object.my_address) && objV.isValidAddress(object.your_address)) {
				if ((await this.checkProfile([object.my_address], object.your_address, object.unit, object.profile))) {
					await this.core.saveProfile(object.my_address, object.your_address, object.unit, object.profile);
					alert('Profile successfully added');
				} else {
					alert('Incorrect profile');
				}
			} else {
				alert('Incorrect profile');
			}
		} else if (object.type === 'alert') {
			alert(object.message);
		} else if (object.type === 'update') {
			blocks = this.state.data;
			let index = blocks.findIndex(b => {
				return b.props.id === object.id
			});
			blocks.splice(index, 1, this.getElement(object.value));
			this.setState({ data: blocks });
		}
	}

	changeValue (id, value) {
		this.values[id] = value;
	}

	tInput (title, id) {
		return <div>
			<div><input className={'input'} onChange={(e) => {
				this.changeValue(id, e.target.value)
			}} id={id} placeholder={title}/></div>
		</div>
	}

	getWallet () {
		let wallets = this.state.wallets.map((wallet: { id: string, name: string, balance: number, coin: string }) => {
			return (
				<div onClick={() => this.setWallet(wallet.id)} key={wallet.id} className={'wallets-list-body'}>
					<div className={wallet.coin}>
					</div>
					<div className={'wallets-list-body-name'}>{wallet.name}</div>
					<div className={'wallets-list-body-balance'}>{wallet.balance} bytes</div>
				</div>
			);
		});
		return <div hidden={this.state.hiddenWallets}>
			<div className={'state-wallets'}>{wallets}</div>
		</div>
	}

	async setWallet (id) {
		let addresses = await this.core.getAddressesInWallet(id);
		this.values['address'] = addresses[0];
		this.setState({ hiddenBlock: false, hiddenWallets: true });
		this.callbackW(addresses[0]);
	}

	showWallets () {
		this.setState({ hiddenBlock: true, hiddenWallets: false });
	}

	sendResponse () {
		for (let key in this.requirements) {
			if (this.values[key] === undefined || (this.values[key] !== undefined && this.values[key] === '')) {
				if (this.requirements[key].type === 'input') {
					return alert('Please fill "' + this.requirements[key].title + '"');
				} else if (this.requirements[key].type === 'address') {
					return alert('Please choose address');
				}
			}
		}
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'response',
			page: this.state.page,
			response: this.values
		});
		this.setState({ hiddenWaiting: false });
	}

	sendRequest (req) {
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'request',
			page: this.state.page,
			req: req
		});
	}

	listCorrespondents () {
		return this.state.correspondents.map((correspondent: any) => {
			// @ts-ignore
			let icon = makeBlockie(correspondent.device_address);
			return <div key={correspondent.device_address} className={'wallets-list-body'}
			            onClick={() => this.openChatOrApp(correspondent)}
			            onTouchStart={() => this.onTStart(correspondent.device_address)}
			            onTouchEnd={() => this.onTEnd(correspondent.device_address)}>
				<div style={{ padding: '10px 7px' }}><img width={'50px'} height={'50px'} src={icon}/></div>
				<div className={'wallets-list-body-name'}>{correspondent.name}</div>
				<div className={'cors-list'}>{correspondent.device_address}</div>
			</div>
		});
	}

	copyPairingCode () {
		//@ts-ignore
		window.cordova.plugins.clipboard.copy(this.state.pairingCode);
		//@ts-ignore
		window.plugins.toast.showShortBottom('Pairing code successfully copied');
	}

	showAddC () {
		this.setState({ app: 'addC' });
	}

	setPeerPairingCode = (evt) => {
		this.setState({
			peerPairingCode: evt.target.value
		});
	};

	setCurrentText = (evt) => {
		this.setState({
			currentText: evt.target.value
		});
	};

	addCorrespondent = () => {
		getBiot(async (biot) => {
			await biot.core.addCorrespondent(this.state.peerPairingCode).catch(e => alert(e));
			let listCors = await biot.core.listCorrespondents();
			setTimeout(() => {
				this.setState({ app: 'list', correspondents: listCors });
			}, 500);
		});
	};

	openChatOrApp = (correspondent) => {
		let ls = localStorage.getItem('listApps');
		let listApps = ls ? JSON.parse(ls) : {};
		if (listApps[correspondent.device_address]) {
			this.openApp(correspondent);
		} else {
			this.openChat(correspondent);
		}
	};

	openApp = (correspondent) => {
		this.setState({ app: 'app', thisChat: correspondent, hiddenWaiting: false });
		let send = () => {
			if (this.biotInit) {
				this.core.sendTechMessageToDevice(correspondent.device_address, { type: 'hello' });
			} else {
				setTimeout(send, 70);
			}
		};
		send();
	};

	openChat = (correspondent) => {
		let cm = this.state.messages;
		let ls = localStorage.getItem('m_' + correspondent.device_address);
		cm[correspondent.device_address] = ls ? JSON.parse(ls) : [];
		this.setState({ thisChat: correspondent, app: 'chat', messages: cm });
		setTimeout(() => {
			this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
		}, 100);
	};

	sendMessage = () => {
		let message = this.state.currentText;
		this.core.sendTextMessageToDevice(this.state.thisChat.device_address, message);
		let cm = this.state.messages;
		if (!cm[this.state.thisChat.device_address]) {
			cm[this.state.thisChat.device_address] = [];
		}
		cm[this.state.thisChat.device_address].push({ text: message, i: true });
		localStorage.setItem('m_' + this.state.thisChat.device_address, JSON.stringify(cm[this.state.thisChat.device_address]));
		this.setState({ messages: cm, currentText: '' });
		setTimeout(() => {
			this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
		}, 100);
	};

	showOrHideBlock = () => {
		this.setState({ isShowBlockSendAddress: !this.state.isShowBlockSendAddress });
	};

	hideBlockAndShowWallets = (insert) => {
		this.callbackW = (address) => {
			if (insert) {
				this.setState({ currentText: this.state.currentText + address });
			} else {
				this.setState({ currentText: address }, () => {
					this.sendMessage();
				});
			}
		};
		this.setState({ isShowBlockSendAddress: false });
		this.showWallets();
	};


	tapTimers = {};
	onTStart = (id) => {
		this.tapTimers[id] = setTimeout((id) => {
			this.setState({ elementTapId: id, hiddenListAction: false });
			delete this.tapTimers[id];
		}, 700, id);
	};

	onTEnd = (id) => {
		clearTimeout(this.tapTimers[id]);
	};

	hideTapActionList = () => {
		this.setState({ elementTapId: '', hiddenListAction: true });
	};

	delCor = () => {
		getBiot(async (biot) => {
			await biot.core.removeCorrespondent(this.state.elementTapId).catch(e => alert(e));
			let listCors = await biot.core.listCorrespondents();
			setTimeout(() => {
				this.setState({ app: 'list', correspondents: listCors, elementTapId: '' });
			}, 500);
		});
		this.setState({ hiddenListAction: true });
	};

	render () {
		if (this.state.app === 'addC') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Accept invitation</text>
					<a onClick={() => this.goList()} className={'back-button'}> </a>
				</div>
				<div className={'data'}>
					<div><input className={'input'} placeholder={'Pairing code'} onChange={this.setPeerPairingCode}/>
					</div>
					<div style={{ textAlign: 'center' }}>
						<input type={'button'} value={'Accept invitation'} className={'button-send-submit'}
						       onClick={this.addCorrespondent}/>
					</div>
				</div>
			</div>
		} else if (this.state.app === 'list') {
			return <div>
				<div id={'action_tap'} hidden={this.state.hiddenListAction}>
					<div id={'action_tab_bg'} onClick={this.hideTapActionList}></div>
					<div id={'action_tap_menu'}>
						<div onClick={this.delCor}>Delete correspondent</div>
					</div>
				</div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Apps and chats</text>
				</div>
				<div id={'bl_for_scroll_corrs'}>
					<div className={'state-wallets'}>
						<div key={'recvCorr'} className={'wallets-list-body'} onClick={() => {
							this.showAddC()
						}}>
							<div className={'recvCorr'}></div>
							<div className={'wallets-list-body-name'}>Accept invitation</div>
							<div className={'cors-list'}>by pairing code</div>
						</div>
						{this.listCorrespondents()}
					</div>
				</div>
				<Menu page={'apps'} setPage={this.props.setPage}/>
			</div>
		} else if (this.state.app === 'app') {
			return <div>
				{this.getWallet()}
				<div hidden={this.state.hiddenBlock}>
					<div className={'top-bar'}>
						<text className={'wallet-title'}>{this.state.thisChat.name}</text>
						<a onClick={() => this.closeApp()} className={'back-button'}> </a>
					</div>
					<div className={'plsWaiting'} hidden={this.state.hiddenWaiting}>Please waiting</div>
					<div key={'ident_data'} className={'data'}>{this.state.data}</div>
				</div>
			</div>
		} else if (this.state.app === 'chat') {
			return <div>
				{this.getWallet()}
				<div hidden={this.state.hiddenBlock}>
					<div className={'top-bar'}>
						<text className={'wallet-title'}>{this.state.thisChat.name}</text>
						<a onClick={() => this.goList()} className={'back-button'}> </a>
					</div>
					<div key={'home_data'} className={'data'}>
						<div id={'bl_for_scroll'} ref={this.messages_scroll}>
							<div id={'messages_block'} ref={this.messages_height}>
								{this.state.messages[this.state.thisChat.device_address] ?
									this.state.messages[this.state.thisChat.device_address].map((value, index) => {
										return <div key={index} className={value.i ? 'm_r' : 'm_l'}>{value.text}</div>
									}) : null}
							</div>
						</div>
						<div id={'input_block'}>
							<div id={'menu_img'} onClick={this.showOrHideBlock}>
								<div hidden={!this.state.isShowBlockSendAddress} id={'insert_my_address'}
								     onClick={() => this.hideBlockAndShowWallets(1)}>Insert my address
								</div>
							</div>
							<input id={'text_input'} type={'text'} placeholder={'Your message'}
							       value={this.state.currentText} onChange={this.setCurrentText}/>
							<div id={'send_img'} onClick={() => this.sendMessage()}></div>
						</div>
					</div>
				</div>
			</div>
		}
	}
}
