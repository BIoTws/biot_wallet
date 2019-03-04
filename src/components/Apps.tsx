import * as React from 'react';
import "../styles/apps.scss";
import "../styles/style.scss";
import getBiot from "../getBiot";


export class Apps extends React.Component<{ goIndex: () => void }, any> {
	values: any = {};
	requirements: any = {};
	core: any = null;
	biotInit: boolean = false;

	state = {
		app: 'list',
		data: [],
		correspondent_address: '',
		wallets: [],
		hiddenBlock: false,
		hiddenWallets: true,
		hiddenWaiting: true,
		page: '',
		message: ''
	};

	componentDidMount () {
		getBiot(async (biot: any) => {
			await biot.core.addCorrespondent('AxNQPf6MqRugTleuxJweCRvaSYwflspHM9ijR4XGCD1N@byteball.org/bb-test#test');
			await biot.core.addCorrespondent('AkwrrLNRYqVj0Wt6wfT2qnUkv7vxF8bb8R78YgzEXuIp@obyte.org/bb-test#test');
			this.core = biot.core;
			this.biotInit = true;
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
		this.messages = this.messages.bind(this);
		this.changeValue = this.changeValue.bind(this);
		this.sendResponse = this.sendResponse.bind(this);
		this.setWallet = this.setWallet.bind(this);
		this.showWallets = this.showWallets.bind(this);
	}

	ident () {
		this.startEvents();
		this.setState({ app: 'ident', correspondent_address: '0JOL27JM6WSGNUCBTXDMY5FYZ2VM2X22I' });
		let send = () => {
			if (this.biotInit) {
				this.core.sendTechMessageToDevice('0JOL27JM6WSGNUCBTXDMY5FYZ2VM2X22I', { type: 'hello' });
			} else {
				setTimeout(send, 100);
			}
		};
		send();
	}

	home () {
		this.startEvents();
		this.setState({ app: 'home', correspondent_address: '0JOL27JM6WSGNUCBTXDMY5FYZ2VM2X22I' });
		let send = () => {
			if (this.biotInit) {
				// this.core.sendTechMessageToDevice('0JOL27JM6WSGNUCBTXDMY5FYZ2VM2X22I', { type: 'hello' });
			} else {
				setTimeout(send, 100);
			}
		};
		send();
	}

	co_working () {
		this.startEvents();
		this.setState({ app: 'coworking', correspondent_address: '02C4KKOXMX6C744GASPASS5VQBA3AC56K' });
		let send = () => {
			if (this.biotInit) {
				this.core.sendTechMessageToDevice('02C4KKOXMX6C744GASPASS5VQBA3AC56K', { type: 'hello' });
			} else {
				setTimeout(send, 100);
			}
		};
		send();
	}

	goList () {
		this.removeEvents();
		this.setState({ app: 'list', data: '', page: '', message: '' });
		this.values = {};
	}

	startEvents () {
		// @ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.on('object', this.messages);
	}

	removeEvents () {
		// @ts-ignore
		let _eventBus = window.eventBus;
		_eventBus.removeListener('object', this.messages);
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
			return <div id={f.id} style={{ textAlign: 'center' }}><h2>{f.title}</h2></div>
		} else if (f.type === 'h3') {
			return <div id={f.id} style={{ textAlign: 'center' }}><h3>{f.title}</h3></div>
		} else if (f.type === 'text') {
			return <div id={f.id}>{f.title}</div>
		} else if (f.type === 'request') {
			return <div id={f.id} style={{ textAlign: 'center' }}>
				<input onClick={() => this.sendRequest(f.req)} className={'button-send-submit'} type={'button'}
				       value={f.title}/>
			</div>
		} else if(f.type === 'list-menu'){
			return <div onClick={() => this.sendRequest(f.req)} id={f.id} className={'list-menu'}>
				{f.title}
			</div>
		}
	}

	async messages (from_address, object) {
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
			await this.core.saveProfile(object.my_address, object.your_address, object.unit, object.profile);
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
		this.core.sendTechMessageToDevice(this.state.correspondent_address, {
			type: 'response',
			page: this.state.page,
			response: this.values
		});
		this.setState({ hiddenWaiting: false });
	}

	sendRequest (req) {
		this.core.sendTechMessageToDevice(this.state.correspondent_address, {
			type: 'request',
			page: this.state.page,
			req: req
		});
	}

	render () {
		if (this.state.app === 'list') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Apps</text>
					<a onClick={() => this.props.goIndex()} className={'back-button'}> </a>
				</div>
				<div id={'listApps'}>
					<a className={'ident'} onClick={() => {
						this.ident()
					}}> </a>
					<a className={'home'} onClick={() => {
						this.home()
					}}> </a>
					<a className={'co-working'} onClick={() => {
						this.co_working()
					}}> </a></div>
			</div>
		} else if (this.state.app === 'ident') {
			return <div>
				{this.getWallet()}
				<div hidden={this.state.hiddenBlock}>
					<div className={'top-bar'}>
						<text className={'wallet-title'}>Ident</text>
						<a onClick={() => this.goList()} className={'back-button'}> </a>
					</div>
					<div className={'plsWaiting'} hidden={this.state.hiddenWaiting}>Please waiting</div>
					<div key={'ident_data'} className={'data'}>{this.state.data}</div>
				</div>
			</div>
		} else if (this.state.app === 'home') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Home</text>
					<a onClick={() => this.goList()} className={'back-button'}> </a>
				</div>
				<div key={'home_data'} className={'data'}>{this.state.data}</div>
			</div>
		} else if (this.state.app === 'coworking') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Co-working</text>
					<a onClick={() => this.goList()} className={'back-button'}> </a>
				</div>
				<div key={'home_data'} className={'data'}>{this.state.data}</div>
			</div>
		}
	}
}
