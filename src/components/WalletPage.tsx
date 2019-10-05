import * as React from 'react';
import "../styles/wallet-page.scss";
import getBiot from "../getBiot";
import Swipe from 'react-easy-swipe';

interface ITransactions {
	name: string;
	id: number;
	transaction: string;
	balance: number,
	time: number
}

interface IChannels {
	id: string;
	coin: string;
	myAmount: number;
	peerAmount: number;
	row: any;
}

export class Wallet extends React.Component<{ walletId: String, setAsset: any }, {}> {
	state = {
		balance: [],
		list: 'transactions',
		transactions: [],
		channels: [],
		isShowModalChannel: false,
		modalChannelId: 'Open',
		modalChannelStatus: 'Open',
		modalChannelRow: null,
		balanceIndex: 0,
		balanceLength: 1,
	};

	timerB: any = null;

	constructor(props) {
		super(props);
		this.onSwipeLeft = this.onSwipeLeft.bind(this);
		this.onSwipeRight = this.onSwipeRight.bind(this);
	}

	onSwipeLeft() {
		let index = this.state.balanceIndex;
		if (this.state.balanceIndex === this.state.balanceLength - 1) {
			index = 0;
			let balance: any = this.state.balance[index];
			let coin = balance.coin;
			console.error('CHANGED TO1', coin, this.state.balanceIndex);
			this.props.setAsset(coin);
		} else {
			index++;
			let balance: any = this.state.balance[index];
			let coin = balance.coin;
			console.error('CHANGED TO2', coin, this.state.balanceIndex);
			this.props.setAsset(coin);
		}
		this.setState({ balanceIndex: index });
		console.error('LEFT'); //+1
	}

	onSwipeRight() {
		let index = this.state.balanceIndex;
		let maxIndex = this.state.balanceLength;
		if (this.state.balanceIndex === 0) {
			index = maxIndex - 1;
			let balance: any = this.state.balance[index];
			let coin = balance.coin;
			console.error('CHANGED TO', coin);
			this.props.setAsset(coin);
		} else {
			index--;
			let balance: any = this.state.balance[index];
			let coin = balance.coin;
			console.error('CHANGED TO', coin);
			this.props.setAsset(coin);
		}
		this.setState({ balanceIndex: index });
		console.error('RIGHT'); // -1
	}

	calcListTransactions(objTransactions, myAddresses) {
		let list: any = [];

		for (let key in objTransactions) {
			let objT = objTransactions[key];
			let obj: any = {};
			obj.time = parseInt(objT.date);

			let useMyAddress = false;
			let otherAddresses = objT.from.filter(v => {
				if (myAddresses.indexOf(v) !== -1) {
					useMyAddress = true;
					return false;
				}
				return true;
			});

			if (otherAddresses.length && !useMyAddress) {
				let amount = 0;
				let address = '';
				for (let k in objT.to) {
					let output = objT.to[k];
					if (myAddresses.indexOf(output.address) !== -1) {
						address = output.address;
						amount += output.amount;
					}
				}
				obj.name = address.substr(0, 20) + '...';
				obj.id = objT.date;
				obj.balance = amount;
				obj.transaction = 'receive';
			} else if (useMyAddress && !otherAddresses.length) {
				let amount = 0;
				let address = '';
				for (let k in objT.to) {
					let output = objT.to[k];
					if (myAddresses.indexOf(output.address) === -1) {
						address = output.address;
						amount += output.amount;
					}
				}
				obj.name = address.substr(0, 20) + '...';
				obj.id = objT.date;
				obj.balance = amount;
				obj.transaction = 'send';
			} else {
				let amount = 0;
				let address = '';
				console.error('obJT', objT.to);
				for (let k in objT.to) {
					let output = objT.to[k];
					if (myAddresses.indexOf(output.address) !== -1) {
						amount += output.amount;
					} else {
						address = output.address;
					}
				}
				obj.name = address.substr(0, 20) + '...';
				obj.id = objT.date;
				obj.balance = objT.myFromAmount - amount;
				obj.transaction = 'send';
			}

			list.push(obj);
		}

		list.sort((a, b) => b.time - a.time);
		return list;
	}

	componentDidMount() {
		getBiot(async (biot: any) => {
			let upd = async () => {
				let balance = await biot.core.getWalletBalance(this.props.walletId);
				console.error('BALANCE BALANCE', balance);
				let balanceArray: any = [];
				for (let key in balance) {
					balanceArray = [...balanceArray, { coin: key, balance: balance[key].pending + balance[key].stable }]
				}
				console.error('BALANCE ARRAY', balanceArray);
				let objTransactions = await biot.core.getWalletTransactions(this.props.walletId);
				let myAddresses = await biot.core.getAddressesInWallet(this.props.walletId);
				let listTransactions = this.calcListTransactions(objTransactions, myAddresses);
				console.error('listT', listTransactions);

				// @ts-ignore
				let listChannels = await ChannelsManager.listByWalletId(this.props.walletId);

				console.error('transactions', listTransactions);
				console.error('channels', listChannels);

				let arrChannels: any = [];
				for (let i = 0; i < listChannels.length; i++) {
					let channel = listChannels[i];
					if (channel.step !== "null" && channel.step !== 'reject') {
						arrChannels = [...arrChannels, {
							id: channel.id,
							myAmount: channel.myAmount,
							peerAmount: channel.peerAmount,
							row: channel
						}];
					}
				}
				arrChannels = arrChannels.sort((a, b) => {
					return new Date(b.row.change_date).getTime() - new Date(a.row.change_date).getTime()
				});
				console.error('arrC', arrChannels);
				this.setState({
					balance: balanceArray,
					balanceLength: balanceArray.length,
					transactions: listTransactions,
					channels: arrChannels
				});
			};
			upd();
			this.timerB = setInterval(async function () {
				upd();
			}, 10000);
		});
	}

	componentWillUnmount() {
		if (this.timerB) clearInterval(this.timerB);
	}

	// showTransactions = () => {
	// 	return this.state.transactions.map((transaction: ITransactions) => {
	// 		return (
	// 			<div key={transaction.id} className={'list-body'}>
	// 				<div className={transaction.transaction}>
	// 				</div>
	// 				<div className={'list-body-name'}>{transaction.name}</div>
	// 				<div className={'list-body-balance'}>{transaction.balance}</div>
	// 				<div className={'list-body-date'}>{
	// 					//@ts-ignore
	// 					moment(transaction.time * 1000).format("MM.DD.YYYY HH:mm")
	// 				}</div>
	// 			</div>
	// 		);
	// 	});
	// };

	showTransactions = () => {
		return this.state.transactions.map((transaction: ITransactions) => {
			return (
				<div key={transaction.id} className={"list-body"}>
					<div className={transaction.transaction} />
					<div className="list-body-wrap">
						<div className={"list-body-name"}>{transaction.name}</div>
						<div className="list-body-descr">
							<div className={"list-body-balance"}>{transaction.balance} <span>byte</span></div>
							<div className={"list-body-date"}>
								{
									//@ts-ignore
									moment(transaction.time * 1000).format("MM.DD.YYYY HH:mm")}
							</div>
						</div>
					</div>
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
					<div className={'list-body-balance-ch'}>My amount: {channel.myAmount} | Peer
						amount: {channel.peerAmount}</div>
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

	render() {
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
		let balance: any = this.state.balance;
		if (balance.length > 1) {
			let dotArray: any = [];
			for (let i = 0; i < balance.length; i++) {
				if (i === this.state.balanceIndex) {
					dotArray = [...dotArray, <div className={'dot-active'}></div>]
				} else {
					dotArray = [...dotArray, <div className={'dot'}></div>]
				}
			}
			console.error('index', this.state.balanceIndex);
			let currentCoin: any = this.state.balance[this.state.balanceIndex];
			console.error('cc', currentCoin);
			let coin = currentCoin.coin;
			if (coin === 'base') {
				coin = 'Bytes'
			} else if (coin === 'Clcb6ZC5br93OA7ZMFEq88i+1CkJtpxpyAz4WyinKBY=') {
				coin = 'BC'
			}
			return (
				<div>
					{modal()}
					<Swipe onSwipeRight={this.onSwipeRight}
						onSwipeLeft={this.onSwipeLeft}
					>
						<div className={'balance'}>
							{/* <div className={'balance-title-block'}>
								<span className={'balance-title'}>Total balance</span>
							</div> */}
							<div className={'balance-text-block'}>
								{coin.length > 5 ?
									<div><span className={'balance-text'}>{currentCoin.balance}</span><br />
										<div className={'balance-coin-name'}>{coin}</div>
									</div>
									: <span className={'balance-text'}><span>{currentCoin.balance}</span> {coin}</span>}
							</div>
							{dotArray}
						</div>
					</Swipe>
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
		} else {
			let currentCoin: any = this.state.balance;
			let coin = currentCoin.coin;
			if (coin === 'base') {
				coin = 'Bytes'
			} else if (coin === 'Clcb6ZC5br93OA7ZMFEq88i+1CkJtpxpyAz4WyinKBY=') {
				coin = 'BC'
			}
			console.error('SINGLE BALANCE', currentCoin);
			return (
				<div>
					{modal()}
					<div className={'balance'}>
						{/* <div className={'balance-title-block'}>
							<span className={'balance-title'}>Total balance</span>
						</div> */}
						<div className={'balance-text-block'}>
							<span
								className={'balance-text'}><span>{currentCoin.length ? currentCoin[0].balance : 0}</span> {coin || "byte"}</span>
						</div>
					</div>

					<div
						onClick={() => this.setState({ list: "transactions" })}
						className={
							this.state.list === "transactions"
								? "transactions-button-active"
								: "transactions-button"
						}
					>
						<text>Transactions</text>
					</div>
					<div
						onClick={() => this.setState({ list: "channels" })}
						className={
							this.state.list !== "transactions"
								? "channels-button-active"
								: "channels-button"
						}
					>
						<text>Channels</text>
					</div>
					{getBlock()}
				</div>
			);
		}

	}
}