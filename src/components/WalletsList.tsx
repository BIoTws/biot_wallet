import * as React from 'react';
import "../styles/wallets-list.scss";
import getBiot from '../getBiot';

interface IState {
	currentWallet: string;
	coin: string;
	wallets: Array<IWallet>;
	balance: number
}

interface IWallet {
	name: string;
	id: number;
	coin: string;
	balance: number
}

interface walletsProps {
	setPage: (page, walletId) => void
}

export class CreateWallet extends React.Component<any, IState> {
	constructor (props: any) {
		super(props);

		this.state = {
			balance: 0,
			currentWallet: "",
			coin: "Byteball",
			wallets: []
		};
	}

	public handleSubmit (e: React.FormEvent<HTMLFormElement>): void {
		e.preventDefault();
		this.props.addWallet(this.state.currentWallet, this.state.coin, this.state.balance);
	}

	public render (): JSX.Element {
		return (
			<div>
				<form onSubmit={e => this.handleSubmit(e)}>
					<input
						required={true}
						type="text"
						className="tdl-input"
						placeholder="Wallet name"
						value={this.state.currentWallet}
						onChange={e => this.setState({ currentWallet: e.target.value })}
					/><br>
				</br>
					<button className={'button-submit'} type="submit">Add</button>
				</form>
			</div>
		);
	}

}

export class WalletsList extends React.Component<walletsProps, any> {


	state = { show: false, wallets: [], page: 'wallets', name: '' };

	addWallet = () => {
		let name = this.state.name;
		getBiot(async (biot: any) => {
			let walletId = await biot.core.createNewWallet();
			let balance = await biot.core.getWalletBalance(walletId);
			if (!name) name = walletId.substr(0, 25) + '...';
			let lWN = localStorage.getItem('assocWalletToName');
			let assocWalletToName = lWN ? JSON.parse(lWN) : {};
			assocWalletToName[walletId] = name;
			window.localStorage.setItem('assocWalletToName', JSON.stringify(assocWalletToName));

			this.setState({
				show: false,
				wallets: [
					...this.state.wallets,
					{
						id: walletId,
						name: name,
						coin: 'Byteball',
						balance: balance.base.stable + balance.base.pending
					}
				],
				page: 'wallets',
				name: ''
			});
			alert('New wallet: ' + name);
		});
	};

	timerWL: any = null;

	componentDidMount () {
		this.addWallet = this.addWallet.bind(this);
		this.setName = this.setName.bind(this);
		this.showSetName = this.showSetName.bind(this);

		let self = this;
		getBiot(async (biot: any) => {
			async function updWL () {
				let wallets: any = [];
				let walletsInDb = await biot.core.getWallets();
				let lWN = localStorage.getItem('assocWalletToName');
				let assocWalletToName = lWN ? JSON.parse(lWN) : {};
				for (let i = 0; i < walletsInDb.length; i++) {
					let wallet = walletsInDb[i];
					let balance = await biot.core.getWalletBalance(wallet);
					console.error('name', assocWalletToName[wallet], wallet);
					wallets = [...wallets, {
						id: wallet,
						name: assocWalletToName[wallet] ? assocWalletToName[wallet] : wallet.substr(0, 25) + '...',
						coin: 'Byteball',
						balance: balance.base.stable + balance.base.pending
					}];
				}
				self.setState({ wallets: wallets });
			}

			await updWL();
			this.timerWL = setInterval(updWL, 10000);
		});
	}

	componentWillUnmount () {
		if (this.timerWL) clearInterval(this.timerWL);
	}

	showWallets = () => {
		return this.state.wallets.map((wallets: IWallet) => {
			return (
				<div onClick={() => {
					this.props.setPage("wallet", wallets.id)
				}} key={wallets.id} className={'wallets-list-body'}>
					<div className={wallets.coin}>
					</div>
					<div className={'wallets-list-body-name'}>{wallets.name}</div>
					<div className={'wallets-list-body-balance'}>{wallets.balance} bytes</div>
				</div>
			);
		});
	};

	showSetName () {
		this.setState({ page: 'setName' });
	}

	hideSetName () {
		this.setState({ page: 'wallets' });
	}

	setName = (evt) => {
		this.setState({
			name: evt.target.value
		});
	};

	render () {
		if (this.state.page === 'setName') {
			return <div>
				<div className={'top-bar'}>
					<text className={'wallet-title'}>Create new wallet</text>
					<a onClick={() => this.hideSetName()} className={'back-button'}> </a>
				</div>
				<div className={'app-body'} style={{ textAlign: 'center', marginTop: '4em' }}>
					<div className={'name-title'}>Enter wallet name</div>
					<div><input type={'text'} className={'name-input'} placeholder={'Wallet name'}
					            onChange={this.setName}/>
					</div>
					<div className={'button-block'}>
						<button onClick={() => this.addWallet()} className={'button-send-submit'} type="submit">
							Create wallet
						</button>
					</div>
				</div>
			</div>
		} else {
			return <div>
				<div className={'wallets-list'}>
					<text className={'wallets-list-text'}>Your wallets</text>
					<a className={'add-wallet-button'} onClick={this.showSetName}/>
				</div>
				<div id={'bl_for_scroll_wallets'}>
					<div className={'state-wallets'}>
						{this.showWallets()}
					</div>
				</div>
			</div>
		}
	}
}
