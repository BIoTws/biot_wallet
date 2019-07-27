import * as React from 'react';
import "../styles/receive-page.scss";
import getBiot from "../getBiot";
import { QRCode, ErrorCorrectLevel, QRNumber, QRAlphaNum, QR8BitByte, QRKanji } from "qrcode-generator-ts/js";

// @ts-ignore
let _eventBus = window.eventBus;

export class ReceivePage extends React.Component<{ walletId: String }> {
	state = {
		address: '',
		imgUrl: '',
		hidden: true,
		getting: false,
		faucetText: 'Get from faucet'
	};

	componentDidMount () {
		getBiot(async (biot: any) => {
			let address = (await biot.core.getAddressesInWallet(this.props.walletId))[0];
			console.error('address', address);
			let qrCode = new QRCode();
			qrCode.setErrorCorrectLevel(ErrorCorrectLevel.M);
			qrCode.setTypeNumber(4);
			qrCode.addData("ocore-tn:" + address);
			qrCode.make();
			let base64ImageString = qrCode.toDataURL();
			this.setState({ address: address, imgUrl: base64ImageString, hidden: false });
		});

		_eventBus.on('text', this.message);
	}

	componentWillUnmount (): void {
		_eventBus.removeListener('text', this.message);
	}

	message = (from_address, text) => {
		if(!text.match(/free blackbytes/)) {
			if(text.match(/You can request free bytes only once per 24 hours/)) {
				alert('You can request free bytes only once per 24 hours')
			}
			console.error('text', from_address, ' - ', text);
			this.setState({ faucetText: 'Get from faucet' });
		} else {
			alert('Your address is replenished');
			this.setState({ faucetText: 'Get from faucet' });
		}
	};

	getFromFaucet () {
		if(this.state.getting) return;
		this.setState({ getting: true, faucetText: 'Please wait' });

		getBiot(async (biot: any) => {
			let address = (await biot.core.getAddressesInWallet(this.props.walletId))[0];

			let list = await biot.core.listCorrespondents();
			if(list.find(e => e.device_address === "0TFZHX7UTVQUWEPGLQDWEV5A4KLHFA5WB")) {
				biot.core.sendTextMessageToDevice('0TFZHX7UTVQUWEPGLQDWEV5A4KLHFA5WB', address);
			} else {
				await biot.core.addCorrespondent('AxBxXDnPOzE/AxLHmidAjwLPFtQ6dK3k70zM0yKVeDzC@byteball.org/bb-test#0000');
				biot.core.sendTextMessageToDevice('0TFZHX7UTVQUWEPGLQDWEV5A4KLHFA5WB', address);
			}
		});
	}

	render () {
		return <div className={'receive-block'}>
			<div className={'qr-address'}>
				<img hidden={this.state.hidden} width={'100%'} height={'100%'} src={this.state.imgUrl}/>
			</div>
			<div className={'address'}>
				<text>{this.state.address}</text>
			</div>
			<div className={'faucet'}><a onClick={() => {
				this.getFromFaucet()
			}}>{this.state.faucetText}</a></div>
		</div>
	}
}
