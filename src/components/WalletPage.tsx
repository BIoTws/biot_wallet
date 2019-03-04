import * as React from 'react';
import "../styles/wallet-page.scss";
import getBiot from "../getBiot";

interface ITransactions {
	name: string;
	id: number;
	transaction: string;
	balance: number
}

interface IChannels {
	id: string;
	coin: string;
	myAmount: number;
	peerAmount: number;
	row: any;
}


export class Wallet extends React.Component<{ walletId: String }, {}> {

	state = {
		balance: 0,
		list: 'transactions',
		transactions: [],
		channels: [],
		isShowModalChannel: false,
		modalChannelId: 'Open',
		modalChannelStatus: 'Open',
		modalChannelRow: null
	};

	timerB: any = null;

	componentDidMount () {
		let self = this;
		getBiot(async (biot: any) => {
			let balance = await biot.core.getWalletBalance(this.props.walletId);
			let transactions = await biot.core.getListTransactionsForWallet(this.props.walletId);

			// @ts-ignore
			let listChannels = await ChannelsManager.listByWalletId(this.props.walletId);

			console.error('transactions', transactions);
			console.error('channels', listChannels);
			let arrTransactions: any = [];
			for (let i = 0; i < transactions.length; i++) {
				let transaction = transactions[i];
				var obj: any = {};
				if (transaction.action === 'received') {
					obj.transaction = 'receive';
					obj.name = transaction.my_address.substr(0, 20) + '...';
				} else {
					obj.transaction = 'send';
					obj.name = transaction.addressTo.substr(0, 20) + '...';
				}
				obj.id = transaction.time;
				obj.balance = transaction.amount;
				arrTransactions = [...arrTransactions, obj];
			}

			let arrChannels: any = [];
			for (let i = 0; i < listChannels.length; i++) {
				let channel = listChannels[i];
				if(channel.step !== "null" && channel.step !== 'reject') {
					arrChannels = [...arrChannels, {
						id: channel.id,
						myAmount: channel.myAmount,
						peerAmount: channel.peerAmount,
						row: channel
					}];
				}
			}

			arrChannels = arrChannels.sort((a,b) => {
				return new Date(b.row.change_date).getTime() - new Date(a.row.change_date).getTime()
			});
			console.error('arrC', arrChannels);
			this.setState({
				balance: balance.base.stable + balance.base.pending,
				transactions: arrTransactions,
				channels: arrChannels
			});
			this.timerB = setInterval(async function () {
				let balance = await biot.core.getWalletBalance(self.props.walletId);
				self.setState({ balance: balance.base.stable + balance.base.pending });
			}, 10000);
		});
	}

	componentWillUnmount () {
		if (this.timerB) clearInterval(this.timerB);
	}

	showTransactions = () => {
		return this.state.transactions.map((transaction: ITransactions) => {
			return (
				<div key={transaction.id} className={'list-body'}>
					<div className={transaction.transaction}>
					</div>
					<div className={'list-body-name'}>{transaction.name}</div>
					<div className={'list-body-balance'}>{transaction.balance}</div>
				</div>
			);
		});
	};

	showChannels = () => {
		return this.state.channels.map((channel: IChannels) => {
			return (
				<div key={channel.id} className={'channels-list-body'}
				     onClick={() => this.showModalChannel(channel.row)}>
					<div className={'channels-list-body-name'}>{channel.id.substr(0, 20) + '...'}</div>
					<div className={'list-body-balance-ch'}>{channel.myAmount} / {channel.peerAmount}</div>
				</div>
			);
		});
	};

	showModalChannel = (row) => {
		let status = 'Close';
		if (row.step === 'waiting_transfers') status = 'Open';
		this.setState({
			modalChannelId: row.id,
			modalChannelStatus: status,
			isShowModalChannel: true,
			modalChannelRow: row
		});
	};

	closeChannel = async () => {
		console.error('start', 1);
		if (this.state.modalChannelRow) {
			console.error('start', 2);
			// @ts-ignore
			let channelsManager = new ChannelsManager(this.props.walletId);
			console.error('start', 3);
			let channel = channelsManager.restoreChannel(this.state.modalChannelRow);
			console.error('start', 4);
			await channel.init();
			console.error('start', 5);
			setImmediate(async () => {
				await channel.closeMutually();
			});
			console.error('start', 6);
			setTimeout(async () => {
				if (channel.step !== 'mutualClose') {
					await channel.closeOneSide();
				}
			}, 60000);
		}
		console.error('start', 7);
		this.setState({ isShowModalChannel: false });
	};

	render () {
		let getBlock = () => {
			if (this.state.list == 'transactions') {
				return <div key={'transactions'} className={'transactions'}>
					{this.showTransactions()}
				</div>;
			} else {
				return <div key={'channels'} className={'channels'}>
					{this.showChannels()}
				</div>
			}
		};

		let modal = () => {
			if (this.state.isShowModalChannel)
				return <div>
					<div style={{
						position: 'fixed',
						zIndex: 10,
						backgroundColor: '#24293d',
						padding: '10px',
						left: '5px',
						right: '5px',
						color: '#c8d5d3'
					}}>
						<div>Id: <span style={{ fontSize: '12px' }}>{this.state.modalChannelId}</span></div>
						<div>Status: {this.state.modalChannelStatus}</div>
						{this.state.modalChannelStatus === 'Open' ? <div>
							<button onClick={() => this.closeChannel()} className={'button-send-submit'} style={{
								position: 'inherit',
								margin: '10px 0'
							}}
							        type="submit">Close channel
							</button>
						</div> : ''}
					</div>
					<div
						style={{
							position: 'fixed',
							zIndex: 9,
							backgroundColor: 'rgba(47, 45, 45, 0.76)',
							width: '100%',
							height: '100%'
						}}
						onClick={() => this.setState({ isShowModalChannel: false })}>_
					</div>
				</div>
		};

		return (
			<div>
				{modal()}
				<div className={'balance'}>
					<div className={'balance-title-block'}>
						<span className={'balance-title'}>Total balance</span>
					</div>
					<div className={'balance-text-block'}>
						<span className={'balance-text'}>{this.state.balance} bytes</span>
					</div>
				</div>

				<div onClick={() => this.setState({ list: 'transactions' })}
				     className={this.state.list === 'transactions' ? 'transactions-button-active' : 'transactions-button'}>
					<text>Transactions</text>
				</div>
				<div onClick={() => this.setState({ list: 'channels' })}
				     className={this.state.list !== 'transactions' ? 'channels-button-active' : 'channels-button'}>
					<text>Channels</text>
				</div>
				{getBlock()}
			</div>
		);
	}
}