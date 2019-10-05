import * as React from 'react';
import "../styles/apps.scss";
import "../styles/style.scss";
import getBiot from "../getBiot";
import makeBlockie from 'ethereum-blockies-base64';
import { Menu } from "./Menu";
import { QRCode, ErrorCorrectLevel } from "qrcode-generator-ts/js";

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
		profiles: [],
		hidden: true,
		hiddenBlock: false,
		hiddenWallets: true,
		hiddenWaiting: true,
		hiddenProfiles: true,
		page: '',
		message: '',
		correspondents: [],
		imgUrl: '',
		pairingCode: '',
		peerPairingCode: '',
		thisChat: { name: '', device_address: '' },
		currentText: '',
		messages: {},
		isShowBlockSendAddress: false,
		hiddenListAction: true,
		elementTapId: '',
		isChecked: false,
		chatProfileValues: [],
		hiddenChatProfileInfo: true,
	};

	private messages_scroll: React.RefObject<any>;
	private messages_height: React.RefObject<any>;
	private elms: any;

	constructor(props) {
		super(props);
		this.messages_scroll = React.createRef();
		this.messages_height = React.createRef();
		this.elms = {};
	}

	componentDidMount() {
		this.messages = this.messages.bind(this);
		this.objMessages = this.objMessages.bind(this);
		this.changeValue = this.changeValue.bind(this);
		this.sendResponse = this.sendResponse.bind(this);
		this.setWallet = this.setWallet.bind(this);
		this.showWallets = this.showWallets.bind(this);
		this.onTStart = this.onTStart.bind(this);
		this.hideTapActionList = this.hideTapActionList.bind(this);
		this.delCor = this.delCor.bind(this);
		this.copyPairingCode = this.copyPairingCode.bind(this);

		//@ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.on('text', this.messages);
		_eventBus.on('object', this.objMessages);
		_eventBus.on('backbutton', this.backKeyClick);


		getBiot(async (biot: any) => {
			this.core = biot.core;
			this.biot = biot;
			this.biotInit = true;
			let profiles: any = [];
			let wallets: any = [];
			let listCors = await biot.core.listCorrespondents();
			let pairingCode = biot.core.getMyParingCode() + 'add';
			console.error('Pairing code: ', pairingCode);
			this.setState({ correspondents: listCors, pairingCode: pairingCode });
			let walletsInDb = await biot.core.getWallets();
			let profilesInDb = await biot.core.getProfiles();
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
			for (let i = 0; i < profilesInDb.length; i++) {
				let profile = profilesInDb[i];
				profiles = [...profiles, {
					address: profile.address,
					attester: profile.attester,
					object: profile.object,
					unit: profile.unit,
				}];
			}
			this.setState({ wallets: wallets, profiles: profiles });


			setTimeout(async () => {
				let listCors = await biot.core.listCorrespondents();
				this.setState({ correspondents: listCors });
			}, 1000);
		});
	}

	componentWillUnmount() {
		// @ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.removeListener('text', this.messages);
		_eventBus.removeListener('object', this.objMessages);
		_eventBus.removeListener('backbutton', this.backKeyClick);
	}

	goList() {
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

	closeApp() {
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'close'
		});
		this.values = {};
		this.setState({ thisChat: { name: '', device_address: '' }, app: 'list', data: '', page: '', message: '' });
	}

	getElement(f) {
		if (f.type === 'input') {
			if (f.id) this.elms[f.id] = React.createRef();
			return this.tInput(f.title, f.id);
		} else if (f.type === 'address') {
			this.elms['setAddress'] = React.createRef();
			return <div className={'setAddress'}>
				<a onClick={() => this.showWallets()} className={'selectAddress'} ref={this.elms['setAddress']}>
					For choose address click here</a>
			</div>
		} else if (f.type === 'blank_line') {
			return <div><br /></div>
		} else if (f.type === 'submit') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div id={f.id} style={{ textAlign: 'center' }}>
				<input ref={this.elms[f.id]} onClick={() => this.sendResponse()} className={'button-send-submit'}
					type={'submit'}
					value={f.title} />
			</div>
		} else if (f.type === 'h2') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div id={f.id} style={{ textAlign: 'center' }}><h2 ref={this.elms[f.id]}>{f.title}</h2>
			</div>
		} else if (f.type === 'h3') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div id={f.id} ref={this.elms[f.id]} style={{ textAlign: 'center' }}><h3>{f.title}</h3>
			</div>
		} else if (f.type === 'text') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div id={f.id} ref={this.elms[f.id]}>{f.title}</div>
		} else if (f.type === 'request') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div id={f.id} style={{ textAlign: 'center' }}>
				<input ref={this.elms[f.id]} onClick={() => this.sendRequest(f.req)} className={'button-send-submit'}
					type={'button'}
					value={f.title} />
			</div>
		} else if (f.type === 'checkbox') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div className={'checkbox'} style={{ textAlign: 'center' }}>
				<label className={'switch'} htmlFor={f.id}>
					<text className={'checkboxTitle'}>{f.title}</text>
					<input ref={this.elms[f.id]} onChange={(e) => this.handleCheck(f.id, e.target.checked)}
						type={'checkbox'} id={f.id} />
					<div className={'slider round'}></div>
				</label>
			</div>
		} else if (f.type === 'profile') {
			this.elms['setProfile'] = React.createRef();
			return <div className={'setProfile'}>
				<a id={'chooseProfile'} onClick={() => this.chooseProfile()} ref={this.elms['setProfile']}>For choose
					profile click here</a>
			</div>
		} else if (f.type === 'list-menu') {
			if (f.id) this.elms[f.id] = React.createRef();
			return <div ref={this.elms[f.id]} onClick={() => this.sendRequest(f.req)} id={f.id} className={'list-menu'}>
				{f.title}
			</div>
		}
	}

	handleCheck(id, isChecked) {
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'update_value',
			page: this.state.page,
			update: { id: id, value: isChecked },
		});
		this.changeValue(id, isChecked)
	};

	chooseProfile() {
		this.setState({ hiddenBlock: true, hiddenProfiles: false });
	}

	setProfile(profile) {
		let prf = JSON.parse(profile.object);
		this.values['profile'] = profile.object;
		if (this.elms['setProfile']) {
			this.elms['setProfile'].current.innerText = prf.name[0] + ' ' + prf.lname[0];
		}
		this.setState({ hiddenBlock: false, hiddenProfiles: true });
		this.callbackW(profile);
	}

	getProfile() {
		let wallets = this.state.profiles.map((profile: any) => {
			let prf = JSON.parse(profile.object);
			return (
				<div onClick={() => this.setProfile(profile)} key={profile.unit}
					className={'wallets-list-body'}>
					<div className={'profiles-list-body-name'}>{prf.name[0] + ' ' + prf.lname[0]}</div>
					<div className={'profiles-list-body-balance'}>{profile.attester}</div>
				</div>
			);
		});
		return <div hidden={this.state.hiddenProfiles}>
			<div className={'state-wallets'}>{wallets}</div>
		</div>
	}


	async messages(from_address, text) {
		console.error('messages', from_address, text);
		let cm = this.state.messages;
		if (!cm[from_address]) {
			cm[from_address] = [];
		}
		if (text.indexOf('profile:')) {
			let parsedProfile;
			try {
				parsedProfile = JSON.parse(text);
			} catch (e) {
			}
			if (parsedProfile) {
				let pr = parsedProfile.profile;
				let parsedProfileObject = JSON.parse(pr.object);
				let prfArray = [] as any;
				for (let key in parsedProfileObject) {
					prfArray = [...prfArray, { key: key, value: parsedProfileObject[key][0] }]
				}
				let profilesInStorage: any = localStorage.getItem('verified_profiles');
				if (!profilesInStorage) {
					if (await this.checkProfile(pr.attester, pr.address, pr.unit, parsedProfileObject)) {
						profilesInStorage = [pr];
						localStorage.setItem('verified_profiles', JSON.stringify(profilesInStorage));
						let profileIndex = profilesInStorage.findIndex(obj => obj.address === pr.address && obj.attester === pr.attester && obj.object === pr.object && obj.unit === pr.unit);
						cm[from_address].push({
							text: prfArray,
							i: false,
							isProfile: true,
							index: profileIndex
						});
						localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
						this.setState({ messages: cm });
						setTimeout(() => {
							this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
						}, 100);
					} else {
						let profileIndex = -1;
						cm[from_address].push({
							text: prfArray,
							i: false,
							isProfile: true,
							index: profileIndex
						});
						localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
						this.setState({ messages: cm });
						setTimeout(() => {
							this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
						}, 100);
					}
				} else {
					profilesInStorage = JSON.parse(profilesInStorage);
					if (profilesInStorage.findIndex(obj => obj.address === pr.address && obj.attester === pr.attester && obj.object === pr.object && obj.unit === pr.unit) >= 0) {
						let profileIndex = profilesInStorage.findIndex(obj => obj.address === pr.address && obj.attester === pr.attester && obj.object === pr.object && obj.unit === pr.unit);
						cm[from_address].push({
							text: prfArray,
							i: false,
							isProfile: true,
							index: profileIndex
						});
						localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
						this.setState({ messages: cm });
						setTimeout(() => {
							this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
						}, 100);
					} else {
						if (await this.checkProfile(pr.attester, pr.address, pr.unit, parsedProfileObject)) {
							profilesInStorage = [...profilesInStorage, pr];
							localStorage.setItem('verified_profiles', JSON.stringify(profilesInStorage));
							let profileIndex = profilesInStorage.findIndex(obj => obj.address === pr.address && obj.attester === pr.attester && obj.object === pr.object && obj.unit === pr.unit);
							cm[from_address].push({
								text: prfArray,
								i: false,
								isProfile: true,
								index: profileIndex
							});
							localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
							this.setState({ messages: cm });
							setTimeout(() => {
								this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
							}, 100);
						} else {
							let profileIndex = -1;
							cm[from_address].push({
								text: prfArray,
								i: false,
								isProfile: true,
								index: profileIndex
							});
							localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
							this.setState({ messages: cm });
							setTimeout(() => {
								this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
							}, 100);
						}
					}
				}
			} else {
				cm[from_address].push({ text, i: false });
				localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
				this.setState({ messages: cm });
				setTimeout(() => {
					this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
				}, 100);
			}
		} else {
			cm[from_address].push({ text, i: false });
			localStorage.setItem('m_' + from_address, JSON.stringify(cm[from_address]));
			this.setState({ messages: cm });
			setTimeout(() => {
				this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
			}, 100);
		}
	}

	async checkProfile(attesters, address, unit, profile) {
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

		function handleJoint(objJoint, resolve) {
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

	async objMessages(from_address, object) {
		if (object.type === 'imapp') {
			let ls = localStorage.getItem('listApps');
			let listApps = ls ? JSON.parse(ls) : {};
			listApps[from_address] = true;
			localStorage.setItem('listApps', JSON.stringify(listApps));
			return;
		}

		this.setState({ hiddenWaiting: true });
		let blocks: any = [];
		if (object.type === 'render') {
			this.elms = {};
			this.setState({ page: object.page });
			object.form.forEach(f => {
				if (f.required) this.requirements[f.id] = { type: f.type, title: f.title };
				blocks = [...blocks, this.getElement(f)];
			});
			let data = <div>
				{blocks.map(b => b)}
			</div>;
			this.setState({ data: data, values: {} });
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
			delete this.elms[object.id];
			blocks.splice(index, 1, this.getElement(object.value));
			this.setState({ data: blocks });
		} else if (object.type === 'setValue') {
			let el = this.elms[object.id];
			if (el && el.current) {
				el = el.current;
				if (el.tagName === 'INPUT') {
					this.values[object.id] = object.value;
					if (el.type === 'checkbox') {
						el.checked = object.value;
					} else {
						el.value = object.value;
					}
				} else if (el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'DIV') {
					el.innerText = object.value;
				}
			}
		}
	}

	changeValue(id, value) {
		this.values[id] = value;
	}

	tInput(title, id) {
		return <div>
			<div><input className={'input'} onChange={(e) => {
				this.changeValue(id, e.target.value)
			}} id={id} placeholder={title} ref={this.elms[id]} type={'text'} /></div>
		</div>
	}

	getWallet() {
		let wallets = this.state.wallets.map((wallet: { id: string, name: string, balance: number, coin: string }) => {
			return (
				<div onClick={() => this.setWallet(wallet.id)} key={wallet.id} className={'wallets-list-body'}>
					<div className={wallet.coin}>
					</div>
					<div className={'wallets-list-body-name'}>{wallet.name}</div>
					<div className={'wallets-list-body-balance'}>{wallet.balance} BC</div>
				</div>
			);
		});
		return <div hidden={this.state.hiddenWallets}>
			<div className={'state-wallets'}>{wallets}</div>
		</div>
	}

	async setWallet(id) {
		let addresses = await this.core.getAddressesInWallet(id);
		this.values['address'] = addresses[0];
		if (this.elms['setAddress']) {
			this.elms['setAddress'].current.innerText = this.values['address'];
		}
		this.setState({ hiddenBlock: false, hiddenWallets: true });
		this.callbackW(addresses[0]);
	}

	showWallets() {
		this.setState({ hiddenBlock: true, hiddenWallets: false });
	}

	sendResponse() {
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

	sendRequest(req) {
		this.core.sendTechMessageToDevice(this.state.thisChat.device_address, {
			type: 'request',
			page: this.state.page,
			req: req
		});
	}

	listCorrespondents() {
		return this.state.correspondents.map((correspondent: any) => {
			// @ts-ignore
			let icon = makeBlockie(correspondent.device_address);
			return <div key={correspondent.device_address} className={'wallets-list-body'}
				onClick={() => this.openChatOrApp(correspondent)}
				onTouchStart={() => this.onTStart(correspondent.device_address)}
				onTouchEnd={() => this.onTEnd(correspondent.device_address)}>
				<div style={{ width: 48, height: 48, marginRight: 10, flexShrink: 0 }}><img width={'100%'} height={'100%'} src={icon} /></div>
				<div style={{ width: "100%", display: "flex", justifyContent: "flex-start", flexDirection: "column", paddingRight: 10, boxSizing: "border-box" }}>
					<div className={'wallets-list-body-name'}>{correspondent.name}</div>
					<div className={'cors-list'} style={{ color: "#000", position: "static" }}>{correspondent.device_address}</div>
				</div>
				<div className="icon-arrow" />
			</div>
		});
	}

	copyPairingCode() {
		//@ts-ignore
		window.cordova.plugins.clipboard.copy(this.state.pairingCode);
		//@ts-ignore
		window.plugins.toast.showShortBottom('Pairing code successfully copied');
	}

	showAddC() {
		this.setState({ app: 'addC' });
	}

	showInvDev() {
		this.setState({ app: 'invDev' });
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

	backKeyClick = () => {
		if (this.state.app === 'app' && !this.state.hiddenBlock && this.state.hiddenProfiles) {
			this.closeApp();
		} else if (this.state.app === 'app' && this.state.hiddenBlock && !this.state.hiddenWallets) {
			this.setState({ hiddenBlock: false, hiddenWallets: true });
		} else if (this.state.app === 'app' && this.state.hiddenBlock && !this.state.hiddenProfiles) {
			this.setState({ hiddenBlock: false, hiddenProfiles: true });
		} else if (this.state.app === 'chat' && this.state.isShowBlockSendAddress) {
			this.setState({ isShowBlockSendAddress: !this.state.isShowBlockSendAddress });
		} else if (this.state.app === 'chat' && this.state.hiddenBlock && !this.state.hiddenProfiles) {
			this.setState({ hiddenBlock: false, hiddenProfiles: true });
		} else if (this.state.app === 'chat' && this.state.hiddenBlock && !this.state.hiddenWallets) {
			this.setState({ hiddenBlock: false, hiddenWallets: true });
		} else if (this.state.app === 'chat' && !this.state.hiddenChatProfileInfo) {
			this.setState({ hiddenChatProfileInfo: true });
		} else if (this.state.app === 'addC' || this.state.app === 'chat') {
			this.goList();
		}
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
		if (message.indexOf('profile:')) {
			let parsedProfile;
			try {
				parsedProfile = JSON.parse(message);
			} catch (e) {
			}
			if (parsedProfile) {
				let pr = parsedProfile.profile;
				let parsedProfileObject = JSON.parse(pr.object);
				let prfArray = [] as any;
				for (let key in parsedProfileObject) {
					prfArray = [...prfArray, { key: key, value: parsedProfileObject[key][0] }]
				}
				this.core.sendTextMessageToDevice(this.state.thisChat.device_address, message);
				let cm = this.state.messages;
				if (!cm[this.state.thisChat.device_address]) {
					cm[this.state.thisChat.device_address] = [];
				}
				cm[this.state.thisChat.device_address].push({ text: prfArray, i: true, isProfile: true, index: 0 });
				localStorage.setItem('m_' + this.state.thisChat.device_address, JSON.stringify(cm[this.state.thisChat.device_address]));
				this.setState({ messages: cm, currentText: '' });
				setTimeout(() => {
					this.messages_scroll.current.scrollTop = this.messages_height.current.clientHeight;
				}, 100);
			} else {
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
			}
		} else {
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
		}
	};

	showOrHideBlock = () => {
		this.setState({ isShowBlockSendAddress: !this.state.isShowBlockSendAddress });
	};
	hideMenuBlock = () => {
		if (this.state.isShowBlockSendAddress) {
			this.setState({ isShowBlockSendAddress: false });
		}
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
	hideBlockAndShowProfiles = (insert) => {
		this.callbackW = (profile) => {
			let prf = JSON.stringify({ profile: profile });
			if (insert) {
				this.setState({ currentText: this.state.currentText + prf });
			} else {
				this.setState({ currentText: prf }, () => {
					this.sendMessage();
				});
			}
		};
		this.setState({ isShowBlockSendAddress: false });
		this.chooseProfile();
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

	openProfileInfo = (profileIndex) => {
		let profiles: any = localStorage.getItem('verified_profiles');
		profiles = JSON.parse(profiles);
		let currentProfile = profiles[profileIndex];
		let curPrfObject = JSON.parse(currentProfile.object);
		let prfArray = [] as any;
		for (let key in curPrfObject) {
			prfArray = [...prfArray, {
				key: key,
				value: curPrfObject[key][0]
			}]
		}
		prfArray = [...prfArray, {
			key: 'address',
			value: currentProfile.address,
		}, {
			key: 'attester',
			value: currentProfile.attester,
		}, {
			key: 'unit',
			value: currentProfile.unit,
		}];
		this.setState({ chatProfileValues: prfArray, hiddenChatProfileInfo: !this.state.hiddenChatProfileInfo });
	};

	profileInfoInChat() {
		let profiles = this.state.chatProfileValues.map((value: any, index) => {
			return <div key={index} className={'profile-key'}>
				<div className={'profile-value-key'}>{value.key}</div>
				<div className={'profile-value'}>{value.value}</div>
			</div>
		});
		return <div hidden={this.state.hiddenChatProfileInfo}>
			<div className={'info-background'}
				onClick={() => this.setState({ hiddenChatProfileInfo: true })}></div>
			<div className={'profile_block'}>{profiles}</div>
		</div>
	}

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

	render() {
		if (this.state.app === 'addC') {
			return <div>
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
						<div onClick={() => this.goList()} className="topmenu_action">
							<div className="topmenu_action-arrow" />
						</div>
						<div style={{ paddingLeft: 20, width: "100%" }}>Accept invitation</div>
					</div>
					<div className="line" />
				</div>
				<div className="inner">
					<div className={'data'}>
						<div><input className={'input'} placeholder={'Pairing code'} onChange={this.setPeerPairingCode} />
						</div>
						<div style={{ textAlign: 'center' }}>
							<input type={'button'} value={'Accept invitation'} className={'button-send-submit'}
								onClick={this.addCorrespondent} />
						</div>
					</div>
				</div>
			</div>
		} else if (this.state.app === 'invDev') {
			let qrCode = new QRCode();
			qrCode.setErrorCorrectLevel(ErrorCorrectLevel.M);
			qrCode.setTypeNumber(10);
			qrCode.addData("obyte:" + this.state.pairingCode);
			qrCode.make();
			let base64ImageString = qrCode.toDataURL();
			return <div>
				{/* <div className={'top-bar'}>
					<text className={'wallet-title'}>Invite the other device</text>
					<a onClick={() => this.goList()} className={'back-button'}> </a>
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
						<div onClick={() => this.goList()} className="topmenu_action">
							<div className="topmenu_action-arrow" />
						</div>
						<div style={{ paddingLeft: 20, width: "100%" }}>Invite the other device</div>
					</div>
					<div className="line" />
				</div>
				<div>
					<div className={'qr-invite'}>
						<img width={'100%'} height={'100%'} src={base64ImageString} />
					</div>
					<div className="inner">
						<div className={'invite-code'}>
							<text>{this.state.pairingCode}</text>
						</div>
						<div style={{ textAlign: 'center' }}>
							<input type={'button'} value={'Copy pairing code'} className={'copy-pairing'}
								onClick={this.copyPairingCode} />
						</div>
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
							paddingLeft: 20
						}}
					>
						<div>Apps and chats</div>
						<div style={{
							display: "flex",
							justifyContent: "flex-end",
							alignItems: "center",
							paddingLeft: 20
						}}>
							<div onClick={() => this.showInvDev()} className="topmenu_action" style={{ marginRight: 5 }}>
								<div className="topmenu_action-img-par" />
							</div>
							<div onClick={() => this.showAddC()} className="topmenu_action">
								<div className="topmenu_action-img" />
							</div>
						</div>
						{/* <div onClick={() => this.showAddC()} className="topmenu_action">
							<div className="topmenu_action-img" />
						</div> */}
					</div>
					<div className="line" />
				</div>
				<div id={'bl_for_scroll_corrs'}>
					<div className={'state-wallets'}>
						{/* <div key={'invDev'} className={'wallets-list-body'} onClick={() => {
							this.showInvDev()
						}}>
							<div className={'invDev'}></div>
							<div className={'wallets-list-body-name'}>Invite the other device</div>
							<div className={'cors-list'}>by pairing code</div>
						</div>
						<div key={'recvCorr'} className={'wallets-list-body'} onClick={() => {
							this.showAddC()
						}}>
							<div className={'recvCorr'}></div>
							<div className={'wallets-list-body-name'}>Accept invitation</div>
							<div className={'cors-list'}>by pairing code</div>
						</div> */}
						{this.listCorrespondents()}
					</div>
				</div>
				<Menu page={'apps'} setPage={this.props.setPage} />
			</div>
		} else if (this.state.app === 'app') {
			return <div>
				{this.getWallet()}
				{this.getProfile()}
				<div hidden={this.state.hiddenBlock}>
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
							<div onClick={() => this.closeApp()} className="topmenu_action">
								<div className="topmenu_action-arrow" />
							</div>
							<div style={{ paddingLeft: 20, width: "100%" }}>{this.state.thisChat.name}</div>
						</div>
						<div className="line" />
					</div>

					{/* <div className={'top-bar'}>
						<text className={'wallet-title'}>{this.state.thisChat.name}</text>
						<a onClick={() => this.closeApp()} className={'back-button'}> </a>
					</div> */}
					<div className={'plsWaiting'} hidden={this.state.hiddenWaiting}>Please waiting</div>
					<div key={'data'} className={'data inner'}>{this.state.data}</div>
				</div>
			</div>
		} else if (this.state.app === 'chat') {
			return <div>
				{this.profileInfoInChat()}
				{this.getWallet()}
				{this.getProfile()}
				<div hidden={this.state.hiddenBlock} onClick={() => this.hideMenuBlock()}>
					<div style={{
						display: "flex",
						flexDirection: "column",
						textAlign: "left",
						fontSize: "21px",
					}}>
						<div style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "#ffffff"
						}}>
							<div onClick={() => this.goList()} className="topmenu_action">
								<div className="topmenu_action-arrow" />
							</div>
							<div style={{ paddingLeft: 20, width: "100%" }}>{this.state.thisChat.name}</div>
						</div>
						<div className="line" />
					</div>
					<div key={'home_data'} className={'data'}>
						<div id={'bl_for_scroll'} ref={this.messages_scroll}>
							<div id={'messages_block'} ref={this.messages_height}>
								{this.state.messages[this.state.thisChat.device_address] ?
									this.state.messages[this.state.thisChat.device_address].map((value, index) => {
										if (value.isProfile && value.index >= 0) {
											let profile = value.text;
											profile = profile.map((value, index) => {
												return <div key={index}>{value.key} : {value.value}</div>
											});
											if (value.i) {
												return <div key={index} className={value.i ? 'm_r' : 'm_l'}>
													<div>You successfully sent your profile:</div>
													{profile}
												</div>
											} else {
												return <div key={index} className={value.i ? 'm_r' : 'm_l'}>
													<div>User sent you his profile:</div>
													<br />
													<div>verified: <div className={'verified_profile'}></div>
													</div>
													{profile}
													<a id={'profileInfo'}
														onClick={() => this.openProfileInfo(value.index)}>click
														to see more details</a>
												</div>
											}
										} else if (value.isProfile && value.index === -1) {
											let profile = value.text;
											profile = profile.map((value, index) => {
												return <div key={index}>{value.key} : {value.value}</div>
											});
											return <div key={index} className={value.i ? 'm_r' : 'm_l'}>
												<div>User sent you his profile:</div>
												<br />
												<div>verified: <div className={'unverified_profile'}></div>
												</div>
												{profile}
											</div>
										} else {
											return <div key={index}
												className={value.i ? 'm_r' : 'm_l'}>{value.text}</div>
										}
									}) : null}
							</div>
						</div>
						<div id={'input_block'}>
							<div id={'menu_img'} onClick={this.showOrHideBlock}>
								<div hidden={!this.state.isShowBlockSendAddress} id={'insert_my_address'}
									onClick={() => this.hideBlockAndShowWallets(1)}>Insert my address
								</div>
								<div hidden={!this.state.isShowBlockSendAddress} id={'insert_my_profile'}
									onClick={() => this.hideBlockAndShowProfiles(1)}>Insert my profile
								</div>
							</div>
							<textarea id={'text_input'} placeholder={'Your message'} style={{ border: "1px solid #DFDFE0", padding: 10, boxSizing: "border-box", height: 85, background: "#FFFFFF" }}
								value={this.state.currentText} onChange={this.setCurrentText} />
							<div id={'send_img'} onClick={() => this.sendMessage()} />
						</div>
					</div>
				</div>
			</div>
		}
	}
}
