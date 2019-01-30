import * as React from 'react';
import "../styles/receive-page.scss";
import getBiot from "../getBiot";
import { QRCode, ErrorCorrectLevel, QRNumber, QRAlphaNum, QR8BitByte, QRKanji } from "qrcode-generator-ts/js";


export class ReceivePage extends React.Component<{ walletId: String }> {
  state = {
    address: '',
    imgUrl: ''
  };

  componentDidMount () {
    getBiot(async (biot: any) => {
      let address = (await biot.core.getAddressesInWallet(this.props.walletId))[0];
      console.error('address', address);
      let qrCode = new QRCode();
      qrCode.setErrorCorrectLevel(ErrorCorrectLevel.M);
      qrCode.setTypeNumber(4);
      qrCode.addData("byteball:" + address);
      qrCode.make();
      let base64ImageString = qrCode.toDataURL();
      this.setState({ address: address, imgUrl: base64ImageString });
    });
  }

  render () {
    return <div>
      <div className={'qr-address'}>
        <img width={'100%'} height={'100%'} src={this.state.imgUrl}/>
      </div>
      <div className={'address'}>
        <text>{this.state.address}</text>
      </div>
    </div>
  }
}
