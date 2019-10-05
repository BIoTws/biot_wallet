import * as React from 'react';
import "../styles/send-page.scss";
import getBiot from "../getBiot";

interface ISendPage {
	walletId: string,
	asset: string,
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

	componentDidMount() {
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
			try {
				console.error('addresses', (await biot.core.getAddressesInWallet(this.props.walletId)));
				console.error('paym', await biot.core.sendPaymentFromWallet({
					asset: this.props.asset,
					wallet: this.props.walletId,
					toAddress: this.state.address,
					amount: this.state.amount,
					changeAddress: (await biot.core.getAddressesInWallet(this.props.walletId))[0],
					deviceAddress: null
				}));
				alert('payment sent');
			} catch (e) {
				console.error('Error payment: ', e);
				alert('Error: ' + e);
			}
			this.props.back();
		});
	};

	render() {
		let asset = this.props.asset;
		if (asset === 'base') {
			asset = 'bytes';
		} else if (asset === 'Clcb6ZC5br93OA7ZMFEq88i+1CkJtpxpyAz4WyinKBY=') {
			asset = 'BC'
		}
		return <div>
			<div className={'send-form'}>
				<div className="inner">
					<div className={'address-input'}>
						<input
							required={true}
							type="text"
							className="send-input"
							placeholder="Recipient address"
							value={this.state.address}
							onChange={this.setAddress} />
					</div>
					<div className={'amount-input'}>
						{asset.length > 5 ? <div><input
							required={true}
							type="text"
							className="send-input"
							placeholder={'Amount of '}
							value={this.state.amount}
							onChange={this.setAmount} />
							<span className={'balance-coin-name'}>{asset}</span></div> :
							<input
								required={true}
								type="text"
								className="send-input"
								placeholder={'Amount of ' + asset}
								value={this.state.amount}
								onChange={this.setAmount} />
						}
					</div>
					<div className={'button-block'}>
						<button onClick={() => this.sendPayment()} className={'button-send-submit'} type="submit">
							Send
					</button>
					</div>
				</div>
			</div>
		</div>
	}
}
