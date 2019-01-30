import * as React from 'react';
import "../styles/send-page.scss";
import getBiot from "../getBiot";

interface ISendPage {
	walletId: string,
	back: () => void,
	params?: { address: string, amount: number } | {}
}

export class SendPage extends React.Component<ISendPage, {}> {

	state = { address: '', amount: '' };

	setAddress = (evt) => {
		this.setState({
			address: evt.target.value
		});
	};

	setAmount = (evt) => {
		this.setState({
			amount: parseInt(evt.target.value)
		});
	};

	componentDidMount () {
		console.error('params2', this.props.params);
		if (this.props.params) {
			// @ts-ignore
			if (this.props.params.address) this.setState({ address: this.props.params.address });
			// @ts-ignore
			if (this.props.params.amount) this.setState({ amount: this.props.params.amount });
		}
	}

	sendPayment = () => {
		console.error('sendPayment', this.state.address, this.state.amount);
		getBiot(async (biot: any) => {
			console.error('start p');
			console.error('paym', await biot.core.sendPaymentFromWallet({
				asset: 'base',
				wallet: this.props.walletId,
				toAddress: this.state.address,
				amount: this.state.amount,
				changeAddress: (await biot.core.getAddressesInWallet(this.props.walletId))[0],
				deviceAddress: null
			}));
			alert('payment sent');
			this.props.back();
		});
	};

	render () {
		return <div>
			<div className={'address-input'}>
				<input
					required={true}
					type="text"
					className="send-input"
					placeholder="Recipient address"
					value={this.state.address}
					onChange={this.setAddress}/>
			</div>
			<div className={'amount-input'}>
				<input
					required={true}
					type="text"
					className="send-input"
					placeholder="Amount"
					value={this.state.amount}
					onChange={this.setAmount}/>
			</div>
			<button onClick={() => this.sendPayment()} className={'button-send-submit'} type="submit">Send</button>
		</div>
	}
}
