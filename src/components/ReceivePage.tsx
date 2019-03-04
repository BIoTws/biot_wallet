import * as React from 'react';
import "../styles/receive-page.scss";
import getBiot from "../getBiot";
import { QRCode, ErrorCorrectLevel, QRNumber, QRAlphaNum, QR8BitByte, QRKanji } from "qrcode-generator-ts/js";


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
			qrCode.addData("byteball-rn:" + address);
			qrCode.make();
			let base64ImageString = qrCode.toDataURL();
			this.setState({ address: address, imgUrl: base64ImageString, hidden: false });
		});
	}

	getFromFaucet () {
		if (this.state.getting) return;
		this.setState({ getting: true, faucetText: 'Please wait' });

		getBiot(async (biot: any) => {
			// @ts-ignore
			let _eventBus = window.eventBus;

			let wallets = await biot.core.getMyDeviceWallets();
			let addresses = await biot.core.getAddressesInWallet(wallets[0]);

			_eventBus.on('text', (from_address, text) => {
				if (text.match(/To receive free bytes/)) {
					biot.core.sendTextMessageToDevice(from_address, addresses[0]);
					console.error('sent faucet: ', addresses[0]);
					console.error('Awaiting response...');
				} else if (!text.match(/free blackbytes/)) {
					if (text.match(/You can request free bytes only once per 24 hours/)) {
						alert('You can request free bytes only once per 24 hours')
					}
					console.error('text', from_address, ' - ', text);
					this.setState({ faucetText: 'Get from faucet' });
				} else {
					alert('Your address is replenished');
					this.setState({ faucetText: 'Get from faucet' });
				}
			});

			await biot.core.addCorrespondent('AxBxXDnPOzE/AxLHmidAjwLPFtQ6dK3k70zM0yKVeDzC@byteball.org/bb-test#0000');
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
